import { dom, state } from './state.js';
import { addChatMessage, addChatMessageWithTyping, appendNextActionButtons, showChoiceMenu, handleReward } from './ui.js';
import { runPython, simulate, validate, feedback, nextStep, gradeCode } from './api.js';
import { getCurrentCode } from './editor.js';

export async function handleRunSimulation() {
  if (!state.problemJSON) return;

  const template = (typeof state.problemJSON.code_template === 'string' ? state.problemJSON.code_template : (state.problemJSON.code_template?.html || '')).replace(/\\n/g, '\n');
  const userCode = getCurrentCode();
  const runId = ++state.lastRunId;
  const isStale = () => runId !== state.lastRunId;
  try {
    dom.outputContainer.textContent = '';
    dom.outputIframe.srcdoc = '<!DOCTYPE html><html><head></head><body><!-- reset --></body></html>';
  } catch {}

  const spans = dom.codeEditor.querySelectorAll('.editable-blank');
  const currentUserInputs = {};
  let allBlanksEmpty = true;
  spans.forEach((span, idx) => {
    const key = span.dataset.blankId || `editable_${idx + 1}`;
    const raw = span.textContent || '';
    const cleaned = raw.replace(/[\u00A0\u200B\u200C\u200D]/g, '').trim();
    currentUserInputs[key] = cleaned;
    if (cleaned.length > 0) allBlanksEmpty = false;
  });

  let singleUserInput = '';
  if (currentUserInputs['__BLANK_1__']) {
    singleUserInput = currentUserInputs['__BLANK_1__'];
  } else if (currentUserInputs['#[editable_blank]#']) {
    singleUserInput = currentUserInputs['#[editable_blank]#'];
  } else if (template.includes('__BLANK_1__')) {
    const parts = template.split('__BLANK_1__');
    if (parts.length === 2 && userCode.startsWith(parts[0]) && userCode.endsWith(parts[1])) {
      singleUserInput = userCode.substring(parts[0].length, userCode.length - parts[1].length).trim();
    }
  } else if (spans[0]) {
    const raw = spans[0].textContent || '';
    singleUserInput = raw.replace(/[\u00A0\u200B\u200C\u200D]/g, '').trim();
  }

  const isWeb = String(state.problemJSON.type || '').toLowerCase() === 'web';
  const lang = String(state.problemJSON.language || '').toLowerCase();
  let outputText = '[실행 중...] 일치하는 결과 시나리오를 찾고 있습니다...';
  let renderedHtml = '';
  let foundMatch = false;
  let isCorrect = false;
  const normalizeCode = (s) => String(s ?? '').replace(/["'`]/g, '').replace(/\s+/g, ' ').trim();

  if (isWeb) {
    dom.outputIframe.classList.remove('hidden');
    dom.outputContainer.classList.add('hidden');
    renderedHtml = userCode.trim();
    if (!/^<!DOCTYPE html>/i.test(renderedHtml)) {
      renderedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${renderedHtml}</body></html>`;
    }
    dom.outputIframe.srcdoc = renderedHtml.replace(/<\/script>/gi, '<\\/script>') + `\n<!-- run:${runId} -->`;
    foundMatch = true;
  } else if (lang === 'python') {
    try {
      const jr = await runPython(userCode);
      if (isStale()) return;
      const out = (jr.stdout || '').trim();
      const err = (jr.stderr || '').trim();
      outputText = [out, err].filter(Boolean).join('\n') || '(출력 없음)';
      foundMatch = true;
      const solNorm = normalizeCode(state.problemJSON.solution || '');
      const userNorm = normalizeCode(singleUserInput);
      if (solNorm && userNorm && solNorm === userNorm) {
        isCorrect = true;
      }
    } catch (e) {
      console.warn('로컬 실행 실패', e);
    }
  }

  if (!foundMatch) {
    try {
      const sim = await simulate(state.problemJSON, userCode);
      if (isStale()) return;
      if (typeof sim === 'object') {
        if (sim.rendered_html) {
          renderedHtml = String(sim.rendered_html).replace(/\n/g, '\n');
          foundMatch = true;
        }
        if (typeof sim.output === 'string' && sim.output.length > 0) {
          outputText = sim.output;
          foundMatch = true;
        }
        if (!foundMatch && sim.feedback) {
          outputText = String(sim.feedback);
          foundMatch = true;
        }
        if (typeof sim.is_correct === 'boolean') {
          isCorrect = !!sim.is_correct;
        }
        if (sim.feedback) {
          addChatMessage('ai', sim.feedback);
          state.chatHistory.push({ role: 'ai', content: sim.feedback });
        }
      }
    } catch (e) {
      console.warn('AI 시뮬레이션 실패', e);
    }
  }

  const scenarios = Array.isArray(state.problemJSON.simulated_outputs) ? state.problemJSON.simulated_outputs : [];
  for (const scenario of scenarios) {
    const inputObj = scenario.input;
    const inputPattern = scenario.input_pattern;

    if (inputObj && typeof inputObj === 'object') {
      const isMatch = Object.keys(inputObj).every((blankId) => {
        const expected = normalizeCode(inputObj[blankId]);
        const actual = normalizeCode(currentUserInputs[blankId]);
        return expected === actual;
      });
      if (isMatch) {
        if (isWeb && scenario.rendered_html) {
          renderedHtml = String(scenario.rendered_html).replace(/\\n/g, '\n');
        } else if (scenario.output) {
          outputText = String(scenario.output);
        }
        foundMatch = true;
  const solNorm = normalizeCode(state.problemJSON.solution || '');
  const userNorm = normalizeCode(currentUserInputs['__BLANK_1__']);
        if (solNorm && userNorm && solNorm === userNorm) isCorrect = true;
        break;
      }
    } else if (typeof inputPattern === 'string') {
      if (normalizeCode(singleUserInput) === normalizeCode(inputPattern)) {
        if (isWeb && scenario.rendered_html) {
          renderedHtml = String(scenario.rendered_html).replace(/\\n/g, '\n');
        } else if (scenario.output) {
          outputText = String(scenario.output);
        }
        foundMatch = true;
  const solNorm = normalizeCode(state.problemJSON.solution || '');
  if (solNorm && normalizeCode(singleUserInput) === solNorm) isCorrect = true;
        break;
      }
    }
  }

  if (!foundMatch && !isWeb) {
    const normalize = (s) => String(s).replace(/["'`]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const nUser = normalize(singleUserInput);
    for (const scenario of scenarios) {
      const nSc = normalize((scenario.input?.['__BLANK_1__'] ?? ''));
      if (nUser && nUser === nSc) {
        outputText = String(scenario.output ?? outputText);
        foundMatch = true;
        break;
      }
    }
  }

  if (!foundMatch && (allBlanksEmpty || singleUserInput === '')) {
    const emptyScenario = scenarios.find((s) => {
      if (s.input && typeof s.input === 'object') {
        return Object.values(s.input).every((v) => String(v).trim() === '');
      }
      const sp = (s.input?.['__BLANK_1__'] ?? s.input_pattern ?? '').trim();
      return sp === '';
    });
    if (emptyScenario) {
      if (isWeb && emptyScenario.rendered_html) {
        renderedHtml = String(emptyScenario.rendered_html).replace(/\\n/g, '\n');
      } else if (emptyScenario.output) {
        outputText = String(emptyScenario.output);
      }
      foundMatch = true;
    }
  }

  if (!foundMatch && !isWeb) {
    try {
      const v = await validate(state.problemJSON, userCode);
      if (v.is_correct) {
        isCorrect = true;
        foundMatch = true;
        outputText = v.message || '구조적으로 올바른 코드입니다!';
      } else if (v.message) {
        outputText = `${outputText}\n\n[구조 검증] ${v.message}`;
      }
    } catch (e) {
      console.warn('구조 검증 호출 실패', e);
    }
  }

  if (isStale()) return;
  dom.resultModal.classList.remove('hidden');
  dom.resultModal.classList.add('flex');

  if (isWeb) {
    dom.outputIframe.classList.remove('hidden');
    dom.outputContainer.classList.add('hidden');
    if (!renderedHtml) {
      renderedHtml = `<!DOCTYPE html><html><head><style>body{font-family:sans-serif;margin:16px;color:#f87171}</style></head><body><h2>일치하는 시나리오가 없습니다.</h2><p>입력하신 코드에 대한 가상 실행 결과가 정의되지 않았습니다. 다른 방식으로 코드를 작성하거나 튜터에게 질문해보세요.</p></body></html>`;
    }
    dom.outputIframe.srcdoc = renderedHtml + `\n<!-- run:${runId} -->`;
  } else {
    dom.outputIframe.classList.add('hidden');
    dom.outputContainer.classList.remove('hidden');
    dom.outputContainer.classList.add('terminal-output');
    if (!foundMatch) {
      outputText = `<span class="error">입력한 코드로는 예상한 결과를 얻을 수 없습니다.</span>\n\n// 혹시 오타가 있나요? 변수 이름을 확인해보세요.\n// 로직이 문제의 요구사항과 맞는지 다시 검토해보세요.`;
    }
    // 터미널 형식 하이라이트
    const highlightedOutput = String(outputText)
      .replace(/(user@linux:~\$)/g, '<span class="prompt">$1</span>')
      .replace(/(\/[\w\-\.]+(?:\/[\w\-\.]+)*)/g, '<span class="path">$1</span>')
      .replace(/(Traceback|Error|Exception|failed)/gi, '<span class="error">$1</span>');
    dom.outputContainer.innerHTML = highlightedOutput;
  }

  try {
    const data = await feedback(state.problemJSON, userCode, isWeb ? '[렌더링됨]' : outputText, isWeb ? dom.outputIframe.srcdoc : undefined);
    if (data?.feedback) {
      addChatMessageWithTyping(data.feedback);
      state.chatHistory.push({ role: 'ai', content: data.feedback });
    }
  } catch (e) {
    console.warn('피드백 요청 실패', e);
  }

  // [변경] 정답 시: '축하 + 다음 설명' 통합 API 호출로 자연스러운 자동 진행
  try {
    if (isCorrect) {
      const steps = Array.isArray(state.currentCurriculum?.curriculum) ? state.currentCurriculum.curriculum : [];
      if (!steps.length) return;

      // 정답 시 진척도 저장 (기존 로직 유지)
      try {
        const userId = localStorage.getItem('coding_tutor_user_id');
        if (userId != null) {
          const { saveProgress } = await import('./api.js');
          await saveProgress(userId, state.currentStepIndex);
        }
      } catch {}

      if (state.currentStepIndex + 1 < steps.length) {
        state.currentStepIndex += 1;
        const nextInfo = steps[state.currentStepIndex];
        try {
          // 통합 API 호출로 축하 + 다음 설명을 한 번에 출력
          const resp = await nextStep(state.problemJSON, nextInfo);
          if (resp?.answer) addChatMessageWithTyping(resp.answer);
          else addChatMessageWithTyping(`정답입니다! 다음 단계 '${nextInfo?.title ?? ''}'를 이어갈게요.`);
        } catch (e) {
          console.warn('다음 단계 안내 호출 실패', e);
          // 폴백: 기존 이벤트 기반 흐름 유지
          addChatMessageWithTyping('정답입니다! 다음 단계 설명을 이어갈게요.');
          const evt = new CustomEvent('app:next-step-explanation');
          window.dispatchEvent(evt);
        }
      } else {
        addChatMessageWithTyping('축하합니다! 준비된 커리큘럼을 모두 완료했어요. 다른 주제를 원하시면 [새 주제]를 눌러주세요.');
      }
    }
  } catch (e) {
    console.warn('다음 단계 자동 진행 중 문제 발생', e);
  }
}

// [신규] 채점 디바운싱을 위한 타이머
let gradeDebounceTimer = null;
const GRADE_COOLDOWN_MS = 3000;  // 3초 쿨다운

// [신규] 테스트케이스 기반 채점 및 결과 렌더링
export async function handleRunAndGrade() {
  if (!state.problemJSON || state.isAwaitingResponse) return;
  
  // [신규] 디바운싱: 3초 이내 중복 호출 방지
  if (gradeDebounceTimer) {
    console.warn('[RUNNER] 채점 쿨다운 중입니다. 잠시 후 다시 시도해주세요.');
    return;
  }
  
  gradeDebounceTimer = setTimeout(() => {
    gradeDebounceTimer = null;
  }, GRADE_COOLDOWN_MS);

  const userCode = getCurrentCode();
  // 모달 초기화: 실행 테스트는 제외, 표시용 결과만 렌더링
  try {
    dom.resultModal.classList.remove('hidden');
    dom.resultModal.classList.add('flex');
    const testBox = document.getElementById('test-results-container');
    if (testBox) {
      // 실행 테스트 UI는 숨김 처리 (요청 사항: 실행 제외)
      testBox.classList.add('hidden');
      testBox.innerHTML = '';
    }
    // 출력 컨테이너 초기화 (로딩 표시 → 결과 렌더 후 전환)
    dom.outputIframe.classList.add('hidden');
    dom.outputContainer.classList.remove('hidden');
    dom.outputContainer.classList.add('terminal-output');
    dom.outputContainer.innerHTML = '<div class="flex items-center gap-2 text-slate-300"><i class="fas fa-spinner fa-spin"></i><span>결과를 준비 중입니다...</span></div>';
  } catch {}

  try {
    const response = await gradeCode(state.problemJSON, userCode);
    const aiJudgment = response?.ai_judgment;
    const display = response?.display || {};

    // 1) 모달에는 표시용 결과만 렌더링 (정답: 정답 화면, 오답: 오류 화면)
    const isWebDisplay = String(display.type || '').toLowerCase() === 'web';
    const lang = (state.problemJSON?.language || '').toLowerCase();
    const isHtmlCode = ['html', 'css'].includes(lang) || String(state.problemJSON?.type || '').toLowerCase() === 'web';
    
    if (isWebDisplay && display.rendered_html) {
      // 백엔드에서 렌더링된 HTML을 받은 경우
      dom.outputIframe.srcdoc = String(display.rendered_html);
      dom.outputContainer.classList.add('hidden');
      dom.outputIframe.classList.remove('hidden');
    } else if (isHtmlCode) {
      // [신규] HTML 코드는 프론트엔드에서 직접 렌더링
      // 사용자가 작성한 HTML 코드를 그대로 iframe에 표시
      dom.outputIframe.srcdoc = userCode;
      dom.outputContainer.classList.add('hidden');
      dom.outputIframe.classList.remove('hidden');
    } else if (display.output) {
      dom.outputContainer.classList.add('terminal-output');
      const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      // [개선] 터미널 스타일 출력 - 라인별로 구분하여 표시
      const outputLines = String(display.output).split('\n');
      const formattedOutput = outputLines.map((line, idx) => {
        // 입력 프롬프트 라인 강조
        if (line.includes('입력') || line.includes(':')) {
          return `<div class="output-line"><span class="prompt-text">${esc(line)}</span></div>`;
        }
        return `<div class="output-line">${esc(line)}</div>`;
      }).join('');
      dom.outputContainer.innerHTML = `
        <div class="terminal-header">
          <span class="terminal-dot red"></span>
          <span class="terminal-dot yellow"></span>
          <span class="terminal-dot green"></span>
          <span class="terminal-title">실행 결과</span>
        </div>
        <div class="terminal-body">${formattedOutput || '<span class="text-slate-500">(출력 없음)</span>'}</div>
      `;
      dom.outputIframe.classList.add('hidden');
      dom.outputContainer.classList.remove('hidden');
    } else {
      // 폴백 메시지
      dom.outputContainer.innerHTML = '<div class="text-slate-300 p-4">표시할 결과가 없습니다.</div>';
      dom.outputIframe.classList.add('hidden');
      dom.outputContainer.classList.remove('hidden');
    }

    // 2) 채팅창에는 AI의 논리 평가 피드백을 출력
    // 🌟 루나 페르소나 반응 + AI 피드백 (중복 방지를 위해 하나로 합침)
    const { setTutorExpression, TUTOR } = window.TutorPersona || {};
    
    if (aiJudgment?.is_correct) {
      // 정답 반응: 짧은 감정 + AI 상세 피드백
      if (setTutorExpression) setTutorExpression('proud');
      const emotionMsg = TUTOR?.messages?.codeSuccess?.() || '정답!';
      const feedback = aiJudgment?.feedback || '';
      // 하나의 메시지로 합쳐서 출력 - 타이핑 효과 적용
      addChatMessageWithTyping(feedback ? `${emotionMsg}\n\n${feedback}` : emotionMsg);
      // 표정 유지 - 다음 상호작용까지 proud 상태 유지
      
      // [신규] XP 보상 처리 - 중복 방지: 이 문제에서 이미 XP를 받았으면 스킵
      if (response?.reward && !state.currentProblemXpAwarded) {
        handleReward(response.reward);
        state.currentProblemXpAwarded = true;  // 이 문제에서 XP 획득 완료 표시
      }
    } else {
      // 오답 반응: 짧은 격려 + AI 상세 피드백
      if (setTutorExpression) setTutorExpression('encouraging');
      const emotionMsg = TUTOR?.messages?.codeFail?.() || '다시 해봐요!';
      const feedback = aiJudgment?.feedback || '';
      addChatMessageWithTyping(feedback ? `${emotionMsg}\n\n${feedback}` : emotionMsg);
      // 표정 유지 - 다음 상호작용까지 encouraging 상태 유지
    }

    // 3) 자동 진행 방지: 정답이어도 즉시 단계 전환하지 않고, 사용자에게 의사를 묻습니다
    if (aiJudgment?.is_correct) {
      try { state.pendingNextStepOffer = true; } catch {}
      showChoiceMenu();
    }
  } catch (e) {
    console.warn('채점 호출 실패', e);
    
    // [신규] 에러 처리 - 세련된 메시지
    const errorMsg = e?.message || e?.toString() || '';
    let userMessage = '채점 서버가 일시적으로 바쁜 것 같아요. 잠시 후 다시 시도해 주세요! 💪';
    
    if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate')) {
      userMessage = '⏰ 앗, 채점 요청이 조금 많았네요!\n\n' +
                    '**잠깐 쉬었다가** 다시 시도해주세요~ 😊\n' +
                    '(약 30초~1분 정도면 충분해요!)';
    }
    
    const testBox = document.getElementById('test-results-container');
    if (testBox) testBox.innerHTML = '<div class="text-red-400">채점 중 오류가 발생했습니다.</div>';
    addChatMessage('ai', userMessage);
  }
}

// [신규] 테스트케이스 결과 렌더링 유틸리티
function renderTestResults(result) {
  const container = document.getElementById('test-results-container');
  if (!container) return;
  const list = Array.isArray(result?.test_results) ? result.test_results : [];
  // helper를 먼저 선언하여 TDZ(Temporal Dead Zone) 오류 방지
  const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const evaluationHint = state.problemJSON?.evaluation_hint;
  const hintHTML = evaluationHint
    ? `<div class="mb-4 p-3 bg-slate-700/50 rounded-md text-sm border-l-4 border-sky-400">💡 <strong>채점 안내:</strong> ${esc(evaluationHint)}</div>`
    : '';
  if (!list.length) {
    container.innerHTML = hintHTML + (result?.feedback || '표시할 테스트 결과가 없습니다.');
    return;
  }
  const overall = result.is_correct
    ? '<h4 class="text-lg font-bold text-green-400 mb-3">✅ 모든 테스트 통과!</h4>'
    : '<h4 class="text-lg font-bold text-red-400 mb-3">❌ 일부 테스트 실패</h4>';

  const items = list.map((res) => `
    <div class="test-case">
      <div class="test-case-header">
        <span>${esc(res.description)}</span>
        ${res.is_pass ? '<span class="test-pass">통과</span>' : '<span class="test-fail">실패</span>'}
      </div>
      ${res.is_pass ? '' : `
      <div class="test-case-body">
        ${Array.isArray(res.inputs) && res.inputs.length ? `
        <div><strong>입력값:</strong></div>
        <pre>${esc(res.inputs.join('\n'))}</pre>
        ` : ''}
        <div><strong>예상 결과 (공백/대소문자 무시):</strong></div>
        <pre>${esc(res.expected)}</pre>
        <div><strong>실제 결과:</strong></div>
        <pre class="text-red-400">${esc(res.actual)}</pre>
      </div>
      `}
    </div>
  `).join('');

  container.innerHTML = hintHTML + overall + items;
}
