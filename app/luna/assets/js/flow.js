import { state, dom } from './state.js';
import { addChatMessage, addChatMessageWithTyping, displayCodingView, setLoading, showStepOptions, renderSidebarCurriculum, createStreamingMessage, renderRoadmapPreview, setChatInputLocked, showLearningTypeSelector, showGenerationConfirmButtons } from './ui.js';
import { fetchCurriculum, fetchLessonExplanation, chatWithTutor, chatWithTutorStream, requestProblem } from './api.js';
import { renderEditor, getCurrentCode } from './editor.js';
import { startLesson, handleSidebarStepClick } from './lesson.js';
// [신규] 효과음 모듈 import
import { SFX } from './sound.js';
// [신규] API 설정 import - postAIGeneration으로 120초 타임아웃 적용
import { postJSON, postAIGeneration, getJSON } from './config.js';

// [신규] HTML 이스케이프 유틸 - XSS 방지 및 태그 렌더링 방지
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// [신규] 커리어 목표 키워드 패턴
const CAREER_GOAL_PATTERNS = [
  /되고\s*싶어|되려면|개발자|엔지니어|디자이너|기획자|분석가/i,
  /로드맵|커리어|경력|취업|전환|career|roadmap/i,
  /장기\s*계획|장기\s*학습|마스터|전문가/i,
  /풀스택|프론트엔드|백엔드|데이터|AI|머신러닝|클라우드/i
];

/**
 * 사용자 입력이 커리어 목표(장기 로드맵 생성 요청)인지 판단
 */
function isCareerGoalRequest(text) {
  const t = (text || '').trim();
  // 3개 이상의 패턴이 매치되거나, 명시적 키워드가 있으면 true
  let matchCount = 0;
  for (const pattern of CAREER_GOAL_PATTERNS) {
    if (pattern.test(t)) matchCount++;
  }
  return matchCount >= 1 && t.length > 10; // 최소 길이 조건
}

export function isPositiveResponse(text) {
  const t = (text || '').trim().toLowerCase();
  return ['y', 'yes', '네', '넵', '예', '좋아', '좋아요', '진행', '시작', 'go', 'ok', '오케이'].some((k) => t.includes(k));
}

// ============================================
// [신규] 로드맵/커리큘럼 생성 헬퍼 함수
// ============================================

/**
 * 로드맵을 생성하고 카드 내 버튼으로 확인/재생성을 처리합니다.
 */
async function generateRoadmap(goal) {
  try {
    const roadmap = await postAIGeneration('/roadmap/generate', { goal });
    
    // 🌟 루나 페르소나 반응
    const { setTutorExpression, TUTOR } = window.TutorPersona || {};
    if (setTutorExpression) setTutorExpression('happy');
    
    // 성공 메시지
    const successMsg = TUTOR?.messages?.roadmapCreated?.() || 
      `✨ 멋져요! **"${escapeHtml(state.intendedTopic)}"**를 위한 커리어 로드맵을 완성했어요!\n\n카드의 버튼을 눌러 진행해주세요~`;
    addChatMessage('ai', successMsg);
    
    // [수정] 로드맵 프리뷰 카드 렌더링 - 콜백 포함
    renderRoadmapPreview(roadmap, {
      // 시작하기 버튼 클릭 시
      onConfirm: () => {
        setChatInputLocked(false);
        state.isRoadmapMode = true;
        state.appState = 'ROADMAP_PREVIEW';
      },
      // 재생성 버튼 클릭 시
      onRegenerate: () => {
        addChatMessage('ai', '어떤 방향으로 수정하면 좋을까요? 🤔\n\n예시:\n- "백엔드보다는 프론트엔드 위주로"\n- "실무 프로젝트를 더 많이 넣어줘"\n- "6개월 안에 완료할 수 있게"');
        state.pendingRegenerateType = 'roadmap';
        state.appState = 'AWAITING_REGENERATE_INPUT';
        setChatInputLocked(false);
      }
    });
    
    // 채팅 입력 잠금 (카드 버튼으로 진행)
    setChatInputLocked(true, '카드 버튼을 눌러주세요');
    state.appState = 'ROADMAP_GENERATED';
    
  } catch (e) {
    console.error('[Flow] 로드맵 생성 실패:', e);
    setChatInputLocked(false);
    
    const errorMsg = e.message || '알 수 없는 오류';
    addChatMessage('ai', `로드맵 생성 중 문제가 발생했어요 😢\n\n**${errorMsg}**`);
    
    // 재시도 버튼
    const retryContainer = document.createElement('div');
    retryContainer.className = 'flex flex-wrap items-center gap-2 mt-3';
    
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 shadow-lg';
    retryBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 로드맵 다시 생성';
    retryBtn.onclick = async () => {
      retryContainer.remove();
      setLoading(true, '🗺️ AI가 맞춤 커리어 로드맵을 설계하고 있어요...');
      await generateRoadmap(state.intendedTopic);
      setLoading(false);
    };
    
    const fallbackBtn = document.createElement('button');
    fallbackBtn.type = 'button';
    fallbackBtn.className = 'flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200';
    fallbackBtn.innerHTML = '<i class="fas fa-book"></i> 단기 커리큘럼으로 시작';
    fallbackBtn.onclick = async () => {
      retryContainer.remove();
      setLoading(true, '커리큘럼을 생성하고 있어요...');
      await generateCurriculum(state.intendedTopic);
      setLoading(false);
    };
    
    retryContainer.appendChild(retryBtn);
    retryContainer.appendChild(fallbackBtn);
    addChatMessage('ai', retryContainer);
    
    state.appState = 'IDLE';
  } finally {
    setLoading(false);
  }
}

/**
 * 커리큘럼을 생성하고 확인 버튼을 표시합니다.
 */
async function generateCurriculum(topic) {
  try {
    const resp = await fetchCurriculum(topic);
    
    if (resp?.is_broad) {
      // 주제 세분화 단계
      const q = resp.clarification_question || '어떤 세부 분야에 관심이 있으신가요?';
      addChatMessage('ai', q);
      
      const options = Array.isArray(resp.suggested_topics) ? resp.suggested_topics : [];
      if (options.length) {
        const wrap = document.createElement('div');
        wrap.className = 'grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 w-full';
        options.forEach((opt) => {
          const isObj = opt && typeof opt === 'object' && !Array.isArray(opt);
          const title = isObj ? (opt.title || '') : String(opt || '');
          const desc = isObj ? (opt.description || '') : '';
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'text-left bg-slate-700 hover:bg-slate-600 py-2 px-3 rounded-md transition-colors';
          btn.dataset.topicTitle = title;
          btn.innerHTML = isObj
            ? `<div class="text-sm font-semibold">${escapeHtml(title)}</div><div class="text-xs text-slate-300 mt-1">${escapeHtml(desc)}</div>`
            : `<div class="text-sm font-semibold">${escapeHtml(title)}</div>`;
          btn.addEventListener('click', async () => {
            addChatMessage('user', title);
            state.intendedTopic = title;
            setLoading(true, '커리큘럼을 생성하고 있어요...');
            await generateCurriculum(title);
            setLoading(false);
          });
          wrap.appendChild(btn);
        });
        addChatMessage('ai', wrap);
      }
      state.appState = 'AWAITING_TOPIC_REFINEMENT';
    } else {
      // [수정] 커리큘럼 생성 완료 - 콜백 포함
      displayCurriculum(resp, {
        // 재생성 버튼 클릭 시
        onRegenerate: () => {
          addChatMessage('ai', '어떤 방향으로 수정하면 좋을까요? 🤔\n\n예시:\n- "좀 더 기초부터 시작했으면 좋겠어"\n- "실습 위주로 구성해줘"\n- "단계를 좀 더 세분화해줘"');
          state.pendingRegenerateType = 'curriculum';
          state.appState = 'AWAITING_REGENERATE_INPUT';
          setChatInputLocked(false);
        }
      });
      
      // 채팅 입력 잠금 (카드 버튼으로 진행)
      setChatInputLocked(true, '학습할 단계를 클릭해주세요');
      state.appState = 'CURRICULUM_GENERATED';
    }
  } catch (e) {
    console.error('[Flow] 커리큘럼 생성 실패:', e);
    setChatInputLocked(false);
    
    const errorMsg = e.message || '알 수 없는 오류';
    addChatMessage('ai', `커리큘럼 생성 중 문제가 발생했어요 😢\n\n**${errorMsg}**`);
    
    // 재시도 버튼
    const retryContainer = document.createElement('div');
    retryContainer.className = 'flex flex-wrap items-center gap-2 mt-3';
    
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 shadow-lg';
    retryBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 커리큘럼 다시 생성';
    retryBtn.onclick = async () => {
      retryContainer.remove();
      setLoading(true, '커리큘럼을 생성하고 있어요...');
      await generateCurriculum(state.intendedTopic);
      setLoading(false);
    };
    
    retryContainer.appendChild(retryBtn);
    addChatMessage('ai', retryContainer);
    
    state.appState = 'IDLE';
  } finally {
    setLoading(false);
  }
}

export async function displayCurriculum(curriculum, callbacks = {}) {
  const { onRegenerate } = callbacks;
  
  try {
    // [수정] AI가 반환한 topic보다, state에 저장된 사용자의 의도(intendedTopic)를 우선합니다.
    const topic = state.intendedTopic || curriculum?.topic || '학습';
    let steps = Array.isArray(curriculum?.curriculum) ? curriculum.curriculum : [];
    
    // [안정화] 단계가 비어있으면 기본 단계 3개 생성하여 버튼 표시 보장
    if (!steps.length) {
      // [수정] '기초 문법' 대신, 요청된 주제(topic)를 사용합니다.
      steps = [
        { step: 1, title: `${topic} - 기본 개념`, description: `${topic}의 핵심 개념을 이해합니다.` },
        { step: 2, title: `${topic} - 주요 기능 활용`, description: `${topic}의 주요 기능을 사용하는 방법을 배웁니다.` },
        { step: 3, title: `${topic} - 간단한 실습`, description: `${topic}을 활용한 간단한 예제를 실습합니다.` },
      ];
      try {
        // state에도 보정된 커리큘럼을 반영 (이후 단계 선택 흐름에 필요)
        state.currentCurriculum = { topic, curriculum: steps };
      } catch {}
    }
    
    // [구조적 개선] 로드맵 모드일 때 서버에서 진행 상태 가져오기
    let completedSteps = null;
    if (state.isRoadmapMode && state.roadmapContext) {
      try {
        const ctx = state.roadmapContext;
        const progressRes = await getJSON(`/roadmap/topic_progress?phase_index=${ctx.pIdx}&topic_index=${ctx.tIdx}`);
        if (progressRes.curriculum_progress?.steps) {
          completedSteps = progressRes.curriculum_progress.steps;
          // state에 캐싱
          state.curriculumProgress = completedSteps;
          console.log('[Curriculum] 서버에서 진행 상태 로드:', completedSteps);
        }
      } catch (e) {
        console.warn('[Curriculum] 진행 상태 로드 실패:', e);
      }
    }
    
    // [신규] ★ 사이드바에 커리큘럼 렌더링 호출! + 클릭 핸들러 연결 + 완료 상태
    renderSidebarCurriculum(state.currentCurriculum || { topic, curriculum: steps }, -1, handleSidebarStepClick, completedSteps);
    
    // [구조적 개선] 로드맵 모드일 때 total_steps를 서버에 저장
    if (state.isRoadmapMode && state.roadmapContext && steps.length > 0) {
      try {
        const ctx = state.roadmapContext;
        await postJSON('/roadmap/set_total_steps', {
          phase_index: ctx.pIdx,
          topic_index: ctx.tIdx,
          total_steps: steps.length
        });
        console.log('[Curriculum] total_steps 설정:', steps.length);
      } catch (e) {
        console.warn('[Curriculum] total_steps 설정 실패:', e);
      }
    }
    
    // 🌟 루나 페르소나 반응 - teaching 상태 유지
    const { setTutorExpression, TUTOR } = window.TutorPersona || {};
    if (setTutorExpression) setTutorExpression('teaching');
    
    // [Magic or Nothing] 세련된 커리큘럼 카드 UI
    const cardContainer = document.createElement('div');
    cardContainer.className = 'w-full max-w-lg';
    
    // 메인 카드
    const card = document.createElement('div');
    card.className = 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl';
    
    // 카드 헤더
    const header = document.createElement('div');
    header.className = 'bg-gradient-to-r from-cyan-600/20 to-blue-600/20 px-5 py-4 border-b border-slate-700/50';
    header.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
          <i class="fas fa-book-open text-white text-lg"></i>
        </div>
        <div>
          <h3 class="text-lg font-bold text-white">${topic}</h3>
          <p class="text-xs text-slate-400">${steps.length}개의 학습 단계</p>
        </div>
      </div>
    `;
    card.appendChild(header);
    
    // 단계 리스트
    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'p-4 space-y-2';
    
    steps.forEach((s, idx) => {
      const n = s?.step ?? (idx + 1);
      const title = escapeHtml(s?.title || `단계 ${n}`);
      const desc = escapeHtml(s?.description || '');
      
      const stepBtn = document.createElement('button');
      stepBtn.type = 'button';
      stepBtn.dataset.stepIndex = String(idx);
      stepBtn.className = 'w-full group flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 hover:bg-slate-700/70 border border-transparent hover:border-cyan-500/30 transition-all duration-200 text-left';
      stepBtn.innerHTML = `
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:from-cyan-500/40 group-hover:to-blue-500/40 transition-colors">
          <span class="text-cyan-400 font-bold text-sm">${n}</span>
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">${title}</h4>
          <p class="text-xs text-slate-400 mt-0.5 line-clamp-2">${desc}</p>
        </div>
        <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <i class="fas fa-play text-cyan-400 text-xs"></i>
        </div>
      `;
      stepBtn.title = s?.description || '';  // tooltip은 원본 유지
      stepBtn.addEventListener('click', handleCurriculumStepClick);
      stepsContainer.appendChild(stepBtn);
    });
    
    card.appendChild(stepsContainer);
    
    // [수정] 카드 푸터 - 재생성 버튼 포함
    const footer = document.createElement('div');
    footer.className = 'px-4 py-3 bg-slate-800/30 border-t border-slate-700/30';
    
    // 재생성 콜백이 있으면 버튼 표시
    if (onRegenerate) {
      footer.innerHTML = `
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs text-slate-400 flex-1">
            <i class="fas fa-info-circle mr-1"></i>
            원하는 단계를 클릭하면 학습 시작!
          </p>
          <button class="btn-regenerate-curriculum flex items-center gap-1.5 bg-slate-700 hover:bg-amber-600/80 text-slate-300 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all border border-slate-600 hover:border-amber-500/50">
            <i class="fas fa-sync-alt text-[10px]"></i>
            재생성
          </button>
        </div>
      `;
    } else {
      footer.innerHTML = `
        <p class="text-xs text-slate-400 text-center">
          <i class="fas fa-info-circle mr-1"></i>
          원하는 단계를 클릭하면 바로 학습이 시작돼요!
        </p>
      `;
    }
    card.appendChild(footer);
    
    // 재생성 버튼 이벤트 바인딩
    const regenerateBtn = card.querySelector('.btn-regenerate-curriculum');
    if (regenerateBtn && onRegenerate) {
      regenerateBtn.onclick = () => {
        // 버튼 비활성화
        card.querySelectorAll('button').forEach(btn => btn.disabled = true);
        onRegenerate();
      };
    }
    
    cardContainer.appendChild(card);
    
    // 채팅 메시지로 추가
    const headerMsg = TUTOR?.messages?.curriculumReady?.(topic) || 
      `짜잔! ✨ **"${topic}"** 커리큘럼을 준비했어요! 학습할 단계를 선택해 주세요~`;
    addChatMessageWithTyping(headerMsg);
    addChatMessage('ai', cardContainer);
    
    state.appState = 'CURRICULUM_CHOICE';
  } catch (e) {
    console.error('[displayCurriculum] 에러:', e);
    addChatMessage('ai', '커리큘럼을 표시하는 중 문제가 발생했습니다.');
  }
}

async function handleCurriculumStepClick(event) {
  const target = event.currentTarget;
  const idx = parseInt(target?.dataset?.stepIndex ?? '-1', 10);
  if (Number.isNaN(idx) || idx < 0) return;
  state.currentStepIndex = idx;
  
  // 🎵 레슨 시작 효과음
  SFX.start();
  
  // [신규] 사이드바 갱신 (활성 단계 표시) + 클릭 핸들러 연결 + 완료 상태 포함
  renderSidebarCurriculum(state.currentCurriculum, state.currentStepIndex, handleSidebarStepClick, state.curriculumProgress);
  
  // 🌟 루나 페르소나 반응 - teaching 상태 유지
  const { setTutorExpression, TUTOR } = window.TutorPersona || {};
  const step = (state.currentCurriculum?.curriculum || [])[idx];
  const lessonTitle = step?.title || '선택한 단계';
  
  if (setTutorExpression) setTutorExpression('teaching');
  const message = TUTOR?.messages?.lessonStart?.(lessonTitle) || `"${lessonTitle}" 단계를 선택하셨군요! 수업을 시작할게요.`;
  // 타이핑 효과 적용 (비동기)
  addChatMessageWithTyping(message);
  
  const topic = state.intendedTopic || state.currentCurriculum?.topic || '코딩';
  // 바로 레슨 시작
  startLesson(topic, step?.title || '핵심 개념');
}

export async function handleChatSubmit(event) {
  event.preventDefault();
  const userInput = dom.chatInput.value.trim();
  if (!userInput || state.isAwaitingResponse) return;
  
  // [신규] 채팅 입력이 잠겨있으면 무시 (버튼 선택 대기 중)
  if (state.chatInputLocked) {
    addChatMessage('ai', '위의 버튼을 선택해주세요! 💡');
    dom.chatInput.value = '';
    return;
  }

  addChatMessage('user', userInput);
  state.chatHistory.push({ role: 'user', content: userInput });
  dom.chatInput.value = '';

  setLoading(true, 'AI 튜터가 생각 중입니다...');
  try {
    // [신규] 정답 후 다음 단계 제안 대기 상태 처리
    if (state.pendingNextStepOffer) {
      if (isPositiveResponse(userInput) || /(다음\s*단계|next\s*step|다음으로)/i.test(userInput)) {
        state.pendingNextStepOffer = false;
        await goToNextStepExplanation();
        return;
      } else {
        state.pendingNextStepOffer = false;
        // 사용자가 질문을 입력한 경우 일반 문제 대화 흐름으로 처리되도록 계속 진행
      }
    }
    
    // [신규] 다시 생성 시 방향 입력 대기 상태 처리
    if (state.appState === 'AWAITING_REGENERATE_INPUT') {
      const regenerateType = state.pendingRegenerateType;
      state.pendingRegenerateType = null;
      
      // 채팅 입력 해제
      setChatInputLocked(false);
      
      if (regenerateType === 'roadmap') {
        // 사용자 피드백을 반영하여 로드맵 재생성
        const originalTopic = state.intendedTopic || '';
        const modifiedGoal = `${originalTopic} (수정 요청: ${userInput})`;
        
        setLoading(true, '🗺️ 수정된 방향으로 로드맵을 다시 설계하고 있어요...');
        await generateRoadmap(modifiedGoal);
      } else {
        // 커리큘럼 재생성
        const originalTopic = state.intendedTopic || '';
        const modifiedTopic = `${originalTopic} (수정 요청: ${userInput})`;
        
        setLoading(true, '📚 수정된 방향으로 커리큘럼을 다시 생성하고 있어요...');
        await generateCurriculum(modifiedTopic);
      }
      return;
    }
    
    if (state.appState === 'IDLE') {
      // [수정] 새 주제 입력 시 학습 유형 선택 버튼 먼저 표시
      // 로드맵 모드에서 토픽 학습 시작 시에는 바로 커리큘럼 생성
      if (state.isRoadmapMode) {
        // 로드맵 모드에서는 바로 단기 커리큘럼 생성
        state.intendedTopic = userInput;
        setLoading(true, '커리큘럼을 생성하고 있어요...');
        await generateCurriculum(userInput);
      } else {
        // [신규] 학습 유형 선택 버튼 표시
        state.intendedTopic = userInput;
        setLoading(false);
        
        // 🌟 루나 페르소나 반응
        const { setTutorExpression, TUTOR } = window.TutorPersona || {};
        if (setTutorExpression) setTutorExpression('teaching');
        
        const introMsg = TUTOR?.messages?.askLearningType?.() || 
          `좋은 주제예요! ✨ **"${escapeHtml(userInput)}"**을(를) 어떻게 학습하고 싶으신가요?`;
        addChatMessage('ai', introMsg);
        
        // 채팅 입력 잠금
        setChatInputLocked(true, '학습 유형을 선택해주세요');
        
        // 학습 유형 선택 버튼 표시
        showLearningTypeSelector(
          userInput,
          // 로드맵 선택
          async () => {
            setChatInputLocked(false);
            setLoading(true, '🗺️ AI가 맞춤 커리어 로드맵을 설계하고 있어요...');
            await generateRoadmap(userInput);
          },
          // 커리큘럼 선택
          async () => {
            setChatInputLocked(false);
            setLoading(true, '📚 커리큘럼을 생성하고 있어요...');
            await generateCurriculum(userInput);
          }
        );
        
        state.appState = 'AWAITING_LEARNING_TYPE';
      }
    } else if (state.appState === 'AWAITING_LEARNING_TYPE') {
      // 학습 유형 선택 대기 중 - 채팅 입력 차단
      setLoading(false);
      addChatMessage('ai', '위의 버튼에서 학습 유형을 선택해주세요! 💡\n\n🗺️ **장기 로드맵**: 체계적인 커리어 성장 경로\n📚 **단기 커리큘럼**: 빠르게 핵심만 학습');
    } else if (state.appState === 'ROADMAP_GENERATED' || state.appState === 'CURRICULUM_GENERATED') {
      // [신규] 생성 완료 확인 대기 중 - 채팅 입력 차단
      setLoading(false);
      addChatMessage('ai', '위의 버튼을 눌러 진행 방향을 선택해주세요! 💡\n\n✅ **이대로 진행**: 생성된 내용으로 학습 시작\n🔄 **다시 생성**: 다른 방향으로 새로 만들기');
    } else if (state.appState === 'AWAITING_TOPIC_REFINEMENT') {
      // 사용자가 자유 입력으로 세부 주제를 답한 경우
      state.intendedTopic = userInput; // [추가] 사용자가 선택한 세부 주제로 의도 갱신
      setLoading(true, '커리큘럼을 생성하고 있어요...');
      const next = await fetchCurriculum(userInput);
      displayCurriculum(next);
      state.appState = 'CURRICULUM_PROPOSED';
    } else if (state.appState === 'CURRICULUM_PROPOSED') {
      if (isPositiveResponse(userInput)) {
        state.currentStepIndex = 0;
        const currentStep = (state.currentCurriculum?.curriculum || [])[state.currentStepIndex] || {};
        
        // 🌟 루나 페르소나 반응 - teaching 상태 유지
        const { setTutorExpression, TUTOR } = window.TutorPersona || {};
        if (setTutorExpression) setTutorExpression('teaching');
        const msg = TUTOR?.messages?.lessonStart?.(currentStep.title || '기초') || 
          `좋습니다! 그럼 첫 번째 단계인 "${currentStep.title || '기초'}"에 대해 자세히 알아볼게요.`;
        await addChatMessageWithTyping(msg);
        
        setLoading(true, 'AI 튜터가 강의를 준비 중입니다...');
        const explanation = await fetchLessonExplanation();
        setLoading(false);
        await addChatMessageWithTyping(explanation);
        await addChatMessageWithTyping('이제 설명해 드린 내용으로 간단한 예제를 풀어볼까요? (네/좋아요)');
        state.appState = 'LESSON_EXPLAINED';
      } else {
        addChatMessage('ai', '알겠습니다. 다른 주제로 다시 시작하려면 상단의 [새 주제]를 눌러주세요.');
        window.App?.UI?.resetApp?.(false);
      }
    } else if (state.appState === 'CONCEPT_VIEW') {
      // '개념 학습' 상태에서는 '네'/'아니오'를 확인하지 않고
      // 모든 사용자 입력을 AI 질문으로 처리합니다.
      // (다음 단계로의 이동은 '다음 ->' 버튼이 담당합니다.)
      await handleInProblemChat(userInput);
    } else if (state.appState === 'PROBLEM_SOLVING') {
      await handleInProblemChat(userInput);
    } else if (state.appState === 'LESSON_EXPLAINED') {
      // 레슨 설명 후 상태 - '네'라고 하면 문제로, 아니면 자유 질문
      if (isPositiveResponse(userInput)) {
        await goToCurrentStepProblem();
      } else {
        await handleInProblemChat(userInput);
      }
    } else {
      // 기타 상태 (단원 완료, CURRICULUM_CHOICE 등): 자유 대화로 처리
      // 학습 중이거나 커리큘럼이 있으면 AI와 대화 가능
      const hasContext = state.currentLessonPlan || state.problemJSON || state.currentCurriculum;
      if (hasContext) {
        await handleInProblemChat(userInput);
      } else {
        // 아무 컨텍스트도 없고 IDLE도 아닌 경우 → IDLE로 전환하여 새 주제 생성
        state.appState = 'IDLE';
        state.intendedTopic = userInput;
        setLoading(true, '커리큘럼을 생성하고 있어요...');
        const resp = await fetchCurriculum(userInput);
        if (resp?.is_broad) {
          const q = resp.clarification_question || '어떤 세부 분야에 관심이 있으신가요?';
          addChatMessage('ai', q);
          state.appState = 'AWAITING_TOPIC_REFINEMENT';
        } else {
          displayCurriculum(resp);
          state.appState = 'CURRICULUM_PROPOSED';
        }
      }
    }
  } catch (error) {
    console.error('[Flow] 에러 발생:', error);
    
    // 🌟 루나 페르소나 반응 (오류 시) - encouraging 상태 유지
    const { setTutorExpression } = window.TutorPersona || {};
    if (setTutorExpression) setTutorExpression('encouraging');
    
    // [Magic or Nothing] AI 생성 실패 시 재시도 버튼 표시
    const errorMsg = error.message || '알 수 없는 오류가 발생했어요.';
    const isAIError = errorMsg.includes('생성') || errorMsg.includes('실패') || errorMsg.includes('다시 시도');
    
    if (isAIError && state.intendedTopic) {
      // 재시도 버튼이 포함된 에러 메시지
      addChatMessage('ai', `앗, "${state.intendedTopic}" 관련 내용을 준비하는 중에 문제가 생겼어요 😢\n\n**${errorMsg}**`);
      
      // 재시도 버튼 생성
      const retryContainer = document.createElement('div');
      retryContainer.className = 'flex items-center gap-2 mt-3';
      
      const retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 shadow-lg hover:shadow-cyan-500/25 hover:scale-105';
      retryBtn.innerHTML = '<i class="fas fa-sync-alt"></i> 다시 시도하기';
      retryBtn.onclick = async () => {
        retryContainer.remove();
        setLoading(true, '다시 시도하고 있어요...');
        try {
          const resp = await fetchCurriculum(state.intendedTopic);
          if (resp?.is_broad) {
            const q = resp.clarification_question || '어떤 세부 분야에 관심이 있으신가요?';
            addChatMessage('ai', q);
            state.appState = 'AWAITING_TOPIC_REFINEMENT';
          } else {
            displayCurriculum(resp);
            state.appState = 'CURRICULUM_PROPOSED';
          }
        } catch (retryError) {
          addChatMessage('ai', `여전히 문제가 있네요 😥 잠시 후 다시 시도해주세요.\n\n**${retryError.message}**`);
        } finally {
          setLoading(false);
        }
      };
      
      const newTopicBtn = document.createElement('button');
      newTopicBtn.type = 'button';
      newTopicBtn.className = 'flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200';
      newTopicBtn.innerHTML = '<i class="fas fa-plus"></i> 다른 주제 시작';
      newTopicBtn.onclick = () => {
        retryContainer.remove();
        window.App?.UI?.resetApp?.(false);
      };
      
      retryContainer.appendChild(retryBtn);
      retryContainer.appendChild(newTopicBtn);
      addChatMessage('ai', retryContainer);
    } else {
      addChatMessage('ai', `앗, 오류가 발생했어요 😢\n\n**${errorMsg}**\n\n잠시 후 다시 시도해주세요.`);
    }
  } finally {
    setLoading(false);
  }
}

// [변경 이유] '리뷰(코드 수정 과제)' 등 변형 과제를 생성하기 위해 선택적 variant 힌트를 추가합니다.
export async function fetchProblemForCurrentStep(variant) {
  const curriculum = state.currentCurriculum || {};
  const step = (curriculum.curriculum || [])[state.currentStepIndex] || {};
  // [수정] 깨진 커리큘럼의 topic 대신, 사용자가 명확히 의도한 intendedTopic을 우선 사용합니다.
  const baseTopic = String(state.intendedTopic || curriculum.topic || '코딩 기초').trim();
  const stepTitle = String(step.title || '코딩 기초').trim();
  // [수정] stepDescription도 의도한 주제(baseTopic)를 포함시켜 AI에게 맥락을 강화합니다.
  const stepDescription = String(step.description || '').trim();
  const contextAwareDesc = `${baseTopic}의 ${stepTitle} 단계: ${stepDescription}`;
  // [수정] AI에게 전달할 최종 주제는 baseTopic(Flask...)을 사용합니다.
  const combined = baseTopic; // stepTitle을 합치지 않고, 명확한 기본 주제만 전달
  
  // [신규] 현재 학습 중인 언어 정보 유지
  const currentLanguage = state.currentLessonPlan?.language || state.problemJSON?.language;

  const wantBash = /linux|리눅스|bash|쉘|shell|터미널|명령어/i.test(combined);
  const wantHtml = /html|css|웹|web|프론트엔드|frontend/i.test(combined);
  const isPipeline = /파이프라인|pipeline/i.test(combined);
  const isStdIOIntro = /표준\s*입출력|stdin|stdout|stderr/i.test(combined);
  let extraHint = '';
  if (wantBash && isPipeline) {
    extraHint = ' (bash: |, grep, wc -l 범위에서 생성)';
  } else if (wantBash && isStdIOIntro) {
    extraHint = ' (bash: echo, ls, cat 범위에서 생성; grep/wc 사용 금지)';
  } else if (wantBash) {
    extraHint = ' (bash 명령으로 풀기)';
  }
  // [신규] variant 힌트 주입: modify(코드 수정 과제), explain(개념 설명 강화)
  let variantHint = '';
  if (variant === 'modify') {
    variantHint = ' - 코드 수정 과제 형태로 출제 (기존 코드 일부를 변경하도록)';
  } else if (variant === 'explain') {
    variantHint = ' - 개념 이해를 확인하는 간단한 설명형 소문항 포함';
  }
  const hintedTopic = `${combined}${extraHint}${variantHint}`;

  // [수정] 현재 언어 정보를 전달하여 언어 일관성 유지
  let preferredLang = wantBash ? 'bash' : (wantHtml ? 'html' : currentLanguage);
  
  // [수정] topic은 combined(baseTopic)을, 설명은 contextAwareDesc를 전달
  let problem = await requestProblem(hintedTopic, preferredLang, contextAwareDesc);
  const lang = String(problem?.language || '').toLowerCase();
  if (wantBash && lang !== 'bash') {
    addChatMessage('ai', '이 단계는 리눅스 명령 학습 단계예요. Bash 기준으로 다시 문제를 생성할게요.');
    const stronger = `${combined} - 반드시 bash 명령으로 문제 생성`;
    problem = await requestProblem(stronger, 'bash', stepDescription);
  }
  state.problemJSON = problem;
  renderProblem();
}

// [수정] 개념 다지기 - 현재 레슨의 final_code 문제를 재사용
// 기존에는 fetchProblemForCurrentStep('modify')로 새 문제를 생성했으나,
// 이제는 레슨 플랜의 final_code 문제를 그대로 사용하여 일관된 학습 경험 제공
export async function startReviewExercise() {
  setLoading(true, '개념 다지기 문제를 준비하고 있어요...');
  
  try {
    // 1. 현재 레슨 플랜에서 final_code 단계 찾기
    const plan = state.currentLessonPlan;
    if (!plan || !Array.isArray(plan.steps)) {
      throw new Error('레슨 플랜을 찾을 수 없습니다.');
    }
    
    const finalCodeStep = plan.steps.find(s => s.type === 'final_code');
    if (!finalCodeStep || !finalCodeStep.problem_json) {
      // fallback: 기존 방식으로 새 문제 생성
      console.warn('[Review] final_code 문제를 찾을 수 없어 새 문제를 생성합니다.');
      const currentLanguage = plan?.language || state.problemJSON?.language || 'python';
      await fetchProblemForCurrentStep('modify');
      if (state.problemJSON && !state.problemJSON.language) {
        state.problemJSON.language = currentLanguage;
      }
    } else {
      // 2. final_code 문제를 state.problemJSON에 설정
      const problem = { ...finalCodeStep.problem_json };
      // 제목에 "(복습)" 표시 추가
      problem.title = `${problem.title || '문제'} (복습)`;
      state.problemJSON = problem;
    }
    
    // 3. 코딩 뷰 표시
    displayCodingView();
    state.currentChapterStage = 'BASIC_EXERCISE';
    state.appState = 'PROBLEM_SOLVING';
    
    // 4. 문제 렌더링
    renderProblem();
    
    // 5. 에디터 초기화 - 빈 템플릿으로 시작 (복습이므로)
    const { renderEditorForStep } = await import('./editor.js');
    const lang = state.problemJSON?.language || 'python';
    const template = state.problemJSON?.code_template || '';
    renderEditorForStep({ language: lang, code_template: template }, 'final_code', null);
    
    // 6. 안내 메시지
    addChatMessage('ai', '📝 같은 문제를 다시 풀어보며 개념을 다져봐요! 코드를 처음부터 작성해보세요.');
    
  } catch (e) {
    console.error('[Review] 개념 다지기 시작 실패:', e);
    addChatMessage('ai', '개념 다지기 문제 준비에 실패했어요. 다시 시도해주세요.');
  } finally {
    setLoading(false);
  }
}

export async function goToNextStepExplanation() {
  console.log('[Flow] goToNextStepExplanation triggered.');
  setLoading(true, '다음 단계를 준비하고 있어요...');
  
  try {
    const steps = Array.isArray(state.currentCurriculum?.curriculum) ? state.currentCurriculum.curriculum : [];
    
    // 🔥 [수정] 로드맵 모드 강제 체크 - localStorage에서 복원 (복습 모드에서 중요!)
    let isRoadmapMode = state.isRoadmapMode || false;
    let roadmapContext = state.roadmapContext;
    
    if (!isRoadmapMode || !roadmapContext) {
      try {
        const ctxStr = localStorage.getItem('roadmap_context');
        if (ctxStr) {
          roadmapContext = JSON.parse(ctxStr);
          isRoadmapMode = true;
          state.isRoadmapMode = true;
          state.roadmapContext = roadmapContext;
          console.log('[Flow] 로드맵 컨텍스트 localStorage에서 복원:', roadmapContext);
        }
      } catch (e) {
        console.warn('[Flow] 로드맵 컨텍스트 복원 실패:', e);
      }
    }
    
    // 1. 다음 단계가 있는지 확인
    if (state.currentStepIndex + 1 >= steps.length) {
      // 🌟 루나 페르소나 반응 (커리큘럼 완료!) - proud 상태 유지
      const { setTutorExpression, TUTOR } = window.TutorPersona || {};
      if (setTutorExpression) setTutorExpression('proud');
      
      // [구조적 개선] 로드맵 모드일 경우 - 자동으로 다음 토픽 안내 및 로드맵 이동
      if (isRoadmapMode) {
        const ctx = roadmapContext || {};
        
        // 🔥 [핵심] unlock_next 호출하여 다음 토픽 언락
        try {
          if (ctx.pIdx !== undefined && ctx.tIdx !== undefined) {
            console.log('[Flow] 🔓 토픽 완료 - unlock_next 호출');
            const unlockRes = await postJSON('/roadmap/unlock_next', {
              phase_index: ctx.pIdx,
              topic_index: ctx.tIdx
            });
            console.log('[Flow] unlock_next 결과:', unlockRes);
          }
        } catch (e) {
          console.warn('[Flow] unlock_next 호출 실패:', e);
        }
        
        // 축하 메시지
        addChatMessage('ai', `🎊 **${state.intendedTopic}** 토픽을 모두 완료했어요! 🎉`);
        
        // 로드맵 이동 버튼 표시
        const actionContainer = document.createElement('div');
        actionContainer.className = 'flex flex-col gap-3 mt-4';
        
        const roadmapBtn = document.createElement('button');
        roadmapBtn.type = 'button';
        roadmapBtn.className = 'flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg';
        roadmapBtn.innerHTML = '<i class="fas fa-map"></i> 로드맵에서 다음 토픽 시작하기';
        roadmapBtn.onclick = () => {
          window.location.href = 'roadmap.html';
        };
        actionContainer.appendChild(roadmapBtn);
        
        addChatMessage('ai', actionContainer);
        
        // 3초 후 자동으로 로드맵 페이지로 이동 (사용자가 버튼을 안 눌러도)
        setTimeout(() => {
          window.location.href = 'roadmap.html';
        }, 3000);
        
        state.appState = 'IDLE';
        setLoading(false);
        return;
      }
      
      // 🔥 [수정] 로드맵 모드가 아닌 단독 커리큘럼일 때만 "새 주제" 안내
      // (로드맵 모드는 위에서 이미 처리됨)
      const congratsMsg = TUTOR?.messages?.curriculumComplete?.() ||
        '🎊 와, 전체 커리큘럼을 완료하셨어요! 정말 대단해요!';
      addChatMessage('ai', `${congratsMsg}\n\n🗺️ 로드맵이 있다면 상단의 **[로드맵]** 버튼을, 새로운 주제로 시작하려면 **[새 주제]** 버튼을 눌러주세요.`);
      state.appState = 'IDLE';
      setLoading(false);
      return;
    }
    state.currentStepIndex += 1; // 다음 단계로 인덱스 이동
    
    // [신규] 사이드바 갱신 + 클릭 핸들러 연결 + 완료 상태 포함
    renderSidebarCurriculum(state.currentCurriculum, state.currentStepIndex, handleSidebarStepClick, state.curriculumProgress);

    // 2. 다음 단계 정보 가져오기
    const newStep = steps[state.currentStepIndex];
    if (!newStep) throw new Error('다음 단계 정보를 찾을 수 없습니다.');
    
    const topic = state.intendedTopic || state.currentCurriculum?.topic || '코딩';
    const lessonTitle = newStep.title;
    
    console.log(`[Flow] Starting next lesson: Step ${state.currentStepIndex}, Title: ${lessonTitle}`);

    // 3. (버그 수정) 채팅이 아닌, 오른쪽 강의 칸을 위한 새 수업 시작
    await startLesson(topic, lessonTitle); 
    
  } catch (e) {
     console.error("다음 단계 수업 시작 중 오류:", e);
     // 🌟 루나 페르소나 반응 (오류) - encouraging 상태 유지
     const { setTutorExpression } = window.TutorPersona || {};
     if (setTutorExpression) setTutorExpression('encouraging');
     addChatMessage('ai', '앗, 다음 단계를 불러오는 중 문제가 생겼어요 😢 다시 시도해볼게요.');
     // 실패 시 인덱스 롤백
     if (state.currentStepIndex > 0) state.currentStepIndex -= 1; 
  } finally {
    setLoading(false);
  }
}

export async function goToCurrentStepProblem() {
  // [수정] 현재 수업 계획의 언어 정보 유지
  const currentLanguage = state.currentLessonPlan?.language || state.problemJSON?.language || 'python';
  
  await fetchProblemForCurrentStep();
  
  // [수정] 언어 정보 보존
  if (state.problemJSON && !state.problemJSON.language) {
    state.problemJSON.language = currentLanguage;
  }
  
  displayCodingView();
  try { state.currentChapterStage = 'BASIC_EXERCISE'; } catch {}
  state.appState = 'PROBLEM_SOLVING';
  
  // [신규] 에디터 초기화
  const { renderEditorForStep } = await import('./editor.js');
  renderEditorForStep({
    language: state.problemJSON?.language || currentLanguage,
    code_template: state.problemJSON?.code_template || '',
  }, 'final_code', null);
}

export async function handleInProblemChat(question) {
  const q = String(question || '').trim().toLowerCase();
  if (/(다음\s*단계|다음\s*문제|next|next\s*step|next\s*problem)/.test(q)) {
    await goToNextStepExplanation();
    return;
  }

  try {
    // 🆕 스트리밍 타이핑 효과 적용
    const streamingMsg = createStreamingMessage();
    
    // 안전하게 현재 코드 가져오기
    let currentCode = '';
    try {
      currentCode = getCurrentCode() || '';
    } catch (e) {
      console.warn('에디터 코드 가져오기 실패:', e);
    }
    
    await chatWithTutorStream(
      {
        problem: state.problemJSON || {},
        user_code: currentCode,
        chat_history: state.chatHistory || [],
        question,
        // 현재 학습 컨텍스트 전달
        curriculum: state.currentCurriculum || null,
        current_step: state.currentLessonPlan ? {
          title: state.currentLessonPlan.title,
          description: state.currentLessonPlan.description
        } : null,
      },
      // onChunk - 텍스트 조각이 도착할 때마다
      (chunk) => {
        streamingMsg.append(chunk);
      },
      // onComplete - 스트리밍 완료 시
      (fullText) => {
        streamingMsg.finalize(fullText);
      }
    );
    
  } catch (err) {
    console.error('채팅 오류:', err);
    // 🌟 루나 페르소나 반응 (오류) - encouraging 상태 유지
    const { setTutorExpression } = window.TutorPersona || {};
    if (setTutorExpression) setTutorExpression('encouraging');
    addChatMessage('ai', '앗, 답변을 생성하는 중 문제가 생겼어요 😢 다시 질문해주세요.');
  }
}

// skipMessage: true면 '문제를 불러왔어요' 메시지 출력 안 함 (세션 복원 시 사용)
export function renderProblem(skipMessage = false) {
  if (!state.problemJSON) return;
  // 방어적: DOM 참조가 초기 로딩 타이밍 이슈로 null일 수 있으므로 재확인/보강
  if (!dom.problemTitle) dom.problemTitle = document.getElementById('problem-title');
  if (!dom.problemDescriptionMd) dom.problemDescriptionMd = document.getElementById('problem-description-md');
  if (!dom.outputContainer) dom.outputContainer = document.getElementById('output-container');
  if (!dom.outputIframe) dom.outputIframe = document.getElementById('output-iframe');
  if (!dom.problemContainer) dom.problemContainer = document.getElementById('problem-container');

  if (!dom.problemTitle) {
    console.warn('[renderProblem] problemTitle 요소를 찾지 못했습니다.');
    addChatMessage('ai', '문제 패널을 찾지 못했어요. 페이지를 새로고침 후 다시 시도해 주세요.');
    return;
  }

  dom.problemTitle.textContent = state.problemJSON.title || '문제';
  // 문제 패널이 숨겨져 있다면 표시
  try { dom.problemContainer?.classList?.remove('hidden'); } catch {}
  
  // [신규 수정] markdown-content 클래스를 추가해야 스타일이 적용됩니다.
  if (dom.problemDescriptionMd) {
    dom.problemDescriptionMd.classList.add('markdown-content');
  }
  
  // [추가] 기존 학습 목표 표시가 있다면 제거 후 재생성
  const existingGoal = dom.problemContainer.querySelector('.learning-goal');
  if (existingGoal) existingGoal.remove();
  if (state.problemJSON.learning_goal && dom.problemDescriptionMd) {
    const goalEl = document.createElement('div');
    goalEl.className = 'learning-goal mt-2 p-3 bg-slate-700/50 rounded-md text-sm border-l-4 border-cyan-400 mb-4';
    goalEl.innerHTML = `🎯 <strong>학습 목표:</strong> ${state.problemJSON.learning_goal}`;
    dom.problemDescriptionMd.before(goalEl);
  }
  // [변경] 문제 설명을 마크다운으로 렌더링 (fallback: 텍스트)
  if (dom.problemDescriptionMd) {
    // --- [수정] ---
    // 언어를 확인하여 웹 문제인지 판별
    const lang = (state.problemJSON?.language || '').toLowerCase();
    const isWeb = String(state.problemJSON?.type || '').toLowerCase() === 'web' || lang === 'html' || lang === 'css';
    let descriptionText = String(state.problemJSON.description || '');
    
    // [신규] 이스케이프된 줄바꿈 문자를 실제 줄바꿈으로 변환 (다양한 패턴)
    descriptionText = descriptionText.replace(/\\\\n/g, '\n');  // \\n → 줄바꿈
    descriptionText = descriptionText.replace(/\\n/g, '\n');    // \n → 줄바꿈
    
    // [신규] 들여쓰기된 코드 블록 보정 - 여는/닫는 백틱의 들여쓰기 제거
    descriptionText = descriptionText.replace(/^[ \t]+(```)/gm, '$1');

    if (isWeb) {
        // [수정] 웹 문제: HTML 태그를 이스케이프 후 마크다운 렌더링
        // 코드 블록 외부의 HTML 태그만 이스케이프
        const codeBlocks = [];
        let processed = descriptionText.replace(/```[\s\S]*?```|`[^`]+`/g, (match) => {
          codeBlocks.push(match);
          return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
        });
        // HTML 태그 이스케이프
        processed = processed.replace(/<(\/?)(html|head|body|title|meta|div|span|script|style|link|DOCTYPE|h1|h2|h3|p|ul|ol|li|a|img|br|hr)[^>]*>/gi, (match) => {
          return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        });
        // 코드 블록 복원
        processed = processed.replace(/__CODE_BLOCK_(\d+)__/g, (match, idx) => {
          return codeBlocks[parseInt(idx)];
        });
        
        try {
          if (window.marked) {
            dom.problemDescriptionMd.innerHTML = marked.parse(processed);
          } else {
            dom.problemDescriptionMd.textContent = descriptionText;
          }
        } catch (e) {
          dom.problemDescriptionMd.textContent = descriptionText;
        }
    } else {
        // Python, Bash, JavaScript 등 다른 문제는 기존처럼 Markdown을 사용합니다.
        try {
          if (window.marked) {
            dom.problemDescriptionMd.innerHTML = marked.parse(descriptionText);
          } else {
            dom.problemDescriptionMd.textContent = descriptionText;
          }
        } catch (e) {
          console.error("Markdown parsing failed (likely bad data):", e);
          // 충돌 시 렌더링되지 않은 원본 텍스트라도 보여줍니다.
          dom.problemDescriptionMd.textContent = descriptionText;
        }
    }
    // --- [수정 완료] ---
    
    // [신규] problem_json.table 필드가 있으면 데이터 테이블 렌더링
    if (state.problemJSON.table && state.problemJSON.table.headers && state.problemJSON.table.rows) {
      const tableData = state.problemJSON.table;
      
      // 기존 테이블 컨테이너가 있으면 제거
      const existingTable = dom.problemDescriptionMd.querySelector('.problem-excel-table-container');
      if (existingTable) existingTable.remove();
      
      // 테이블 컨테이너 생성
      const tableContainer = document.createElement('div');
      tableContainer.className = 'problem-excel-table-container my-4';
      
      const table = document.createElement('table');
      table.className = 'mcq-excel-table';  // 기존 스타일 재사용
      
      const headers = tableData.headers || [];
      const rows = tableData.rows || [];
      
      // 헤더 행 (A, B, C, ...)
      if (headers.length > 0) {
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // 행 번호 칸 추가
        const cornerCell = document.createElement('th');
        cornerCell.textContent = '';
        headerRow.appendChild(cornerCell);
        
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
        
        // 행 번호
        const rowNumCell = document.createElement('th');
        rowNumCell.textContent = String(rowIdx + 1);
        tr.appendChild(rowNumCell);
        
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
      dom.problemDescriptionMd.appendChild(tableContainer);
    }
  }
  if (dom.outputContainer) dom.outputContainer.textContent = '';
  if (dom.outputIframe) dom.outputIframe.srcdoc = '<!DOCTYPE html><html><head></head><body></body></html>';

  // 입력 힌트: solution에 숫자/문자열 리터럴이 있으면 예시를 채팅으로 안내
  // [수정] skipMessage가 true면 힌트 출력 안 함
  if (!skipMessage) try {
    const sol = state.problemJSON.solution;
    const hints = [];
    const toExample = (val) => {
      const s = String(val ?? '').replace(/\|\|\|/g, '\n').trim();
      if (/^[-+]?\d+(?:\.\d+)?$/.test(s)) return `정수/숫자 예: ${s}`;
      if ((/^".*"$/.test(s) || /^'.*'$/.test(s))) return `문자열 예: ${s}`;
      if (/^\[.*\]$/.test(s)) return `리스트 예: ${s}`;
      if (/^{.*}$/.test(s)) return `딕셔너리 예: ${s}`;
      return `예시 코드: ${s}`;
    };
    if (sol && typeof sol === 'object' && !Array.isArray(sol)) {
      const keys = Object.keys(sol).sort();
      keys.forEach((k) => {
        const idx = (k.match(/(\d+)/)?.[1]) || '';
        const label = idx ? `빈칸 ${idx}` : k;
        hints.push(`${label} → ${toExample(sol[k])}`);
      });
    } else if (typeof sol === 'string' && sol.trim()) {
      // [수정] 솔루션이 너무 길면 (예: 2줄 이상) 힌트로 부적절하므로 표시하지 않음
      const lineCount = (sol.match(/\n/g) || []).length + 1;
      if (lineCount <= 2 && sol.length < 80) {
        hints.push(toExample(sol));
      }
    }
    if (hints.length) {
      const box = document.createElement('div');
      box.className = 'text-sm';
      const title = document.createElement('div');
      title.className = 'font-semibold mb-1';
      title.textContent = '입력 힌트';
      const ul = document.createElement('ul');
      ul.className = 'list-disc ml-5 space-y-1';
      hints.forEach((h) => { const li = document.createElement('li'); li.textContent = h; ul.appendChild(li); });
      box.appendChild(title); box.appendChild(ul);
      addChatMessage('ai', box);
    }
  } catch {}

  const isWeb = String(state.problemJSON.type || '').toLowerCase() === 'web';
  if (isWeb) {
    if (dom.outputIframe) dom.outputIframe.classList.remove('hidden');
    if (dom.outputContainer) dom.outputContainer.classList.add('hidden');
    const tpl = state.problemJSON.code_template || {};
    const html = (tpl.html || (typeof tpl === 'string' ? tpl : '')).replace(/\\n/g, '\n');
    const css = (tpl.css || '').replace(/\\n/g, '\n');
    const js = (tpl.js || '').replace(/\\n/g, '\n');
    const looksFullDoc = /<!DOCTYPE\s+html>/i.test(html) || /<html[\s>]/i.test(html);
    const normalizeFullHtml = (raw) => {
      try {
        let out = String(raw || '');
        // 중복 DOCTYPE 제거 (첫 번째만 유지)
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

        // body 내부 head들을 본문에서 제거하고 그 안의 유효 태그를 상단 head에 병합
        let newBody = bodyHtml;
        innerHeads.forEach((h) => { newBody = newBody.replace(h, ''); });
        const innerContents = innerHeads.map((h) => (h.replace(/<head[^>]*>/i, '').replace(/<\/head>/i, ''))).join('\n');
        headHtml = headHtml.replace(/<\/head>/i, `${innerContents}\n</head>`);

        // 전체 문서 갱신
        out = out.replace(/<head[^>]*>[\s\S]*?<\/head>/i, headHtml).replace(/<body[^>]*>[\s\S]*?<\/body>/i, newBody);
        return out;
      } catch {
        return String(raw || '');
      }
    };
    if (dom.outputIframe) {
      if (looksFullDoc) {
        // 전체 문서 정규화 후 사용 (script 종료 이스케이프)
        const fixed = normalizeFullHtml(html);
        dom.outputIframe.srcdoc = String(fixed).replace(/<\/script>/gi, '<\\/script>');
      } else {
        // 프래그먼트이면 래핑하여 미리보기 생성
        dom.outputIframe.srcdoc = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}<script>${js}<\\/script><style>body{font-family:sans-serif;margin:16px;color:#333}</style><p style="text-align:center;color:#888;font-size:.9em;">// 코드를 작성하고 [가상 실행] 버튼을 눌러 결과를 확인하세요.</p></body></html>`;
      }
    }
  } else {
    if (dom.outputIframe) dom.outputIframe.classList.add('hidden');
    if (dom.outputContainer) {
      dom.outputContainer.classList.remove('hidden');
      dom.outputContainer.textContent = '// 코드를 작성하고 [가상 실행] 버튼을 눌러보세요.';
    }
  }
  // [수정] 세션 복원 시에는 메시지 출력 안 함
  // if (!skipMessage) {
  //   addChatMessage('ai', '문제를 불러왔어요. 빈칸을 채우고 [가상 실행]으로 확인해 볼까요?');
  // }
  // renderEditor(); // [수정] lesson.js의 renderFinalCodeStep()이 호출하므로 중복 호출 제거
}
