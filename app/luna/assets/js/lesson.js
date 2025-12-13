// 수업 진행 엔진: Lesson Plan 기반 활동 렌더러
import { state, dom } from './state.js';
import { requestLessonPlan, saveStateToServer, gradeCode } from './api.js';
import { addChatMessage, addChatMessageWithTyping, setLoading, displayCodingView, showChoiceMenu, renderSidebarCurriculum, setChatInputLocked } from './ui.js';
import { renderProblem } from './flow.js';
import { renderEditor, getCurrentCode, renderEditorForStep } from './editor.js';
import { handleRunAndGrade } from './runner.js';
// [신규] 효과음 모듈 import
import { SFX } from './sound.js';

/**
 * [공통 유틸리티] 엑셀 스타일 테이블 렌더링 함수
 * MCQ, fill_in_blank, final_code 등 여러 단계에서 재사용 가능
 * @param {Object} tableData - {headers: string[], rows: string[][]}
 * @param {Object} options - {className?: string, showRowNumbers?: boolean}
 * @returns {HTMLElement} 테이블 컨테이너 요소
 */
function renderExcelTable(tableData, options = {}) {
  const { className = 'mcq-excel-table-container', showRowNumbers = true } = options;
  
  const tableContainer = document.createElement('div');
  tableContainer.className = `${className} mb-4`;
  
  const table = document.createElement('table');
  table.className = 'mcq-excel-table';
  
  const headers = tableData.headers || [];
  const rows = tableData.rows || [];
  
  // 헤더 행 (A, B, C, ...)
  if (headers.length > 0) {
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // 행 번호 칸 추가 (선택적)
    if (showRowNumbers) {
      const cornerCell = document.createElement('th');
      cornerCell.textContent = '';
      headerRow.appendChild(cornerCell);
    }
    
    headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
  }
  
  // 데이터 행
  const tbody = document.createElement('tbody');
  rows.forEach((row, rowIdx) => {
    const tr = document.createElement('tr');
    
    // 행 번호 (선택적)
    if (showRowNumbers) {
      const rowNumCell = document.createElement('th');
      rowNumCell.textContent = String(rowIdx + 1);
      tr.appendChild(rowNumCell);
    }
    
    row.forEach(cell => {
      const td = document.createElement('td');
      const cellValue = String(cell);
      // 수식인지 체크 (=로 시작)
      if (cellValue.startsWith('=')) {
        td.className = 'formula';
      }
      td.textContent = cellValue;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  
  tableContainer.appendChild(table);
  return tableContainer;
}

/**
 * [신규] 텍스트에서 테이블 데이터를 자동 추출
 * "데이터:" 또는 유사한 패턴 뒤에 오는 정렬된 텍스트를 테이블로 변환
 * @param {string} text - 원본 description 텍스트
 * @returns {{tableData: Object|null, cleanedText: string}} 추출된 테이블 데이터와 정리된 텍스트
 */
function extractTableFromText(text) {
  if (!text) return { tableData: null, cleanedText: text };
  
  // "데이터:" 패턴 찾기 (다양한 형태 지원)
  const dataPatterns = [
    /데이터\s*:\s*\n([\s\S]*?)(?=\n\n|\n[A-Z가-힣]|\n\d+\.|$)/i,
    /\*\*데이터\*\*\s*:\s*\n([\s\S]*?)(?=\n\n|\n[A-Z가-힣]|\n\d+\.|$)/i,
    /표\s*:\s*\n([\s\S]*?)(?=\n\n|\n[A-Z가-힣]|\n\d+\.|$)/i,
  ];
  
  let tableText = null;
  let matchObj = null;
  
  for (const pattern of dataPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      tableText = match[1].trim();
      matchObj = match;
      break;
    }
  }
  
  if (!tableText) {
    return { tableData: null, cleanedText: text };
  }
  
  // 테이블 텍스트를 행으로 분리
  const lines = tableText.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    return { tableData: null, cleanedText: text };
  }
  
  // 각 행을 열로 분리 (Markdown 테이블 또는 공백/탭 구분)
  const parseRow = (line) => {
    // Markdown 테이블 형식인지 확인 (| 문자가 포함되어 있는지)
    if (line.includes('|')) {
      // | 로 분리하고 앞뒤 공백 및 빈 문자열 제거
      return line.split('|')
        .map(item => item.trim())
        .filter(item => item !== ''); // 양끝의 | 로 인해 생기는 빈 문자열 제거
    }

    // 기존 로직: 공백/탭으로 구분
    const parts = [];
    let current = '';
    let inParens = 0;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '(') {
        inParens++;
        current += char;
      } else if (char === ')') {
        inParens--;
        current += char;
      } else if ((char === ' ' || char === '\t') && inParens === 0) {
        if (current.trim()) {
          parts.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      parts.push(current.trim());
    }
    
    return parts;
  };
  
  let rows = lines.map(parseRow);
  
  // Markdown 구분선(---) 제거
  rows = rows.filter(row => {
    // 모든 셀이 - 또는 : 로만 구성되어 있으면 구분선으로 간주
    return !row.every(cell => /^[\s\-:]+$/.test(cell));
  });
  
  // 최소 2개 열, 2개 행이 있어야 테이블로 인식
  if (rows.length < 2 || rows[0].length < 2) {
    return { tableData: null, cleanedText: text };
  }
  
  // 첫 행이 헤더인지 확인
  const firstRow = rows[0];
  const headerKeywords = ['이름', '열', 'ID', 'Name', '번호', '항목', '구분', 'A', 'B', 'C', 'D'];
  const isHeaderRow = firstRow.some(cell => 
    headerKeywords.some(kw => cell.includes(kw))
  );
  
  let headers, dataRows;
  if (isHeaderRow) {
    headers = firstRow;
    dataRows = rows.slice(1);
  } else {
    headers = firstRow.map((_, i) => String.fromCharCode(65 + i));
    dataRows = rows;
  }
  
  const tableData = {
    headers: headers,
    rows: dataRows
  };
  
  const cleanedText = text.replace(matchObj[0], '\n[📊 데이터 테이블은 아래에 표시됩니다]\n');
  
  return { tableData, cleanedText };
}

// 빈칸 마커를 HTML input으로 변환하는 헬퍼 함수
function convertBlanksToInputs(html) {
  // __BLANK_N__ 형식을 입력 필드로 변환
  return html.replace(/__BLANK_(\d+)__/g, (match, num) => {
    return `<input type="text" class="inline-blank-input" data-blank-id="${match}" placeholder="빈칸 ${num}" />`;
  }).replace(/#\[editable_blank\]#/g, () => {
    return `<input type="text" class="inline-blank-input" data-blank-id="#[editable_blank]#" placeholder="빈칸" />`;
  });
}

// [신규] solution 객체로부터 빈칸 힌트를 생성하는 함수
function generateBlankHints(solution, descriptionText) {
  if (!solution) return null;
  
  const hints = [];
  
  // solution이 객체인 경우 (여러 빈칸)
  if (typeof solution === 'object' && !Array.isArray(solution)) {
    const keys = Object.keys(solution).sort();
    keys.forEach((key, idx) => {
      const value = solution[key];
      const typeHint = detectTypeHint(value, descriptionText);
      const blankNum = key.match(/(\d+)/)?.[1] || (idx + 1);
      hints.push(`<span class="text-cyan-300">빈칸 ${blankNum}</span>: ${typeHint}`);
    });
  } 
  // solution이 문자열인 경우 (단일 빈칸)
  else if (typeof solution === 'string' && solution.trim()) {
    const typeHint = detectTypeHint(solution, descriptionText);
    hints.push(`${typeHint}`);
  }
  
  if (hints.length === 0) return null;
  return hints.join('<br>');
}

// [신규] 값의 자료형을 분석하여 힌트 문자열을 생성
function detectTypeHint(value, descriptionText) {
  const v = String(value || '').trim();
  
  // 문제 설명에 구체적인 값이 언급되어 있는지 확인
  const hasSpecificValue = descriptionText.includes(v);
  
  // 정수인 경우
  if (/^[-+]?\d+$/.test(v)) {
    if (hasSpecificValue) {
      return `정수 <code>${v}</code>`;
    }
    return `<span class="text-emerald-400">정수(int)</span> 입력 (예: <code>20</code>, <code>100</code> 등)`;
  }
  
  // 실수인 경우
  if (/^[-+]?\d+\.\d+$/.test(v)) {
    if (hasSpecificValue) {
      return `실수 <code>${v}</code>`;
    }
    return `<span class="text-emerald-400">실수(float)</span> 입력 (예: <code>3.14</code>, <code>178.5</code> 등)`;
  }
  
  // 문자열인 경우 (따옴표로 감싸진 경우)
  if (/^["'].*["']$/.test(v)) {
    if (hasSpecificValue) {
      return `문자열 <code>${v}</code>`;
    }
    return `<span class="text-emerald-400">문자열(str)</span> 입력 (예: <code>"Hello"</code>, <code>"Seoul"</code> 등)`;
  }
  
  // 불리언인 경우
  if (/^(True|False)$/i.test(v)) {
    return `<span class="text-emerald-400">불리언(bool)</span> 입력 (<code>True</code> 또는 <code>False</code>)`;
  }
  
  // 리스트인 경우
  if (/^\[.*\]$/.test(v)) {
    return `<span class="text-emerald-400">리스트(list)</span> 입력 (예: <code>[1, 2, 3]</code>)`;
  }
  
  // 딕셔너리인 경우
  if (/^\{.*\}$/.test(v)) {
    return `<span class="text-emerald-400">딕셔너리(dict)</span> 입력 (예: <code>{"key": "value"}</code>)`;
  }
  
  // 변수 대입문인 경우 (예: age = 20)
  if (/^\w+\s*=\s*.+$/.test(v)) {
    const varMatch = v.match(/^(\w+)\s*=\s*(.+)$/);
    if (varMatch) {
      const varName = varMatch[1];
      const varValue = varMatch[2].trim();
      const valueHint = detectTypeHint(varValue, descriptionText);
      return `변수 <code>${varName}</code>에 ${valueHint}`;
    }
  }
  
  // 그 외 - 코드 형태
  if (v.length < 50) {
    return `코드: <code>${v}</code>`;
  }
  
  return `적절한 코드 입력`;
}

// [신규] 코드 블록 외부의 HTML 태그를 이스케이프하는 함수
function escapeHtmlTagsOutsideCode(text) {
  // 코드 블록(```...``` 또는 `...`)을 임시로 보존
  const codeBlocks = [];
  let processed = text.replace(/```[\s\S]*?```|`[^`]+`/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  
  // 코드 블록 외부의 <tag> 형태를 이스케이프 (단, Markdown에서 허용하는 일부 태그 제외)
  // HTML 학습 시 설명에 나오는 태그들: <html>, <head>, <body>, <title>, <meta>, <h1>, <p> 등
  processed = processed.replace(/<(\/?)(html|head|body|title|meta|div|span|script|style|link|DOCTYPE)[^>]*>/gi, (match) => {
    return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  });
  
  // 코드 블록 복원
  processed = processed.replace(/__CODE_BLOCK_(\d+)__/g, (match, idx) => {
    return codeBlocks[parseInt(idx)];
  });
  
  return processed;
}

/**
 * [Safety 3.0] Mermaid 코드 정제 - HTML 태그 및 위험 문자 제거
 * AI가 생성한 Mermaid 코드에서 파싱 에러를 유발하는 요소들을 제거/변환
 * @param {string} code - 원본 Mermaid 코드
 * @returns {string} 정제된 Mermaid 코드
 */
function sanitizeMermaidCode(code) {
  if (!code) return code;
  
  let sanitized = code;
  
  // 1. HTML 태그 완전 제거 (</li>, </ul>, </ol>, <br>, <p>, 등)
  // Mermaid 코드에 HTML 태그가 섞여 들어가면 파싱 에러 발생
  sanitized = sanitized.replace(/<\/?[a-zA-Z][a-zA-Z0-9]*[^>]*>/g, '');
  
  // 2. 노드 텍스트 내의 <, > 문자를 안전한 텍스트로 변환
  // 예: ["<h1> 태그"] → ["h1 태그"]
  sanitized = sanitized.replace(/\["([^"]*)<([^>"]+)>([^"]*)"\]/g, '["$1$2$3"]');
  sanitized = sanitized.replace(/\("([^"]*)<([^>"]+)>([^"]*)"\)/g, '("$1$2$3")');
  sanitized = sanitized.replace(/\{\{"([^"]*)<([^>"]+)>([^"]*)"\}\}/g, '{{"$1$2$3"}}');
  
  // 3. 남은 < > 문자 제거 (노드 외부)
  // 단, --> 화살표는 유지
  sanitized = sanitized.replace(/(?<!-)<(?!-)/g, '');
  sanitized = sanitized.replace(/(?<!-)>(?!-)/g, '');
  
  // 4. 연속된 공백/줄바꿈 정리
  sanitized = sanitized.replace(/\n\s*\n/g, '\n');
  
  // 5. 빈 노드 제거 (예: A[""] 또는 B(""))
  sanitized = sanitized.replace(/[A-Za-z]\[""\]/g, '');
  sanitized = sanitized.replace(/[A-Za-z]\(""\)/g, '');
  
  console.log('[MERMAID SANITIZE] 원본 길이:', code.length, '정제 후:', sanitized.length);
  
  return sanitized.trim();
}

/**
 * [Scaffolding] 이전 단계 학습 정보 수집 - 커리큘럼 중복 방지
 * 현재 단원 이전의 완료된 단원들에서 learned_keywords를 수집
 * @param {string} currentLessonTitle - 현재 시작하려는 단원 제목
 * @returns {Array<{title: string, learned_keywords: string[]}>} 이전 학습 정보 배열
 */
function collectPreviousLessons(currentLessonTitle) {
  const previousLessons = [];
  
  // 커리큘럼이 없으면 빈 배열 반환
  if (!state.currentCurriculum || !Array.isArray(state.currentCurriculum)) {
    return previousLessons;
  }
  
  // 현재 단원 이전의 모든 완료된 단원 정보 수집
  for (const step of state.currentCurriculum) {
    // 현재 단원에 도달하면 중단
    if (step.title === currentLessonTitle) {
      break;
    }
    
    // 완료된 단원의 learned_keywords가 있으면 추가
    if (step.completed && step.learned_keywords && step.learned_keywords.length > 0) {
      previousLessons.push({
        title: step.title,
        learned_keywords: step.learned_keywords
      });
    }
  }
  
  console.log('[SCAFFOLDING] 수집된 이전 학습 정보:', previousLessons);
  return previousLessons;
}

function ensureActivityDom() {
  if (!dom.activityText) dom.activityText = document.getElementById('activity-text');
  if (!dom.activityContent) dom.activityContent = document.getElementById('activity-content');
  if (!dom.activityControls) dom.activityControls = document.getElementById('activity-controls');
}

export async function startLesson(topic, lessonTitle) {
  console.log('[LESSON] startLesson 시작 - topic:', topic, 'lessonTitle:', lessonTitle);
  
  // [중요] 레슨 시작 시 채팅 입력 활성화 (학습 중 질문 가능하도록)
  setChatInputLocked(false);
  
  setLoading(true, '수업 계획을 생성 중입니다...');
  try {
    // [Scaffolding] 이전 단계 학습 정보 수집 - 커리큘럼 중복 방지
    const previousLessons = collectPreviousLessons(lessonTitle);
    console.log('[LESSON] 이전 학습 정보:', previousLessons);
    
    // [구조적 개선] 로드맵 컨텍스트 구성 - 전체 학습 맥락 전달
    let roadmapContext = null;
    if (state.isRoadmapMode && state.roadmapContext) {
      const ctx = state.roadmapContext;
      roadmapContext = {
        phase_index: ctx.pIdx ?? 0,
        topic_index: ctx.tIdx ?? 0,
        step_index: state.currentStepIndex ?? 0
      };
      console.log('[LESSON] 로드맵 컨텍스트:', roadmapContext);
    }
    
    const plan = await requestLessonPlan(topic, lessonTitle, previousLessons, roadmapContext);
    console.log('[LESSON] 수업 계획 받음:', plan);
    
    // [신규] 에러 응답 감지: steps가 비어있거나 error 플래그가 있으면 재생성 UI 표시
    const steps = Array.isArray(plan?.steps) ? plan.steps : [];
    if (plan?.error || steps.length === 0) {
      console.log('[LESSON] 수업 생성 실패 감지 - 재생성 UI 표시');
      setLoading(false);
      showLessonCreationFailedUI(topic, lessonTitle, plan?.error_message);
      return;
    }
    
    state.currentLessonPlan = plan;
    state.currentLessonStepIndex = 0;

    // 새 수업을 시작할 때, 이전 수업의 코드 스냅샷을 반드시 초기화합니다.
    state.lastCodeSnapshot = null;
    // [신규] 단원 완료 상태 초기화
    state.lessonCompleted = false;

    // 제목/설명 초기화
    if (dom.problemTitle) dom.problemTitle.textContent = plan.title || '수업';
    if (dom.problemDescriptionMd) dom.problemDescriptionMd.innerHTML = '';

    console.log('[LESSON] displayCodingView 호출 전');
    displayCodingView(); // 우측 패널 보이기
    console.log('[LESSON] displayCodingView 호출 후');
    ensureActivityDom();
    // 패널 보이기 (동시에 기존 코드 에디터는 숨기고 필요 시만 사용)
    try {
      dom.activityControls?.classList?.remove('hidden');
      // 코드 에디터는 final_code 단계에서만 사용
      document.getElementById('code-editor')?.classList?.add('hidden');
    } catch {}

    console.log('[LESSON] renderCurrentStep 호출 전');
    renderCurrentStep();
    
    // [신규] 수업 시작 후 상태 저장 - 새로고침 시 현재 단계로 복원되도록
    // [중요] 기존 debounce 타이머 취소 후 즉시 저장하여 이전 상태가 덮어쓰이지 않도록 함
    console.log('[LESSON] 수업 시작 후 상태 즉시 저장 - currentLessonStepIndex:', state.currentLessonStepIndex);
    console.log('[LESSON] 저장할 currentLessonPlan title:', state.currentLessonPlan?.title);
    saveStateToServer.cancel();  // 기존 debounce 취소
    await saveStateToServer.flush();  // 즉시 저장
    console.log('[LESSON] 상태 저장 완료');
  } catch (e) {
    console.error('[LESSON] startLesson 에러:', e);
    setLoading(false);
    showLessonCreationFailedUI(topic, lessonTitle, '네트워크 오류가 발생했습니다.');
  } finally {
    setLoading(false);
  }
}

// [신규] 사이드바 커리큘럼 단계 클릭 핸들러
export async function handleSidebarStepClick(stepIndex, step) {
  console.log('[LESSON] 사이드바 클릭 - stepIndex:', stepIndex, 'step:', step.title);
  
  // [중요] 단계 클릭 시 채팅 입력 활성화
  setChatInputLocked(false);
  
  // 현재 단계와 같으면 무시
  if (stepIndex === state.currentStepIndex) {
    console.log('[LESSON] 현재 단계와 동일, 무시');
    return;
  }
  
  // [구조적 개선] 로드맵 모드에서 이미 완료된 Step인지 확인
  let stepAlreadyCompleted = false;
  if (state.isRoadmapMode && state.roadmapContext) {
    try {
      const { getJSON } = await import('./config.js');
      const ctx = state.roadmapContext;
      const progressRes = await getJSON(`/roadmap/topic_progress?phase_index=${ctx.pIdx}&topic_index=${ctx.tIdx}`);
      
      if (progressRes.curriculum_progress?.steps?.[stepIndex]?.completed) {
        stepAlreadyCompleted = true;
      }
    } catch (e) {
      console.warn('[LESSON] Step 완료 상태 확인 실패:', e);
    }
  }
  
  // 확인 대화상자 (완료된 Step은 복습 모드 안내)
  let confirmMsg = `"${step.title}" 단원으로 이동하시겠습니까?\n해당 단원의 레슨이 새로 생성됩니다.`;
  if (stepAlreadyCompleted) {
    confirmMsg = `"${step.title}" 단원은 이미 완료했습니다.\n\n다시 학습하시겠습니까? (복습 모드)\n💡 복습 모드에서는 XP가 중복 지급되지 않습니다.`;
  }
  
  const confirmed = confirm(confirmMsg);
  if (!confirmed) return;
  
  // [중요] 새 레슨 시작 전에 인덱스 초기화
  state.currentStepIndex = stepIndex;
  state.currentLessonStepIndex = 0;
  state.lessonCompleted = false;
  // [주의] currentLessonPlan은 startLesson에서 새로 설정되므로 여기서 null로 설정하지 않음
  // 여기서 저장하지 않고 startLesson에서 새 플랜과 함께 저장함
  
  // 해당 단계의 레슨 새로 생성 (startLesson 내부에서 새 플랜과 함께 저장됨)
  const topic = state.intendedTopic || state.currentCurriculum?.topic || '프로그래밍';
  await startLesson(topic, step.title);
  
  // 사이드바 업데이트 (완료 상태 포함)
  if (state.currentCurriculum) {
    renderSidebarCurriculum(state.currentCurriculum, state.currentStepIndex, handleSidebarStepClick, state.curriculumProgress);
  }
}

// [신규] 레슨 플랜이 불완전할 때 재생성 옵션 표시
function showLessonRegenerateOption() {
  const lessonTitle = state.currentLessonPlan?.title || '현재 단원';
  const topic = state.intendedTopic || state.currentCurriculum?.topic || '프로그래밍';
  
  // 사이드바 커리큘럼은 계속 표시 (완료 상태 포함)
  if (state.currentCurriculum) {
    renderSidebarCurriculum(state.currentCurriculum, state.currentStepIndex, handleSidebarStepClick, state.curriculumProgress);
  }
  
  // 안내 메시지와 선택 버튼 표시
  addChatMessage('ai', `⚠️ "${lessonTitle}" 단원의 수업 내용이 불완전해요.\n서버 문제로 수업 생성이 중단되었을 수 있어요.`);
  
  const container = document.createElement('div');
  container.className = 'flex flex-col gap-2 mt-2';
  
  // 재생성 버튼
  const regenerateBtn = document.createElement('button');
  regenerateBtn.type = 'button';
  regenerateBtn.className = 'bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded-md transition-colors';
  regenerateBtn.textContent = '🔄 이 단원 다시 생성하기';
  regenerateBtn.addEventListener('click', async () => {
    // [중요] 인덱스 초기화
    state.currentLessonStepIndex = 0;
    state.lessonCompleted = false;
    await startLesson(topic, lessonTitle);
  });
  container.appendChild(regenerateBtn);
  
  // 건너뛰기 버튼 (다음 단원으로)
  const steps = state.currentCurriculum?.curriculum || [];
  const isLastStep = state.currentStepIndex >= steps.length - 1;
  
  // 마지막 스텝이 아니면 "건너뛰기" 버튼, 마지막 스텝이면 "토픽 완료" 버튼
  const skipBtn = document.createElement('button');
  skipBtn.type = 'button';
  skipBtn.className = 'bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-md transition-colors';
  skipBtn.textContent = isLastStep ? '⏭️ 토픽 완료하기 (건너뛰기)' : '⏭️ 다음 단원으로 건너뛰기';
  
  skipBtn.addEventListener('click', async () => {
    // 🔥 [중요] 마지막 스텝일 때는 로드맵 모드 여부를 먼저 강제 체크
    // localStorage에서 roadmap_context를 확인하여 로드맵 모드인지 재확인
    let isRoadmapMode = state.isRoadmapMode;
    let roadmapContext = state.roadmapContext;
    
    if (!isRoadmapMode || !roadmapContext) {
      // state에 없으면 localStorage에서 복원 시도
      try {
        const ctxStr = localStorage.getItem('roadmap_context');
        if (ctxStr) {
          roadmapContext = JSON.parse(ctxStr);
          isRoadmapMode = true;
          // state에도 복원
          state.isRoadmapMode = true;
          state.roadmapContext = roadmapContext;
          console.log('[LESSON] 로드맵 컨텍스트 localStorage에서 복원:', roadmapContext);
        }
      } catch (e) {
        console.warn('[LESSON] 로드맵 컨텍스트 복원 실패:', e);
      }
    }
    
    // [구조적 개선] 로드맵 모드에서 스텝 건너뛰기 처리 (XP 없이 완료 처리)
    if (isRoadmapMode && roadmapContext) {
      try {
        const { postJSON } = await import('./config.js');
        const ctx = roadmapContext;
        
        // 현재 스텝을 skip으로 처리 (XP 없음)
        await postJSON('/roadmap/skip_step', {
          phase_index: ctx.pIdx,
          topic_index: ctx.tIdx,
          step_index: state.currentStepIndex
        });
        console.log('[LESSON] 스텝 건너뛰기 처리 완료:', state.currentStepIndex);
        
        // 마지막 스텝이었다면 토픽 완료 처리
        if (isLastStep) {
          console.log('[LESSON] 마지막 스텝 건너뛰기 - unlock_next 호출');
          const unlockRes = await postJSON('/roadmap/unlock_next', {
            phase_index: ctx.pIdx,
            topic_index: ctx.tIdx
          });
          console.log('[LESSON] unlock_next 결과:', unlockRes);
          
          // 토픽 완료 메시지 표시 후 로드맵으로 이동
          addChatMessage('ai', `🎉 **${topic}** 토픽을 완료했습니다!\n\n⚠️ 건너뛰기로 완료하여 보너스 XP가 ${unlockRes.topic_bonus_xp || 0}만 지급되었습니다.\n\n3초 후 로드맵 페이지로 이동합니다...`);
          setTimeout(() => {
            window.location.href = 'roadmap.html';
          }, 3000);
          return;
        }
      } catch (e) {
        console.warn('[LESSON] 건너뛰기 처리 실패:', e);
      }
    } else if (isLastStep) {
      // 🔥 로드맵 모드가 아닌데 마지막 스텝인 경우 - 커리큘럼 완료 안내
      const { setTutorExpression, TUTOR } = window.TutorPersona || {};
      if (setTutorExpression) setTutorExpression('proud');
      
      addChatMessage('ai', `🎊 **${topic}** 커리큘럼을 모두 완료했어요! 정말 대단해요!\n\n🗺️ 로드맵이 있다면 상단의 **[로드맵]** 버튼을, 새로운 주제로 시작하려면 **[새 주제]** 버튼을 눌러주세요.`);
      return;
    }
    
    // 다음 스텝으로 이동
    const nextStep = steps[state.currentStepIndex + 1];
    if (nextStep) {
      state.currentStepIndex += 1;
      state.currentLessonStepIndex = 0;
      state.lessonCompleted = false;
      await startLesson(topic, nextStep.title);
      renderSidebarCurriculum(state.currentCurriculum, state.currentStepIndex, handleSidebarStepClick, state.curriculumProgress);
    }
  });
  container.appendChild(skipBtn);
  
  addChatMessage('ai', container);
}

// [신규] 수업 생성 실패 시 학습 영역에 친절한 UI 표시 (초기 화면 스타일)
function showLessonCreationFailedUI(topic, lessonTitle, errorMessage) {
  console.log('[LESSON] showLessonCreationFailedUI 호출됨 - topic:', topic, 'lessonTitle:', lessonTitle);
  
  // 사이드바 커리큘럼은 계속 표시 (완료 상태 포함)
  if (state.currentCurriculum) {
    renderSidebarCurriculum(state.currentCurriculum, state.currentStepIndex, handleSidebarStepClick, state.curriculumProgress);
  }
  
  // 우측 학습 영역에 표시할 컨테이너
  const problemArea = document.getElementById('problem-area');
  const welcomeScreen = document.getElementById('welcome-screen');
  const problemContainer = document.getElementById('problem-container');
  
  // 기존 화면 숨기기
  if (welcomeScreen) welcomeScreen.classList.add('hidden');
  if (problemContainer) problemContainer.classList.add('hidden');
  
  // 학습 영역 표시
  if (problemArea) {
    problemArea.classList.remove('hidden');
    problemArea.style.display = 'flex';
  }
  
  // 기존 에러 UI가 있으면 제거
  const existingErrorUI = document.getElementById('lesson-error-ui');
  if (existingErrorUI) existingErrorUI.remove();
  
  // 에러 UI 생성 (초기 화면 스타일)
  const errorUI = document.createElement('div');
  errorUI.id = 'lesson-error-ui';
  errorUI.className = 'flex-1 flex flex-col items-center justify-center text-center p-8';
  errorUI.innerHTML = `
    <div class="max-w-md mx-auto">
      <!-- 아이콘 -->
      <div class="text-6xl mb-6">⚠️</div>
      
      <!-- 제목 -->
      <h2 class="text-2xl font-bold text-white mb-3">수업 생성에 실패했어요</h2>
      
      <!-- 단원명 -->
      <div class="text-lg text-cyan-400 font-semibold mb-4">"${lessonTitle}"</div>
      
      <!-- 에러 메시지 -->
      <p class="text-slate-400 mb-6 text-sm">
        ${errorMessage || '서버 연결 문제로 수업 내용을 불러올 수 없었어요.'}
        <br>잠시 후 다시 시도해 주세요.
      </p>
      
      <!-- 버튼들 -->
      <div class="flex flex-col gap-3 w-full">
        <button id="retry-lesson-btn" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
          <span>🔄</span>
          <span>다시 시도하기</span>
        </button>
        ${state.currentCurriculum && state.currentStepIndex < (state.currentCurriculum.curriculum?.length || 0) - 1 ? `
        <button id="skip-lesson-btn" class="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
          <span>⏭️</span>
          <span>다음 단원으로 건너뛰기</span>
        </button>
        ` : ''}
      </div>
      
      <!-- 추가 안내 -->
      <p class="text-slate-500 text-xs mt-6">
        💡 왼쪽 사이드바에서 다른 단원을 선택할 수도 있어요
      </p>
    </div>
  `;
  
  // 학습 영역에 추가
  if (problemArea) {
    problemArea.appendChild(errorUI);
  }
  
  // 버튼 이벤트 연결
  const retryBtn = document.getElementById('retry-lesson-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      // 에러 UI 제거
      errorUI.remove();
      // [중요] 인덱스 초기화
      state.currentLessonStepIndex = 0;
      state.lessonCompleted = false;
      // 다시 시도
      await startLesson(topic, lessonTitle);
    });
  }
  
  const skipBtn = document.getElementById('skip-lesson-btn');
  if (skipBtn) {
    skipBtn.addEventListener('click', async () => {
      const steps = state.currentCurriculum?.curriculum || [];
      const nextStep = steps[state.currentStepIndex + 1];
      const isLastStep = state.currentStepIndex >= steps.length - 1;
      
      // 🔥 [중요] 로드맵 모드 여부 강제 체크
      let isRoadmapMode = state.isRoadmapMode;
      let roadmapContext = state.roadmapContext;
      
      if (!isRoadmapMode || !roadmapContext) {
        try {
          const ctxStr = localStorage.getItem('roadmap_context');
          if (ctxStr) {
            roadmapContext = JSON.parse(ctxStr);
            isRoadmapMode = true;
            state.isRoadmapMode = true;
            state.roadmapContext = roadmapContext;
            console.log('[LESSON] 로드맵 컨텍스트 복원 (에러 화면):', roadmapContext);
          }
        } catch (e) {
          console.warn('[LESSON] 로드맵 컨텍스트 복원 실패:', e);
        }
      }
      
      // [구조적 개선] 로드맵 모드에서 스텝 건너뛰기 처리
      if (isRoadmapMode && roadmapContext) {
        try {
          const { postJSON } = await import('./config.js');
          const ctx = roadmapContext;
          
          await postJSON('/roadmap/skip_step', {
            phase_index: ctx.pIdx,
            topic_index: ctx.tIdx,
            step_index: state.currentStepIndex
          });
          console.log('[LESSON] 스텝 건너뛰기 처리 완료 (에러 화면에서):', state.currentStepIndex);
          
          // 마지막 스텝이면 토픽 완료 처리
          if (isLastStep) {
            const unlockRes = await postJSON('/roadmap/unlock_next', {
              phase_index: ctx.pIdx,
              topic_index: ctx.tIdx
            });
            errorUI.remove();
            addChatMessage('ai', `🎉 **${topic}** 토픽을 완료했습니다!\n\n3초 후 로드맵 페이지로 이동합니다...`);
            setTimeout(() => {
              window.location.href = 'roadmap.html';
            }, 3000);
            return;
          }
        } catch (e) {
          console.warn('[LESSON] 건너뛰기 처리 실패:', e);
        }
      } else if (isLastStep) {
        // 로드맵 모드가 아닌데 마지막 스텝
        errorUI.remove();
        addChatMessage('ai', `🎊 **${topic}** 커리큘럼을 모두 완료했어요!\n\n🗺️ 로드맵이 있다면 상단의 **[로드맵]** 버튼을, 새로운 주제로 시작하려면 **[새 주제]** 버튼을 눌러주세요.`);
        return;
      }
      
      if (nextStep) {
        // 에러 UI 제거
        errorUI.remove();
        // [중요] 인덱스 초기화
        state.currentStepIndex += 1;
        state.currentLessonStepIndex = 0;
        state.lessonCompleted = false;
        await startLesson(topic, nextStep.title);
        renderSidebarCurriculum(state.currentCurriculum, state.currentStepIndex, handleSidebarStepClick, state.curriculumProgress);
      }
    });
  }
  
  // 채팅 메시지도 추가
  addChatMessage('ai', `😢 "${lessonTitle}" 수업 생성에 문제가 생겼어요. 오른쪽 화면에서 다시 시도해주세요!`);
}

// [신규] 저장된 상태로부터 레슨 화면을 복원
// isRestore: true면 '문제를 불러왔어요' 메시지 출력 안 함
export function startLessonFromState(isRestore = true) {
  console.log('[LESSON] startLessonFromState 호출됨');
  console.log('[LESSON] state.currentLessonStepIndex:', state.currentLessonStepIndex);
  console.log('[LESSON] state.currentLessonPlan:', state.currentLessonPlan?.title);
  
  // [신규] 진행 상태 안내 메시지 생성
  const getProgressMessage = () => {
    const curriculum = state.currentCurriculum;
    const curriculumStep = curriculum?.curriculum?.[state.currentStepIndex];
    const lessonPlan = state.currentLessonPlan;
    const lessonStep = lessonPlan?.steps?.[state.currentLessonStepIndex];
    
    let progressInfo = [];
    
    // 커리큘럼 정보
    if (curriculum) {
      const totalCurrSteps = curriculum.curriculum?.length || 0;
      progressInfo.push(`📚 커리큘럼: **${totalCurrSteps}개 단원** 중 **${state.currentStepIndex + 1}번째**`);
      if (curriculumStep) {
        progressInfo.push(`   └ 현재 단원: "${curriculumStep.title}"`);
      }
    }
    
    // 레슨 플랜 정보
    if (lessonPlan && lessonPlan.steps?.length > 0) {
      const totalLessonSteps = lessonPlan.steps.length;
      progressInfo.push(`📖 수업: **${totalLessonSteps}개 단계** 중 **${state.currentLessonStepIndex + 1}번째**`);
      if (lessonStep) {
        progressInfo.push(`   └ 현재 단계: "${lessonStep.title || lessonStep.type}"`);
      }
    }
    
    if (progressInfo.length > 0) {
      return `\n\n---\n**현재 진행 상황**\n${progressInfo.join('\n')}`;
    }
    return '';
  };
  
  // [신규] 레슨 플랜이 없으면 (레슨 생성 중 새로고침 등) 재생성 옵션 표시
  if (!state.currentLessonPlan) {
    console.log('[LESSON] currentLessonPlan이 null - 커리큘럼 확인');
    // 커리큘럼이 있고 현재 단계가 있으면 해당 단계 레슨 재생성 옵션 표시
    if (state.currentCurriculum && state.currentStepIndex >= 0) {
      const currentStep = state.currentCurriculum.curriculum?.[state.currentStepIndex];
      if (currentStep) {
        console.log('[LESSON] 현재 커리큘럼 단계로 재생성 옵션 표시:', currentStep.title);
        // 사이드바 표시 (완료 상태 포함)
        renderSidebarCurriculum(state.currentCurriculum, state.currentStepIndex, handleSidebarStepClick, state.curriculumProgress);
        
        // [개선] 어디까지 완료되었는지 안내
        const totalSteps = state.currentCurriculum.curriculum?.length || 0;
        const completedMsg = state.currentStepIndex > 0 
          ? `✅ ${state.currentStepIndex}개 단원을 완료했고, **${currentStep.title}** 단원의 수업 생성 중 중단되었어요.`
          : `**${currentStep.title}** 단원의 수업 생성 중 중단되었어요.`;
        
        addChatMessage('ai', `${completedMsg}\n\n아래에서 다시 시도하거나 다른 단원을 선택할 수 있어요.`);
        
        // 재생성 UI 표시
        const topic = state.intendedTopic || state.currentCurriculum?.topic || '프로그래밍';
        showLessonCreationFailedUI(topic, currentStep.title, '이전 수업 내용을 불러올 수 없어요. 다시 생성해주세요.');
        return;
      }
    }
    
    // 커리큘럼도 없는 경우 - IDLE 상태로 안내
    if (state.intendedTopic) {
      addChatMessage('ai', `🔄 **"${state.intendedTopic}"** 학습이 중단되었어요.\n\n커리큘럼 생성 중에 새로고침이 발생한 것 같아요. 다시 시작해볼까요?`);
    }
    return;
  }
  
  // [신규] 레슨 플랜 유효성 검증: steps가 비어있으면 재생성 옵션 제공
  const steps = Array.isArray(state.currentLessonPlan.steps) ? state.currentLessonPlan.steps : [];
  if (steps.length === 0) {
    console.log('[LESSON] 레슨 플랜 steps가 비어있음 - 재생성 필요');
    showLessonRegenerateOption();
    return;
  }
  
  // 인덱스 범위 검증: 레슨 플랜의 스텝 수를 초과하면 0으로 리셋
  if (state.currentLessonStepIndex < 0 || state.currentLessonStepIndex >= steps.length) {
    console.log('[LESSON] 인덱스 범위 초과 감지! 0으로 리셋:', state.currentLessonStepIndex, '→ 0 (총 스텝:', steps.length, ')');
    state.currentLessonStepIndex = 0;
  }
  
  ensureActivityDom();
  displayCodingView();
  
  // [신규] ★ 사이드바 커리큘럼 복원 + 클릭 핸들러 연결 + 완료 상태 포함
  if (state.currentCurriculum) {
    renderSidebarCurriculum(state.currentCurriculum, state.currentStepIndex, handleSidebarStepClick, state.curriculumProgress);
  }
  
  try {
    dom.activityText?.classList?.remove('hidden');
    dom.activityContent?.classList?.remove('hidden');
    dom.activityControls?.classList?.remove('hidden');
  } catch {}
  if (dom.problemTitle) dom.problemTitle.textContent = state.currentLessonPlan.title || '수업';
  if (dom.problemDescriptionMd) dom.problemDescriptionMd.innerHTML = '';
  
  // [수정] 단원 완료 상태는 main.js에서 처리하므로 여기서는 early return만
  if (state.lessonCompleted) {
    return;  // main.js에서 showChoiceMenu(true) 호출함
  }
  
  renderCurrentStep(isRestore);
}

export function renderCurrentStep(skipMessage = false) {
  console.log('[RENDER] renderCurrentStep 호출, 인덱스:', state.currentLessonStepIndex, 'skipMessage:', skipMessage);
  ensureActivityDom();
  const plan = state.currentLessonPlan;
  if (!plan) return;
  const steps = Array.isArray(plan.steps) ? plan.steps : [];
  const step = steps[state.currentLessonStepIndex];
  if (!step) {
    console.log('[RENDER] 마지막 단계 완료');
    addChatMessageWithTyping('수고하셨습니다! 이 단원 학습을 완료했습니다.');
    // 패널 닫기 또는 다음 커리큘럼 안내 등은 추후 확장
    return;
  }

  console.log('[RENDER] 현재 단계 타입:', step.type);
  // 초기화
  if (dom.activityText) dom.activityText.innerHTML = '';
  if (dom.activityContent) dom.activityContent.innerHTML = '';
  if (dom.activityControls) dom.activityControls.innerHTML = '';
  
  // [신규] 빈칸 힌트 박스 제거 (이전 단계에서 남아있을 수 있음)
  const existingHintBox = document.querySelector('.blank-hint-box');
  if (existingHintBox) existingHintBox.remove();
  
  // [신규] 이전 단계에서 남아있는 테이블 컨테이너 모두 제거
  document.querySelectorAll('.problem-data-table-container, .mcq-excel-table-container').forEach(el => el.remove());
  
  // [신규] activity-section 초기화 (이전 단계에서 숨겨졌을 수 있음)
  const activitySection = document.getElementById('activity-section');
  activitySection?.classList?.remove('hidden');
  
  // [신규] 헤더 버튼 기본 상태 초기화
  hideAllHeaderButtons();

  // 타입별 렌더링
  const t = String(step.type || '').toLowerCase();
  
  // [수정] final_code 단계는 renderProblem()에서 설명을 표시하므로,
  // 여기서 activityText를 숨기고 중복 방지
  if (t === 'final_code') {
    dom.activityText?.classList?.add('hidden');
    return renderFinalCodeStep(step, skipMessage);
  }
  
  // [Engine 2.0] visual_logic 단계는 Mermaid 다이어그램 렌더링
  if (t === 'visual_logic') {
    return renderVisualLogicStep(step);
  }
  
  // [Engine 2.0] master_pattern 단계는 코드 템플릿 강조 표시
  if (t === 'master_pattern') {
    return renderMasterPatternStep(step);
  }
  
  // [Engine 2.0] mirror_example 단계는 응용 예제 표시
  if (t === 'mirror_example') {
    return renderMirrorExampleStep(step);
  }
  
  // [수정] MCQ와 fill_in_blank는 자체 렌더 함수에서 step.text를 처리하므로 여기서 제외
  if (t === 'mcq') return renderMcqStep(step);
  if (t === 'fill_in_blank') return renderFillInBlankStep(step, skipMessage);
  
  // 텍스트 영역 (마크다운 렌더링 + 커스텀 스타일 적용) - final_code, mcq, fill_in_blank 외 단계만
  if (step.text && dom.activityText) {
    console.log('[RENDER] step.text:', step.text.substring(0, 100));
    // [신규] 이스케이프된 줄바꿈 문자를 실제 줄바꿈으로 변환
    let textContent = step.text.replace(/\\n/g, '\n');
    
    // [신규] 들여쓰기된 코드 블록 보정 - 여는/닫는 백틱의 들여쓰기 제거
    textContent = textContent.replace(/^[ \t]+(```)/gm, '$1');
    
    // [수정] HTML 태그 이스케이프 후 마크다운 파싱
    const escapedText = escapeHtmlTagsOutsideCode(textContent);
    let htmlContent = window.marked ? window.marked.parse(escapedText) : escapedText;
    // 빈칸 마커를 입력 필드로 변환
    htmlContent = convertBlanksToInputs(htmlContent);
    console.log('[RENDER] htmlContent:', htmlContent.substring(0, 100));
    dom.activityText.innerHTML = htmlContent;
    // 마크다운 스타일 적용을 위해 클래스 추가
    dom.activityText.classList.add('markdown-content');
    // [중요] hidden 클래스 제거하여 표시
    dom.activityText.classList.remove('hidden');
    console.log('[RENDER] activityText classes:', dom.activityText.className);
  }

  // [Engine 2.0] context 단계는 concept과 동일하게 처리
  if (t === 'concept' || t === 'context') return renderConceptStep();
  return renderConceptStep();
}

function hideAllHeaderButtons() {
  dom.lessonBackBtn?.classList?.add('hidden');
  dom.lessonSkipBtn?.classList?.add('hidden');
  dom.lessonNextBtn?.classList?.add('hidden');
  dom.lessonRunBtn?.classList?.add('hidden');
}

function goNext() {
  console.log('[LESSON] goNext 호출됨, 현재 인덱스:', state.currentLessonStepIndex);
  try {
    const plan = state.currentLessonPlan;
    const steps = Array.isArray(plan?.steps) ? plan.steps : [];
    const isLastStep = state.currentLessonStepIndex >= steps.length - 1;
    
    // [신규] 마지막 단계인 경우 선택 메뉴 표시 + 완료 상태 저장
    // 레슨 완료 기록은 showChoiceMenu() 내부에서 자동 처리됨
    if (isLastStep) {
      state.lessonCompleted = true;
      saveStateToServer();
      showChoiceMenu();
      return;
    }
    
    state.currentLessonStepIndex += 1;
    state.lastCodeSnapshot = null; // [수정] 다음 단계로 이동 시 스냅샷 강제 초기화
    console.log('[LESSON] 인덱스 증가 완료, 스냅샷 초기화:', state.currentLessonStepIndex);
    renderCurrentStep();
    console.log('[LESSON] renderCurrentStep 완료');
    saveStateToServer(); // saveStateToServer는 이제 final_code일 때만 스냅샷을 갱신
    console.log('[LESSON] saveStateToServer 호출 완료');
  } catch (err) {
    console.error('[LESSON] goNext 에러:', err);
  }
}

function goBack() {
  console.log('[LESSON] goBack 호출됨, 현재 인덱스:', state.currentLessonStepIndex);
  if (state.currentLessonStepIndex > 0) {
    state.currentLessonStepIndex -= 1;
    state.lastCodeSnapshot = null; // [수정] 이전 단계로 이동 시 스냅샷 강제 초기화
    console.log('[LESSON] 인덱스 감소 완료, 스냅샷 초기화:', state.currentLessonStepIndex);
    renderCurrentStep();
    try { saveStateToServer(); } catch {} // saveStateToServer는 이제 final_code일 때만 스냅샷을 갱신
  }
}

function renderConceptStep() {
  console.log('[RENDER] renderConceptStep 호출됨');
  console.log('[RENDER] dom.activityText:', dom.activityText);
  
  // 개념 단계에서는 문제 설명 영역을 비웁니다.
  if (dom.problemDescriptionMd) dom.problemDescriptionMd.innerHTML = '';
  
  // 개념 단계: 에디터 숨기고 설명 영역 전체 표시
  try {
    const descSection = document.getElementById('description-section');
    const lessonPanel = document.getElementById('lesson-panel');
    
    // 에디터 패널 숨기기
    if (lessonPanel) {
      lessonPanel.classList.add('hidden-for-concept');
    }
    // 설명 영역 전체 높이로
    if (descSection) {
      descSection.classList.add('full-height');
      descSection.classList.remove('with-editor');
    }
    
    if (dom.activityText) {
      dom.activityText.classList.remove('hidden');
      console.log('[RENDER] activityText hidden 제거 후:', dom.activityText.className);
    }
    dom.activityContent?.classList.add('hidden');
    document.getElementById('code-editor')?.classList?.add('hidden');
  } catch (e) {
    console.error('[RENDER] renderConceptStep 에러:', e);
  }

  // [수정] 이 단계에 진입하면 앱 상태를 '개념 학습 중'으로 변경합니다.
  state.appState = 'CONCEPT_VIEW';

  // [신규] 헤더 버튼 표시
  if (dom.lessonBackBtn) {
    dom.lessonBackBtn.classList.remove('hidden');
    dom.lessonBackBtn.disabled = state.currentLessonStepIndex <= 0;
    dom.lessonBackBtn.onclick = (e) => {
      e.preventDefault();
      goBack();
    };
  }
  if (dom.lessonNextBtn) {
    dom.lessonNextBtn.classList.remove('hidden');
    // [수정] 텍스트와 스타일을 기본값으로 복원
    dom.lessonNextBtn.textContent = '다음';
    dom.lessonNextBtn.innerHTML = '다음<i class="fas fa-arrow-right ml-2"></i>';
    dom.lessonNextBtn.className = 'bg-sky-600 hover:bg-sky-700 text-white font-semibold py-1 px-3 rounded-md text-sm transition-colors';
    dom.lessonNextBtn.onclick = (e) => {
      e.preventDefault();
      goNext();
    };
  }
}

// [Engine 2.0] Visual Logic 단계 - Mermaid 다이어그램 렌더링
function renderVisualLogicStep(step) {
  console.log('[RENDER] renderVisualLogicStep 호출됨');
  
  // 개념 단계와 동일한 레이아웃 설정
  if (dom.problemDescriptionMd) dom.problemDescriptionMd.innerHTML = '';
  
  try {
    const descSection = document.getElementById('description-section');
    const lessonPanel = document.getElementById('lesson-panel');
    
    if (lessonPanel) lessonPanel.classList.add('hidden-for-concept');
    if (descSection) {
      descSection.classList.add('full-height');
      descSection.classList.remove('with-editor');
    }
    
    dom.activityContent?.classList.remove('hidden');
    document.getElementById('code-editor')?.classList?.add('hidden');
  } catch (e) {
    console.error('[RENDER] renderVisualLogicStep 레이아웃 에러:', e);
  }

  // 텍스트 렌더링
  if (step.text && dom.activityText) {
    let textContent = step.text.replace(/\\n/g, '\n');
    textContent = textContent.replace(/^[ \t]+(```)/gm, '$1');
    
    // [수정] **"텍스트"** 형식을 **텍스트**로 변환 (따옴표가 있으면 marked가 파싱 못함)
    textContent = textContent.replace(/\*\*"([^"]+)"\*\*/g, '**$1**');
    textContent = textContent.replace(/\*\*'([^']+)'\*\*/g, '**$1**');
    
    // [수정] visual_logic에서는 HTML 태그 이스케이프 생략 - 마크다운 파싱 우선
    // marked.parse() 또는 marked() 시도
    let htmlContent;
    if (window.marked) {
      if (typeof window.marked.parse === 'function') {
        htmlContent = window.marked.parse(textContent);
      } else if (typeof window.marked === 'function') {
        htmlContent = window.marked(textContent);
      } else {
        htmlContent = textContent;
      }
    } else {
      htmlContent = textContent;
    }
    
    console.log('[VISUAL_LOGIC] 원본 텍스트:', step.text.substring(0, 200));
    console.log('[VISUAL_LOGIC] 전처리된 텍스트:', textContent.substring(0, 200));
    console.log('[VISUAL_LOGIC] 렌더링된 HTML:', htmlContent.substring(0, 200));
    
    dom.activityText.innerHTML = htmlContent;
    dom.activityText.classList.add('markdown-content');
    dom.activityText.classList.remove('hidden');
    
    console.log('[VISUAL_LOGIC] activityText 클래스:', dom.activityText.className);
    console.log('[VISUAL_LOGIC] activityText hidden 여부:', dom.activityText.classList.contains('hidden'));
  }

  // Mermaid 다이어그램 렌더링
  const content = dom.activityContent;
  if (content && step.mermaid_code) {
    // [Safety 3.0] Mermaid 코드 정제 - HTML 태그 및 위험 문자 제거
    let mermaidCode = step.mermaid_code.replace(/\\n/g, '\n');
    mermaidCode = sanitizeMermaidCode(mermaidCode);
    
    console.log('[MERMAID] 정제된 코드:', mermaidCode.substring(0, 200));
    
    // Glassmorphism 컨테이너 생성 - 기존 내용을 덮어쓰지 않고 추가
    const mermaidId = `mermaid-${Date.now()}`;
    const mermaidContainer = document.createElement('div');
    mermaidContainer.innerHTML = `
      <div class="mermaid-container glassmorphism">
        <div class="mermaid-header">
          <i class="fas fa-project-diagram"></i>
          <span>개념 흐름도</span>
        </div>
        <div id="${mermaidId}" class="mermaid">${mermaidCode}</div>
      </div>
    `;
    
    // 기존 내용 유지하고 Mermaid만 추가
    content.innerHTML = '';
    content.appendChild(mermaidContainer);
    
    // [Engine 3.0] Mermaid 렌더링 실행 - 초기화 문제 해결
    if (window.mermaid) {
      const mermaidDiv = document.getElementById(mermaidId);
      if (mermaidDiv) {
        // 1. 기존 처리 속성 제거 (재렌더링 시 필수)
        mermaidDiv.removeAttribute('data-processed');
        
        // 2. DOM 업데이트 완료 후 렌더링 (타이밍 문제 해결)
        setTimeout(() => {
          window.mermaid.run({ querySelector: `#${mermaidId}` }).then(() => {
            // [Fix] SVG viewBox 조정 - 모든 요소가 보이도록
            const svg = mermaidDiv.querySelector('svg');
            if (svg) {
              // 약간의 지연 후 정확한 bbox 계산
              requestAnimationFrame(() => {
                try {
                  const bbox = svg.getBBox();
                  const padding = 30;
                  svg.setAttribute('viewBox', 
                    `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);
                  svg.style.width = '100%';
                  svg.style.height = 'auto';
                  console.log('[MERMAID] SVG viewBox 조정 완료');
                } catch (e) {
                  console.log('[MERMAID] bbox 계산 실패, 기본값 사용');
                }
              });
            }
          }).catch((e) => {
            console.error('[RENDER] Mermaid 렌더링 에러:', e);
            // Graceful fallback: 에러 발생 시 코드 블록으로 표시
            if (mermaidDiv) {
              mermaidDiv.innerHTML = `
                <div class="mermaid-error-fallback bg-gray-800 rounded-lg p-4 border border-red-400/30">
                  <div class="flex items-center gap-2 text-red-400 text-sm mb-2">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>다이어그램 렌더링 중 문제가 발생했어요 💦</span>
                  </div>
                  <pre class="text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap"><code>${mermaidCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
                  <p class="text-gray-400 text-xs mt-2">위 코드를 <a href="https://mermaid.live" target="_blank" class="text-sky-400 hover:underline">mermaid.live</a>에서 확인해보세요!</p>
                </div>
              `;
            }
          });
        }, 0);
      }
    }
  }

  state.appState = 'CONCEPT_VIEW';

  // 헤더 버튼 표시
  if (dom.lessonBackBtn) {
    dom.lessonBackBtn.classList.remove('hidden');
    dom.lessonBackBtn.disabled = state.currentLessonStepIndex <= 0;
    dom.lessonBackBtn.onclick = (e) => { e.preventDefault(); goBack(); };
  }
  if (dom.lessonNextBtn) {
    dom.lessonNextBtn.classList.remove('hidden');
    dom.lessonNextBtn.innerHTML = '다음<i class="fas fa-arrow-right ml-2"></i>';
    dom.lessonNextBtn.className = 'bg-sky-600 hover:bg-sky-700 text-white font-semibold py-1 px-3 rounded-md text-sm transition-colors';
    dom.lessonNextBtn.onclick = (e) => { e.preventDefault(); goNext(); };
  }
}

// [Engine 2.0] Master Pattern 단계 - 핵심 패턴 코드 강조 표시
function renderMasterPatternStep(step) {
  console.log('[RENDER] renderMasterPatternStep 호출됨');
  
  if (dom.problemDescriptionMd) dom.problemDescriptionMd.innerHTML = '';
  
  try {
    const descSection = document.getElementById('description-section');
    const lessonPanel = document.getElementById('lesson-panel');
    
    if (lessonPanel) lessonPanel.classList.add('hidden-for-concept');
    if (descSection) {
      descSection.classList.add('full-height');
      descSection.classList.remove('with-editor');
    }
    
    dom.activityContent?.classList.remove('hidden');
    document.getElementById('code-editor')?.classList?.add('hidden');
  } catch (e) {
    console.error('[RENDER] renderMasterPatternStep 레이아웃 에러:', e);
  }

  // 텍스트 렌더링
  if (step.text && dom.activityText) {
    let textContent = step.text.replace(/\\n/g, '\n');
    textContent = textContent.replace(/^[ \t]+(```)/gm, '$1');
    const escapedText = escapeHtmlTagsOutsideCode(textContent);
    let htmlContent = window.marked ? window.marked.parse(escapedText) : escapedText;
    dom.activityText.innerHTML = htmlContent;
    dom.activityText.classList.add('markdown-content');
    dom.activityText.classList.remove('hidden');
  }

  // 코드 템플릿 표시 (특별 스타일링)
  const content = dom.activityContent;
  if (content && step.code_template) {
    const codeContent = step.code_template.replace(/\\n/g, '\n');
    
    content.innerHTML = `
      <div class="master-pattern-container glassmorphism">
        <div class="pattern-header">
          <i class="fas fa-star text-yellow-400"></i>
          <span>핵심 패턴 (암기하세요!)</span>
        </div>
        <pre class="pattern-code"><code class="language-python">${escapeHtml(codeContent)}</code></pre>
      </div>
    `;
    
    // 코드 하이라이팅
    if (window.hljs) {
      content.querySelectorAll('pre code').forEach((block) => {
        window.hljs.highlightElement(block);
      });
    }
  }

  state.appState = 'CONCEPT_VIEW';

  // 헤더 버튼 표시
  if (dom.lessonBackBtn) {
    dom.lessonBackBtn.classList.remove('hidden');
    dom.lessonBackBtn.disabled = state.currentLessonStepIndex <= 0;
    dom.lessonBackBtn.onclick = (e) => { e.preventDefault(); goBack(); };
  }
  if (dom.lessonNextBtn) {
    dom.lessonNextBtn.classList.remove('hidden');
    dom.lessonNextBtn.innerHTML = '다음<i class="fas fa-arrow-right ml-2"></i>';
    dom.lessonNextBtn.className = 'bg-sky-600 hover:bg-sky-700 text-white font-semibold py-1 px-3 rounded-md text-sm transition-colors';
    dom.lessonNextBtn.onclick = (e) => { e.preventDefault(); goNext(); };
  }
}

// [Engine 2.0] Mirror Example 단계 - 응용 예제 표시
function renderMirrorExampleStep(step) {
  console.log('[RENDER] renderMirrorExampleStep 호출됨');
  
  if (dom.problemDescriptionMd) dom.problemDescriptionMd.innerHTML = '';
  
  try {
    const descSection = document.getElementById('description-section');
    const lessonPanel = document.getElementById('lesson-panel');
    
    if (lessonPanel) lessonPanel.classList.add('hidden-for-concept');
    if (descSection) {
      descSection.classList.add('full-height');
      descSection.classList.remove('with-editor');
    }
    
    dom.activityContent?.classList.remove('hidden');
    document.getElementById('code-editor')?.classList?.add('hidden');
  } catch (e) {
    console.error('[RENDER] renderMirrorExampleStep 레이아웃 에러:', e);
  }

  // 텍스트 렌더링
  if (step.text && dom.activityText) {
    let textContent = step.text.replace(/\\n/g, '\n');
    textContent = textContent.replace(/^[ \t]+(```)/gm, '$1');
    const escapedText = escapeHtmlTagsOutsideCode(textContent);
    let htmlContent = window.marked ? window.marked.parse(escapedText) : escapedText;
    dom.activityText.innerHTML = htmlContent;
    dom.activityText.classList.add('markdown-content');
    dom.activityText.classList.remove('hidden');
  }

  // 응용 예제 코드 표시
  const content = dom.activityContent;
  if (content && step.code_example) {
    const codeContent = step.code_example.replace(/\\n/g, '\n');
    
    content.innerHTML = `
      <div class="mirror-example-container glassmorphism">
        <div class="example-header">
          <i class="fas fa-clone text-cyan-400"></i>
          <span>응용 예제</span>
        </div>
        <pre class="example-code"><code class="language-python">${escapeHtml(codeContent)}</code></pre>
        <div class="example-tip">
          💡 위 핵심 패턴을 어떻게 응용했는지 비교해보세요!
        </div>
      </div>
    `;
    
    // 코드 하이라이팅
    if (window.hljs) {
      content.querySelectorAll('pre code').forEach((block) => {
        window.hljs.highlightElement(block);
      });
    }
  }

  state.appState = 'CONCEPT_VIEW';

  // 헤더 버튼 표시
  if (dom.lessonBackBtn) {
    dom.lessonBackBtn.classList.remove('hidden');
    dom.lessonBackBtn.disabled = state.currentLessonStepIndex <= 0;
    dom.lessonBackBtn.onclick = (e) => { e.preventDefault(); goBack(); };
  }
  if (dom.lessonNextBtn) {
    dom.lessonNextBtn.classList.remove('hidden');
    dom.lessonNextBtn.innerHTML = '다음<i class="fas fa-arrow-right ml-2"></i>';
    dom.lessonNextBtn.className = 'bg-sky-600 hover:bg-sky-700 text-white font-semibold py-1 px-3 rounded-md text-sm transition-colors';
    dom.lessonNextBtn.onclick = (e) => { e.preventDefault(); goNext(); };
  }
}

// HTML 이스케이프 헬퍼 함수
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMcqStep(step) {
  // MCQ 단계에서는 문제 설명 영역을 비웁니다.
  if (dom.problemDescriptionMd) dom.problemDescriptionMd.innerHTML = '';
  
  // MCQ 단계: 에디터 숨기고 설명 영역 전체 표시
  try {
    const descSection = document.getElementById('description-section');
    const lessonPanel = document.getElementById('lesson-panel');
    
    // 에디터 패널 숨기기
    if (lessonPanel) {
      lessonPanel.classList.add('hidden-for-concept');
    }
    // 설명 영역 전체 높이로
    if (descSection) {
      descSection.classList.add('full-height');
      descSection.classList.remove('with-editor');
    }
    
    dom.activityText?.classList.remove('hidden');
    dom.activityContent?.classList.remove('hidden');
    document.getElementById('code-editor')?.classList?.add('hidden');
  } catch {}

  const content = dom.activityContent;
  if (!content) return;
  
  // [신규] 헤더 버튼 표시
  if (dom.lessonBackBtn) {
    dom.lessonBackBtn.classList.remove('hidden');
    dom.lessonBackBtn.disabled = state.currentLessonStepIndex <= 0;
    dom.lessonBackBtn.onclick = (e) => {
      e.preventDefault();
      goBack();
    };
  }
  if (dom.lessonSkipBtn) {
    dom.lessonSkipBtn.classList.remove('hidden');
    dom.lessonSkipBtn.onclick = (e) => {
      e.preventDefault();
      goNext();
    };
  }
  
  // [수정] step.text가 있으면 먼저 출력 (문제 내용/설명)
  if (step.text) {
    const textDiv = document.createElement('div');
    textDiv.className = 'mb-4 markdown-content text-sm text-slate-300';
    const textHtml = window.marked ? window.marked.parse(String(step.text)) : String(step.text);
    textDiv.innerHTML = textHtml;
    content.appendChild(textDiv);
  }
  
  const q = document.createElement('div');
  q.className = 'mb-3 font-semibold markdown-content text-sm';
  // 질문도 마크다운으로 렌더링 (백틱 코드 지원)
  const questionHtml = window.marked ? window.marked.parse(String(step.question || '질문')) : String(step.question || '질문');
  q.innerHTML = questionHtml;
  content.appendChild(q);

  // [신규] MCQ에 코드 스니펫이 있으면 코드 블록으로 렌더링
  // [개선] 언어별 동적 처리 및 엑셀 표 지원
  if (step.code_snippet || step.table) {
    // 렌더 타입 결정: table이 명시되었거나 language가 excel이면 표로
    const renderType = step.render_type || (step.language?.toLowerCase() === 'excel' ? 'table' : 'code');
    
    if (renderType === 'table' && step.table) {
      // [리팩토링] 공통 테이블 렌더링 함수 사용
      const tableContainer = renderExcelTable(step.table);
      content.appendChild(tableContainer);
    } else if (step.code_snippet) {
      // 코드 블록으로 렌더링
      const codeBlock = document.createElement('div');
      codeBlock.className = 'mcq-code-block mb-4 rounded-lg overflow-hidden';
      const codeContent = String(step.code_snippet).replace(/\\n/g, '\n');
      
      // 언어 감지 (step.language 또는 state에서)
      const lang = (step.language || state.currentLessonPlan?.language || 'python').toLowerCase();
      const langMap = {
        'python': 'python',
        'c': 'c',
        'cpp': 'cpp',
        'c++': 'cpp',
        'javascript': 'javascript',
        'js': 'javascript',
        'bash': 'bash',
        'shell': 'bash',
        'r': 'r',
        'html': 'html',
        'css': 'css',
        'sql': 'sql',
        'java': 'java',
        'excel': 'excel',
      };
      const highlightLang = langMap[lang] || 'plaintext';
      
      // 마크다운 코드 블록으로 렌더링
      const codeHtml = window.marked 
        ? window.marked.parse('```' + highlightLang + '\n' + codeContent + '\n```') 
        : `<pre><code>${codeContent}</code></pre>`;
      codeBlock.innerHTML = codeHtml;
      content.appendChild(codeBlock);
    }
  }

  // HTML 이스케이프 헬퍼 함수
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const options = Array.isArray(step.options) ? step.options : [];
  options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mcq-option-btn';
    // 옵션에 < > 같은 문자가 있으면 이스케이프 처리
    const optText = String(opt);
    if (optText.includes('<') || optText.includes('>')) {
      // 코드 형태의 텍스트는 <code>로 감싸기
      btn.innerHTML = `<code>${escapeHtml(optText)}</code>`;
    } else {
      btn.innerHTML = window.marked ? window.marked.parseInline(optText) : optText;
    }
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleMcqAnswer(idx, step);
    });
    content.appendChild(btn);
  });
}

function handleMcqAnswer(selectedIndex, step) {
  console.log('[MCQ] 답변 선택:', selectedIndex, '- 현재 시각:', new Date().toLocaleTimeString());
  const buttons = document.querySelectorAll('.mcq-option-btn');
  buttons.forEach((b) => (b.disabled = true));
  const correctIdx = Number(step.correct_answer_index ?? -1);
  
  // 🌟 루나 페르소나 반응 - 표정 유지
  const { setTutorExpression, TUTOR } = window.TutorPersona || {};
  
  if (selectedIndex === correctIdx) {
    // 🎵 정답 효과음
    SFX.correct();
    
    buttons[selectedIndex]?.classList?.add('correct');
    // 정답 반응: 페르소나(짧은 감정) + AI피드백(상세 설명)
    if (setTutorExpression) setTutorExpression('happy');
    
    const emotionMsg = TUTOR?.messages?.correct?.() || '정답!';
    const feedbackMsg = step.feedback || '';
    // 감정과 피드백을 하나로 합쳐서 출력 (중복 방지) - 타이핑 효과 적용
    addChatMessageWithTyping(feedbackMsg ? `${emotionMsg} ${feedbackMsg}` : emotionMsg);
    // 표정 유지 - 다음 단계에서 자연스럽게 전환
    
    console.log('[MCQ] 정답! 0.8초 후 다음 단계로', '- 현재 시각:', new Date().toLocaleTimeString());
    setTimeout(() => {
      console.log('[MCQ] setTimeout 실행됨', '- 현재 시각:', new Date().toLocaleTimeString());
      goNext();
    }, 800);
  } else {
    // 🎵 오답 효과음
    SFX.incorrect();
    
    buttons[selectedIndex]?.classList?.add('incorrect');
    if (correctIdx >= 0) buttons[correctIdx]?.classList?.add('correct');
    // 오답 반응 - encouraging 상태 유지
    if (setTutorExpression) setTutorExpression('encouraging');
    const message = TUTOR?.messages?.incorrect?.() || '아쉬워요! 정답을 확인해보세요.';
    addChatMessageWithTyping(message);
    
    console.log('[MCQ] 오답! 1.5초 후 다음 단계로', '- 현재 시각:', new Date().toLocaleTimeString());
    setTimeout(() => {
      console.log('[MCQ] setTimeout 실행됨', '- 현재 시각:', new Date().toLocaleTimeString());
      goNext();
    }, 1500);
  }
}

function renderFillInBlankStep(step, skipMessage = false) {
  const content = dom.activityContent;
  if (!content) return;

  // 빈칸 채우기 단계: 에디터 표시, 설명 영역 40%
  try {
    const descSection = document.getElementById('description-section');
    const lessonPanel = document.getElementById('lesson-panel');
    
    // 에디터 패널 표시
    if (lessonPanel) {
      lessonPanel.classList.remove('hidden-for-concept');
    }
    // 설명 영역 40%로
    if (descSection) {
      descSection.classList.remove('full-height');
      descSection.classList.add('with-editor');
    }
    
    dom.activityText?.classList.remove('hidden');
    dom.activityContent?.classList.add('hidden');
    document.getElementById('code-editor')?.classList?.remove('hidden');
  } catch {}

  // [수정] 이 단계에 진입하면 앱 상태를 '문제 풀이 중'으로 변경합니다.
  state.appState = 'PROBLEM_SOLVING';

  console.log('[LESSON] renderFillInBlankStep - step.code_template:', step.code_template?.substring(0, 100));
  // 빈칸 채우기 단계에서는 문제 설명 영역을 비웁니다.
  if (dom.problemDescriptionMd) dom.problemDescriptionMd.innerHTML = '';
  // [수정] fill_in_blank 단계는 스냅샷을 사용하지 않습니다.
  // 강제로 null로 설정하여, 이전 단계(final_code)의 코드가 넘어오는 것을 방지합니다.
  state.lastCodeSnapshot = null;

  // [신규] solution 기반 빈칸 힌트 생성 및 표시
  const blankHints = generateBlankHints(step.solution, step.text || '');
  if (blankHints && dom.activityText) {
    // 기존 힌트 박스가 있으면 제거
    const existingHint = dom.activityText.parentElement?.querySelector('.blank-hint-box');
    if (existingHint) existingHint.remove();
    
    // 힌트 박스 생성
    const hintBox = document.createElement('div');
    hintBox.className = 'blank-hint-box mt-3 p-3 bg-slate-700/50 rounded-md text-sm border-l-4 border-amber-400';
    hintBox.innerHTML = `
      <div class="font-semibold text-amber-400 mb-2">💡 빈칸 힌트</div>
      <div class="text-slate-300">${blankHints}</div>
    `;
    dom.activityText.after(hintBox);
  }
  
  // [신규] fill_in_blank 단계에 table 필드가 있거나 텍스트에서 추출 가능하면 엑셀 스타일 표로 렌더링
  let extractedTableData = null;
  
  // 1. step.table 필드 확인
  if (step.table && step.table.headers && step.table.rows) {
    extractedTableData = step.table;
  }
  
  // 2. table 필드가 없으면 step.text에서 자동 추출 시도
  if (!extractedTableData && step.text) {
    const { tableData, cleanedText } = extractTableFromText(step.text);
    if (tableData) {
      extractedTableData = tableData;
      // 정리된 텍스트로 activityText 업데이트
      if (dom.activityText) {
        try {
          if (window.marked) {
            dom.activityText.innerHTML = marked.parse(cleanedText);
          } else {
            dom.activityText.textContent = cleanedText;
          }
        } catch (e) {
          // 실패 시 원본 유지
        }
      }
    }
  }
  
  // 3. 테이블 렌더링
  // [수정] 기존 테이블을 모두 제거 (누적 방지)
  const existingTables = dom.activityText?.parentElement?.querySelectorAll('.problem-data-table-container');
  existingTables?.forEach(table => table.remove());
  
  if (extractedTableData && dom.activityText) {
    // 테이블 컨테이너 생성
    const tableContainer = renderExcelTable(extractedTableData, { className: 'problem-data-table-container' });
    
    // 힌트 박스가 있으면 그 뒤에, 없으면 activityText 뒤에 삽입
    const hintBox = dom.activityText.parentElement?.querySelector('.blank-hint-box');
    if (hintBox) {
      hintBox.after(tableContainer);
    } else {
      dom.activityText.after(tableContainer);
    }
  }

  // CodeMirror IDE로 일관 표시: step 기반으로 직접 렌더
  const codeEditorEl = document.getElementById('code-editor');
  codeEditorEl?.classList?.remove('hidden');
  renderEditorForStep({
    language: (state.problemJSON?.language || 'Python'),
    code_template: String(step.code_template || ''),
  }, 'fill_in_blank', null); // [수정] codeSnapshot으로 null을 명시적으로 전달

  // [신규] 헤더 버튼 표시
  if (dom.lessonBackBtn) {
    dom.lessonBackBtn.classList.remove('hidden');
    dom.lessonBackBtn.disabled = state.currentLessonStepIndex <= 0;
    dom.lessonBackBtn.onclick = (e) => {
      e.preventDefault();
      goBack();
    };
  }
  if (dom.lessonSkipBtn) {
    dom.lessonSkipBtn.classList.remove('hidden');
    dom.lessonSkipBtn.onclick = (e) => {
      e.preventDefault();
      goNext();
    };
  }
  if (dom.lessonNextBtn) {
    dom.lessonNextBtn.classList.remove('hidden');
    dom.lessonNextBtn.textContent = '정답 확인';
    dom.lessonNextBtn.className = 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1 px-3 rounded-md text-sm transition-colors';
    dom.lessonNextBtn.onclick = async (e) => {
      e.preventDefault();
      if (state.isAwaitingResponse) return;
      setLoading(true, 'AI가 정답을 확인 중입니다...');
      try {
        const userCode = getCurrentCode() || '';
        const miniProblem = {
          title: state.currentLessonPlan?.title || '개념 확인',
          description: step.text || '제시된 빈칸을 채우세요.',
          code_template: String(step.code_template || ''),
          solution: step.solution,
          language: step.language || (state.problemJSON?.language) || 'Python',
        };
        const result = await gradeCode(miniProblem, userCode);
        const ok = !!(result && result.ai_judgment && result.ai_judgment.is_correct);
        if (ok) {
          // 🎵 정답 효과음
          SFX.correct();
          const fb = String(step.feedback || result.ai_judgment.feedback || '정답입니다!');
          addChatMessageWithTyping(fb);
          setTimeout(() => { setLoading(false); goNext(); }, 800);
        } else {
          // 🎵 오답 효과음
          SFX.incorrect();
          const fb = String(result?.ai_judgment?.feedback || '조금 달라요. AI 힌트를 참고해서 다시 시도해 볼까요?');
          addChatMessageWithTyping(fb);
          setLoading(false);
        }
      } catch (e) {
        console.error('AI 채점 중 오류:', e);
        addChatMessage('ai', '채점 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        setLoading(false);
      }
    };
  }
}

function renderFinalCodeStep(step, skipMessage = false) {
  // final_code에서는 기존 코드 문제 렌더링을 그대로 활용
  const problem = step.problem_json || {};
  state.problemJSON = problem;

  // [수정] 이 단계에 진입하면 앱 상태를 '문제 풀이 중'으로 변경합니다.
  state.appState = 'PROBLEM_SOLVING'

  // 코딩 단계: 에디터 표시, 설명 영역 40%
  try {
    const descSection = document.getElementById('description-section');
    const lessonPanel = document.getElementById('lesson-panel');
    
    // 에디터 패널 표시
    if (lessonPanel) {
      lessonPanel.classList.remove('hidden-for-concept');
    }
    // 설명 영역 40%로
    if (descSection) {
      descSection.classList.remove('full-height');
      descSection.classList.add('with-editor');
    }
    
    const activitySection = document.getElementById('activity-section');
    activitySection?.classList?.add('hidden');
  } catch {}

  // 활동 패널은 유지하되, 코드 에디터 표시
  const codeEditorEl = document.getElementById('code-editor');
  codeEditorEl?.classList?.remove('hidden');

  renderProblem(skipMessage);
  renderEditorForStep({
    language: (problem.language || 'Python'),
    code_template: String(problem.code_template || ''),
  }, 'final_code', state.lastCodeSnapshot || null);
  
  // [버그 수정] 이 줄을 삭제합니다.
  // 이 코드가 스냅샷을 소비(consume)하여,
  // 뒤로/앞으로 재방문 시 코드가 초기화되는 원인이었습니다.
  // state.lastCodeSnapshot = null;

  // [신규] 헤더 버튼 표시
  if (dom.lessonBackBtn) {
    dom.lessonBackBtn.classList.remove('hidden');
    dom.lessonBackBtn.disabled = state.currentLessonStepIndex <= 0;
    dom.lessonBackBtn.onclick = (e) => {
      e.preventDefault();
      goBack();
    };
  }
  if (dom.lessonSkipBtn) {
    dom.lessonSkipBtn.classList.remove('hidden');
    dom.lessonSkipBtn.onclick = (e) => {
      e.preventDefault();
      goNext();
    };
  }
  if (dom.lessonRunBtn) {
    dom.lessonRunBtn.classList.remove('hidden');
    dom.lessonRunBtn.onclick = handleRunAndGrade;
  }
}
