import { dom, state } from './state.js';

export function renderEditor() {
  dom.codeEditor.innerHTML = '';
  if (state.editorInstance && state.editorInstance.toTextArea) {
    state.editorInstance = null;
  }
  // code_template을 에디터 기준으로 사용하고, 없을 때만 full_code로 폴백
  const ct = state.problemJSON?.code_template;
  let template = '';
  if (typeof ct === 'string') {
    template = ct.replace(/\\n/g, '\n');
  } else if (ct && typeof ct === 'object') {
    const html = String(ct.html || '').replace(/\\n/g, '\n');
    const css = String(ct.css || '').replace(/\\n/g, '\n');
    const js = String(ct.js || '').replace(/\\n/g, '\n');
    const looksFullDoc = /<!DOCTYPE\s+html>/i.test(html) || /<html[\s>]/i.test(html);
    const normalizeFullHtml = (raw) => {
      try {
        let out = String(raw || '');
        // 중복 DOCTYPE 제거
        const dRe = /<!DOCTYPE\s+html>/gi;
        let seen = false;
        out = out.replace(dRe, (m) => (seen ? '' : (seen = true, m)));
        const headMatch = out.match(/<head[^>]*>[\s\S]*?<\/head>/i);
        const bodyMatch = out.match(/<body[^>]*>[\s\S]*?<\/body>/i);
        if (!headMatch || !bodyMatch) return out;
        let headHtml = headMatch[0];
        const bodyHtml = bodyMatch[0];
        const innerHeads = bodyHtml.match(/<head[^>]*>[\s\S]*?<\/head>/gi) || [];
        if (!innerHeads.length) return out;
        let newBody = bodyHtml;
        innerHeads.forEach((h) => { newBody = newBody.replace(h, ''); });
        const innerContents = innerHeads.map((h) => (h.replace(/<head[^>]*>/i, '').replace(/<\/head>/i, ''))).join('\n');
        headHtml = headHtml.replace(/<\/head>/i, `${innerContents}\n</head>`);
        out = out.replace(/<head[^>]*>[\s\S]*?<\/head>/i, headHtml).replace(/<body[^>]*>[\s\S]*?<\/body>/i, newBody);
        return out;
      } catch {
        return String(raw || '');
      }
    };
    if (looksFullDoc) {
      // 전체 문서로 제공된 경우 정규화하여 사용 (중복 래핑 방지)
      template = normalizeFullHtml(html);
    } else {
      // 프래그먼트이면 하나의 문서로 합쳐 제공
      template = `<!DOCTYPE html>\n<html>\n<head>\n<style>\n${css}\n</style>\n</head>\n<body>\n${html}\n<script>\n${js}\n<\/script>\n</body>\n</html>`;
    }
  } else {
    // 템플릿이 없다면 full_code를 안전 폴백으로 사용
    template = (state.problemJSON?.full_code || '').replace(/\n/g, '\n');
  }
  // [개선] 언어 결정 우선순위 + trim
  let lang = (state.currentLessonPlan?.language || state.problemJSON?.language || 'python').toLowerCase().trim();
  
  // [신규] 코드 내용 기반 언어 자동 감지
  const codeContent = template || '';
  const hasJsKeywords = /\b(function|const|let|var|console\.log|=>)\b/.test(codeContent);
  const hasPyKeywords = /\b(def |print\(|import |from |class .*:)\b/.test(codeContent);
  const hasBashKeywords = /^\s*(cd|ls|pwd|mkdir|rmdir|touch|rm|cp|mv|echo|cat|grep|sudo|chmod|chown|export|source|alias)\b/m.test(codeContent) || 
                          codeContent.includes('#!/bin/bash') || 
                          codeContent.includes('#!/bin/sh');
  
  if (hasBashKeywords) {
    lang = 'bash';
  } else if (hasJsKeywords && !hasPyKeywords && lang === 'python') {
    lang = 'javascript';
  } else if (hasPyKeywords && !hasJsKeywords && lang === 'javascript') {
    lang = 'python';
  }
  
  const isWeb = String(state.problemJSON?.type || '').toLowerCase() === 'web';
  const isAppliedChallenge = String(state.currentChapterStage || '').toUpperCase() === 'APPLIED_CHALLENGE';
  
  // [수정] JavaScript, Shell 모드 추가
  let mode = 'python';  // 기본값
  if (isWeb) {
    mode = 'htmlmixed';
  } else if (lang === 'python') {
    mode = 'python';
  } else if (['javascript', 'js'].includes(lang)) {
    mode = 'javascript';
  } else if (['bash', 'shell', 'sh', 'linux'].includes(lang)) {
    mode = 'shell';
  }
  
  state.editorInstance = CodeMirror(dom.codeEditor, {
    value: template,
    mode,
    theme: 'material-darker',
    lineNumbers: true,
    tabSize: 4,
    indentUnit: 4,
    lineWrapping: true,
    readOnly: isAppliedChallenge ? false : 'nocursor',
  });
  setTimeout(() => state.editorInstance?.refresh?.(), 0);
  
  // [신규] 에디터 파일명 동적 업데이트
  const filenameEl = document.getElementById('editor-filename');
  if (filenameEl) {
    const filenameMap = {
      'python': 'main.py',
      'javascript': 'main.js',
      'htmlmixed': 'index.html',
      'shell': 'script.sh',
    };
    filenameEl.textContent = filenameMap[mode] || 'main.py';
  }

  try {
    // [보강] 응용 과제에서는 빈칸 치환을 건너뛰고 전체 편집을 허용합니다.
    if (isAppliedChallenge) return;
    const doc = state.editorInstance.getDoc();
    
    // #[editable_blank]# 패턴 치환
    let cursor = doc.getSearchCursor(/#\[editable_blank\]#/);
    while (cursor.findNext()) {
      const from = cursor.from();
      const to = cursor.to();
      const blankSpan = document.createElement('span');
      blankSpan.textContent = '';
      blankSpan.className = 'editable-blank bg-slate-600 hover:bg-slate-500 cursor-text rounded px-1 min-w-[40px] inline-block';
      blankSpan.contentEditable = 'true';
      blankSpan.dataset.blankId = '#[editable_blank]#';
      blankSpan.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
      doc.markText(from, to, { replacedWith: blankSpan, atomic: true });
    }

    // __BLANK_N__ 패턴 치환
    const blankPattern = /__BLANK_\d+__/;
    cursor = doc.getSearchCursor(blankPattern);
    while (cursor.findNext()) {
      const from = cursor.from();
      const to = cursor.to();
      const markerText = doc.getRange(from, to);
      const blankSpan = document.createElement('span');
      blankSpan.textContent = '';
      blankSpan.className = 'editable-blank bg-slate-600 hover:bg-slate-500 cursor-text rounded px-1 min-w-[40px] inline-block';
      blankSpan.contentEditable = 'true';
      blankSpan.dataset.blankId = markerText; // 예: __BLANK_1__
      blankSpan.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
      doc.markText(from, to, { replacedWith: blankSpan, atomic: true });
    }
  } catch (e) {
    console.warn('마커 치환 중 문제 발생', e);
  }
}

export function getCurrentCode() {
  if (!state.editorInstance) return '';
  let code = state.editorInstance.getValue();
  const spans = dom.codeEditor.querySelectorAll('.editable-blank');
  spans.forEach((span) => {
    const placeholder = span.dataset.blankId || '#[editable_blank]#';
    const raw = span.textContent || '';
    const value = raw.replace(/[\u00A0\u200B\u200C\u200D]/g, '');
    // --- [수정] 들여쓰기 보정 로직 ---
    let indentedValue = value;
    if (value.includes('\n')) {
        // 1. 코드 원본에서 placeholder가 위치한 줄을 찾습니다.
        const lines = code.split('\n');
        let indentation = ''; // 이 빈칸의 기본 들여쓰기
        for (const line of lines) {
            // 2. placeholder를 포함하는 줄을 찾아 들여쓰기(공백)를 추출합니다.
            const match = line.match(/^(\s*).*(__BLANK_\d+__|#\[editable_blank\]#)/);
            if (match) {
                indentation = match[1]; // 예: "    " (공백 4칸)
                break;
            }
        }
        
        // 3. 사용자가 입력한 값의 모든 \n을 \n + (들여쓰기)로 교체합니다.
        if (indentation) {
            indentedValue = value.split('\n').join('\n' + indentation);
        }
    }
    // --- [수정 끝] ---
    // 정규식 특수문자 이스케이프 (표준 패턴)
    const esc = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\n/g, '\n');
    code = code.replace(new RegExp(esc), value);
  });
  return code;
}

// [신규] 수업 단계(step) 기반 에디터 렌더링 (편집 가능/불가 제어)
export function renderEditorForStep(step, stepType, codeSnapshot = null) {
  // 기존 에디터 인스턴스 완전히 제거
  if (state.editorInstance) {
    try {
      if (state.editorInstance.toTextArea) {
        state.editorInstance.toTextArea();
      }
      state.editorInstance = null;
    } catch (e) {
      console.warn('[EDITOR] 기존 인스턴스 제거 실패:', e);
    }
  }
  dom.codeEditor.innerHTML = '';
  const stepTypeNorm = String(stepType || step?.type || 'final_code').toLowerCase();
  const isFullyEditable = (stepTypeNorm === 'final_code' || String(state.currentChapterStage || '').toUpperCase() === 'APPLIED_CHALLENGE');
  const isFillInBlank = (stepTypeNorm === 'fill_in_blank');

    dom.codeEditor.innerHTML = '';

  // 디버깅: 어느 소스에서 template이 오는지 로깅
  console.log('[EDITOR] renderEditorForStep 호출:', {
    stepType,
    hasCodeSnapshot: !!codeSnapshot,
    codeSnapshotPreview: codeSnapshot?.substring(0, 80),
    hasStepCodeTemplate: !!step?.code_template,
    stepCodeTemplatePreview: step?.code_template?.substring(0, 80),
    hasProblemCodeTemplate: !!state.problemJSON?.code_template
  });

  // --- [핵심 수정] ---
  // 템플릿 결정 로직을 단계 유형에 따라 분리합니다.
  let template = '';
  if (stepTypeNorm === 'final_code') {
      // final_code는 codeSnapshot이 최우선, 없으면 step.code_template (즉, problem_json.code_template)을 사용합니다.
      // state.problemJSON.code_template을 참조하지 않습니다.
      template = String(codeSnapshot || step?.code_template || '');
  } else if (stepTypeNorm === 'fill_in_blank') {
      // fill_in_blank는 스냅샷을 무시하고 항상 step.code_template (즉, step.code_template)을 사용합니다.
      template = String(step?.code_template || '');
  } else {
      // (기타: concept 등)
      template = String(codeSnapshot || step?.code_template || state.problemJSON?.code_template || '');
  }
  // --- [수정 완료] ---
  // [개선] 언어 결정 우선순위: step.language > state.currentLessonPlan.language > state.problemJSON.language > 'python'
  let lang = (
    step?.language || 
    state.currentLessonPlan?.language || 
    state.problemJSON?.language || 
    'python'
  ).toLowerCase().trim();
  
  // [신규] 코드 내용 기반 언어 자동 감지 (AI가 잘못된 language를 넣은 경우 보정)
  const codeContent = template || '';
  const hasJsKeywords = /\b(function|const|let|var|console\.log|=>)\b/.test(codeContent);
  const hasPyKeywords = /\b(def |print\(|import |from |class .*:)\b/.test(codeContent);
  // 리눅스/쉘 명령어 감지 패턴 (주요 명령어 포함)
  const hasBashKeywords = /^\s*(cd|ls|pwd|mkdir|rmdir|touch|rm|cp|mv|echo|cat|grep|sudo|chmod|chown|export|source|alias)\b/m.test(codeContent) || 
                          codeContent.includes('#!/bin/bash') || 
                          codeContent.includes('#!/bin/sh');
  
  // 우선순위 보정 로직
  if (hasBashKeywords) {
    console.log('[EDITOR] 코드 내용 기반 언어 보정: -> bash');
    lang = 'bash';
  } else if (hasJsKeywords && !hasPyKeywords && lang === 'python') {
    console.log('[EDITOR] 코드 내용 기반 언어 보정: python -> javascript');
    lang = 'javascript';
  } else if (hasPyKeywords && !hasJsKeywords && lang === 'javascript') {
    console.log('[EDITOR] 코드 내용 기반 언어 보정: javascript -> python');
    lang = 'python';
  }
  
  console.log('[EDITOR] 최종 언어:', lang);
  
  const isWeb = String(state.problemJSON?.type || '').toLowerCase() === 'web' || lang === 'html';
  
  // [수정] JavaScript, Shell 모드 추가
  let mode = 'python';  // 기본값
  if (isWeb) {
    mode = 'htmlmixed';
  } else if (lang === 'python') {
    mode = 'python';
  } else if (['javascript', 'js'].includes(lang)) {
    mode = 'javascript';
  } else if (['bash', 'shell', 'sh', 'linux'].includes(lang)) {  // 'linux' 키워드 추가
    mode = 'shell';
  }

  state.editorInstance = CodeMirror(dom.codeEditor, {
    value: template,
    mode,
    theme: 'material-darker',
    lineNumbers: true,
    tabSize: 4,
    indentUnit: 4,
    lineWrapping: true,
    // fill_in_blank: 편집 가능하지만 빈칸만 입력하도록 (나중에 빈칸 위젯으로 제어)
    // final_code: 완전 편집 가능
    // 그 외(concept): 읽기 전용
    readOnly: isFullyEditable ? false : (isFillInBlank ? false : 'nocursor'),
  });
  setTimeout(() => state.editorInstance?.refresh?.(), 0);
  
  // [신규] 에디터 파일명 동적 업데이트
  const filenameEl = document.getElementById('editor-filename');
  if (filenameEl) {
    const filenameMap = {
      'python': 'main.py',
      'javascript': 'main.js',
      'htmlmixed': 'index.html',
      'shell': 'script.sh',
    };
    filenameEl.textContent = filenameMap[mode] || 'main.py';
  }

  // fill_in_blank에만 마커 치환 적용
  if (isFillInBlank) {
    // 약간의 지연 후 마커 치환 실행 (에디터 초기화 완료 대기)
    setTimeout(() => {
      try {
        const editor = state.editorInstance;
        if (!editor) {
          console.warn('[EDITOR] 에디터 인스턴스를 찾을 수 없음');
          return;
        }
        
        const content = editor.getValue();
        console.log('[EDITOR] 빈칸 치환 시작, 코드 내용:', content.substring(0, 100));
        
        // __BLANK_N__ 패턴을 찾아서 치환 (searchcursor 애드온 없이)
        const blankRegex = /__BLANK_\d+__/g;
        let match;
        const markers = [];
        
        // 모든 매치의 위치 수집
        while ((match = blankRegex.exec(content)) !== null) {
          markers.push({
            text: match[0],
            start: match.index,
            end: match.index + match[0].length
          });
        }
        
        console.log('[EDITOR] 찾은 빈칸 마커:', markers.map(m => m.text));
        
        // 뒤에서부터 치환 (앞에서부터 하면 위치가 밀림)
        markers.reverse().forEach((marker) => {
          // 문자 인덱스를 줄/칼럼으로 변환
          const lines = content.substring(0, marker.start).split('\n');
          const fromLine = lines.length - 1;
          const fromCh = lines[lines.length - 1].length;
          
          const endLines = content.substring(0, marker.end).split('\n');
          const toLine = endLines.length - 1;
          const toCh = endLines[endLines.length - 1].length;
          
          const from = { line: fromLine, ch: fromCh };
          const to = { line: toLine, ch: toCh };
          
          console.log('[EDITOR] 마커 발견:', marker.text, 'at', from, to);
          
          const blankSpan = document.createElement('span');
          blankSpan.textContent = '';
          blankSpan.className = 'editable-blank';
          blankSpan.contentEditable = 'true';
          blankSpan.dataset.blankId = marker.text;
          blankSpan.style.cssText = 'display:inline-block; min-width:45px; padding:0 6px; margin:0 1px; background:#334155; border-bottom:2px solid #8b5cf6; color:#e2e8f0; font-family:inherit; vertical-align:baseline; cursor:text; outline:none;';
          blankSpan.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
          
          editor.getDoc().markText(from, to, { replacedWith: blankSpan, atomic: true });
          console.log('[EDITOR] 마커 치환 완료:', marker.text);
        });
        
        // #[editable_blank]# 패턴도 처리
        const editableRegex = /#\[editable_blank\]#/g;
        const editableMarkers = [];
        const contentAfter = editor.getValue(); // 치환 후 다시 가져오기
        
        while ((match = editableRegex.exec(contentAfter)) !== null) {
          editableMarkers.push({
            text: match[0],
            start: match.index,
            end: match.index + match[0].length
          });
        }
        
        editableMarkers.reverse().forEach((marker) => {
          const lines = contentAfter.substring(0, marker.start).split('\n');
          const fromLine = lines.length - 1;
          const fromCh = lines[lines.length - 1].length;
          
          const endLines = contentAfter.substring(0, marker.end).split('\n');
          const toLine = endLines.length - 1;
          const toCh = endLines[endLines.length - 1].length;
          
          const from = { line: fromLine, ch: fromCh };
          const to = { line: toLine, ch: toCh };
          
          const blankSpan = document.createElement('span');
          blankSpan.textContent = '';
          blankSpan.className = 'editable-blank';
          blankSpan.contentEditable = 'true';
          blankSpan.dataset.blankId = marker.text;
          blankSpan.style.cssText = 'display:inline-block; min-width:45px; padding:0 6px; margin:0 1px; background:#334155; border-bottom:2px solid #8b5cf6; color:#e2e8f0; font-family:inherit; vertical-align:baseline; cursor:text; outline:none;';
          blankSpan.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
          
          editor.getDoc().markText(from, to, { replacedWith: blankSpan, atomic: true });
        });
        
        editor.refresh();
      } catch (e) {
        console.warn('[EDITOR] 마커 치환 중 문제 발생:', e);
      }
    }, 100);
  }
}
