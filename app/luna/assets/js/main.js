/**
 * ============================================================
 * AI Coding Tutor - Main Application
 * ============================================================
 * Copyright (c) 2025 Dream of ENC, Seyoong Jang.
 * All Rights Reserved.
 * 
 * This code is the intellectual property of Dream of ENC.
 * Unauthorized copying, cloning, or reverse engineering is prohibited.
 * ============================================================
 */

import { state, dom, API_BASE, FETCH_OPTIONS } from './state.js';
import { setupEditableBlankEnhancer, addChatMessage, setLoading, showChoiceMenu, updateUserStatusUI, updateRoadmapWidget, setRoadmapMode, displayCodingView } from './ui.js';
import { handleChatSubmit, goToNextStepExplanation, fetchProblemForCurrentStep, handleInProblemChat, renderProblem, displayCurriculum, goToCurrentStepProblem } from './flow.js';
import { fetchLessonExplanation, startSession, requestAppliedChallenge, saveStateToServer } from './api.js';
import { handleRunSimulation, handleRunAndGrade } from './runner.js';
import { renderEditor, getCurrentCode } from './editor.js';
import { TUTOR, setTutorExpression, tutorReact, resetExpressionAfter } from './tutor-persona.js';
// [신규] 인증 모듈 import
import { checkAuth, requireAuth, showPendingApprovalScreen, setupUserMenu, logout as authLogout } from './auth.js';
// [신규] 데모 데이터 import
import { DEMO_CONVERSATIONS, DEMO_CURRICULUM, DEMO_LESSON } from './demo-data.js';
// [신규] 효과음 모듈 import
import { SFX, toggleMute, isSoundMuted } from './sound.js';
// [신규] API 설정 import
import { getJSON } from './config.js';

// 저작권 시그니처 (도용 추적용)
const _AUTHOR_DREAM_OF_ENC = true;
const _PROJECT_SIGNATURE = 'AI_CODING_TUTOR_2025_POSCO_ENC';

// ui.js에서 addChatMessage를 전역으로 공유
window.TutorUI = { addChatMessage };

// 로그아웃 함수 전역 노출 (auth.js 재사용)
window.logout = authLogout;

// ========== [신규] 게스트 데모 모드 함수 ==========
/**
 * 게스트용 체험 모드: AI API 없이 미리 준비된 시나리오 재생
 */
async function startGuestDemoMode() {
  console.log('[DEMO] 게스트 체험 모드 시작');
  
  // 1. 채팅창에 데모 대화 재생 (타이핑 애니메이션)
  for (const conv of DEMO_CONVERSATIONS) {
    await new Promise(resolve => setTimeout(resolve, conv.delay));
    
    if (conv.role === 'ai') {
      await typeMessage(conv.message, 'ai');
    } else {
      addChatMessage('user', conv.message);
    }
  }
  
  // 2. 커리큘럼 표시
  await new Promise(resolve => setTimeout(resolve, 1000));
  displayDemoCurriculum();
  
  // 3. 환영 화면 업데이트
  updateWelcomeScreenForDemo();
}

/**
 * 타이핑 애니메이션 효과로 메시지 표시
 */
async function typeMessage(text, role) {
  const messageEl = document.createElement('div');
  messageEl.className = `chat-message ${role === 'ai' ? 'ai-message' : 'user-message'} flex gap-3 mb-4`;
  
  const avatar = role === 'ai' 
    ? '<div class="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center flex-shrink-0"><span class="text-white text-sm font-bold">🌙</span></div>'
    : '<div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0"><i class="fas fa-user text-slate-400 text-sm"></i></div>';
  
  const bubble = document.createElement('div');
  bubble.className = role === 'ai'
    ? 'bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%] shadow-lg'
    : 'bg-cyan-600/20 border border-cyan-500/30 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] ml-auto';
  
  messageEl.innerHTML = avatar;
  messageEl.appendChild(bubble);
  dom.chatLog.appendChild(messageEl);
  
  // 타이핑 효과
  const words = text.split('');
  for (const char of words) {
    bubble.textContent += char;
    dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
    await new Promise(resolve => setTimeout(resolve, 30)); // 글자당 30ms
  }
}

/**
 * 데모 커리큘럼 표시
 */
function displayDemoCurriculum() {
  // curriculum-timeline이 실제 HTML 요소 ID
  const curriculumList = document.getElementById('curriculum-timeline');
  if (!curriculumList) {
    console.warn('[DEMO] curriculum-timeline 요소를 찾을 수 없습니다');
    return;
  }
  
  curriculumList.innerHTML = '';
  
  DEMO_CURRICULUM.chapters.forEach((chapter, index) => {
    const item = document.createElement('div');
    const isInteractive = chapter.interactive;
    
    // 컴팩트한 커리큘럼 아이템 스타일
    item.className = `curriculum-item flex items-start gap-2 p-2 mb-1.5 rounded-lg transition-all ${
      isInteractive 
        ? 'cursor-pointer hover:bg-slate-800/60 bg-slate-800/30 border border-slate-700/30 hover:border-cyan-500/30' 
        : 'cursor-not-allowed opacity-50 bg-slate-900/20'
    }`;
    
    // 넘버링: 작은 원형 뱃지
    const numberBadge = isInteractive
      ? `<span class="flex-shrink-0 w-5 h-5 rounded-full bg-cyan-900/60 text-cyan-400 text-[10px] font-bold flex items-center justify-center">${index + 1}</span>`
      : `<span class="flex-shrink-0 w-5 h-5 rounded-full bg-slate-700/50 text-slate-500 text-[10px] font-bold flex items-center justify-center">${index + 1}</span>`;
    
    // 상태 뱃지: 매우 작게
    const statusBadge = isInteractive
      ? '<span class="inline-flex items-center gap-0.5 text-[8px] text-emerald-400"><i class="fas fa-star text-[6px]"></i>체험 가능</span>'
      : '<span class="inline-flex items-center gap-0.5 text-[8px] text-slate-500"><i class="fas fa-lock text-[6px]"></i>로그인 필요</span>';
    
    item.innerHTML = `
      ${numberBadge}
      <div class="flex-1 min-w-0">
        <h4 class="text-[11px] font-medium text-white leading-tight truncate">${chapter.title.replace(/^\d+단원:\s*/, '')}</h4>
        <p class="text-[9px] text-slate-500 leading-tight mt-0.5 line-clamp-1">${chapter.description}</p>
        <div class="mt-1">${statusBadge}</div>
      </div>
    `;
    
    // 체험 가능한 단원만 클릭 이벤트 추가
    if (isInteractive) {
      item.addEventListener('click', () => startDemoLesson(index));
    }
    
    curriculumList.appendChild(item);
  });
  
  console.log('[DEMO] 커리큘럼 표시 완료:', DEMO_CURRICULUM.chapters.length, '개 항목');
}

/**
 * 데모 레슨 시작
 */
async function startDemoLesson(chapterIndex) {
  console.log('[DEMO] 레슨 시작:', chapterIndex);
  
  // 🎵 시작 효과음
  SFX.start();
  
  // 환영 화면 숨기기
  const welcomeScreen = document.getElementById('welcome-screen');
  const problemArea = document.getElementById('problem-area');
  if (welcomeScreen) welcomeScreen.classList.add('hidden');
  if (problemArea) problemArea.classList.remove('hidden');
  
  // 레슨 상태 설정
  window.demoLessonState = {
    currentStepIndex: 0,
    totalSteps: DEMO_LESSON.steps.length
  };
  
  // 첫 단계 표시
  showDemoStep(0);
  
  // 채팅 메시지 추가
  addChatMessage('ai', `좋아요! "${DEMO_LESSON.title}" 레슨을 시작합니다. 🎯\n\n왼쪽 화면을 보면서 따라해보세요!`);
}

/**
 * 데모 단계 표시 - 정식 레슨과 동일한 스타일
 */
function showDemoStep(stepIndex) {
  const step = DEMO_LESSON.steps[stepIndex];
  if (!step) return;
  
  // problem-area를 사용하여 정식 레슨과 동일한 구조 사용
  const welcomeScreen = document.getElementById('welcome-screen');
  const problemArea = document.getElementById('problem-area');
  const descriptionSection = document.getElementById('description-section');
  const problemTitle = document.getElementById('problem-title');
  const problemDescription = document.getElementById('problem-description-md');
  const activityContent = document.getElementById('activity-content');
  const lessonPanel = document.getElementById('lesson-panel');
  
  if (welcomeScreen) welcomeScreen.classList.add('hidden');
  if (problemArea) problemArea.classList.remove('hidden');
  
  // 제목 설정
  if (problemTitle) {
    problemTitle.innerHTML = `
      <span class="text-slate-400 text-[10px] mr-2">${stepIndex + 1}/${DEMO_LESSON.steps.length}</span>
      ${step.title}
    `;
  }
  
  // 마크다운 렌더링 + XSS 방지
  if (problemDescription) {
    const renderedContent = typeof marked !== 'undefined' 
      ? marked.parse(step.content) 
      : step.content.replace(/\n/g, '<br>');
    
    // [보안 강화] DOMPurify로 HTML 소독
    const cleanContent = window.DOMPurify ? window.DOMPurify.sanitize(renderedContent) : renderedContent;
    problemDescription.innerHTML = cleanContent;
  }
  
  // 액티비티 영역에 다음 버튼 또는 완료 메시지
  if (activityContent) {
    if (stepIndex < DEMO_LESSON.steps.length - 1) {
      activityContent.innerHTML = `
        <button onclick="window.demoNextStep()" 
                class="mt-3 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-all hover:shadow-lg hover:shadow-cyan-500/20">
          다음 단계 →
        </button>
      `;
    } else {
      activityContent.innerHTML = `
        <div class="mt-4 p-3 bg-gradient-to-r from-emerald-900/20 to-cyan-900/20 border border-emerald-500/20 rounded-lg">
          <p class="text-emerald-400 font-medium text-sm mb-1.5">🎉 샘플 레슨 완료!</p>
          <p class="text-xs text-slate-400 mb-3">더 많은 레슨과 AI 튜터의 실시간 피드백을 받으려면 로그인하세요.</p>
          <a href="login.html" 
             class="inline-block px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-medium rounded-lg transition-all">
            로그인하고 본격적으로 시작하기
          </a>
        </div>
      `;
      // 🎵 완료 효과음
      SFX.levelUp();
    }
  }
  
  // 에디터에 코드 표시
  if (step.code_template && lessonPanel) {
    lessonPanel.classList.remove('hidden');
    import('./editor.js').then(({ renderEditor }) => {
      renderEditor(step.code_template, true); // readOnly = true
    });
  }
}

// 전역 함수로 노출
window.demoNextStep = function() {
  if (window.demoLessonState) {
    // 🎵 다음 단계 효과음
    SFX.click();
    
    window.demoLessonState.currentStepIndex++;
    showDemoStep(window.demoLessonState.currentStepIndex);
    
    // 스크롤 맨 위로
    document.getElementById('problem-container')?.scrollTo(0, 0);
  }
};

window.startDemoLesson = startDemoLesson;


/**
 * 환영 화면을 데모 모드용으로 업데이트 - 세련된 SaaS 스타일
 */
function updateWelcomeScreenForDemo() {
  const welcomeScreen = document.getElementById('welcome-screen');
  if (!welcomeScreen) return;
  
  welcomeScreen.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full text-center px-4 py-6 overflow-y-auto">
      <!-- 헤더: 아이콘 + 타이틀 인라인 배치 -->
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-600/30 flex items-center justify-center border border-indigo-500/20">
          <span class="text-xl">🌙</span>
        </div>
        <div class="text-left">
          <h2 class="text-base font-bold text-white leading-tight">체험 모드</h2>
          <p class="text-[10px] text-slate-400">미리 준비된 샘플 레슨을 체험해보세요</p>
        </div>
      </div>
      
      <!-- 기능 카드들 -->
      <div class="w-full max-w-sm space-y-2 mb-4">
        <!-- 샘플 레슨 카드 (강조) -->
        <div class="group bg-gradient-to-r from-emerald-900/30 to-cyan-900/20 border border-emerald-500/20 rounded-lg p-3 text-left hover:border-emerald-500/40 transition-all">
          <div class="flex items-start gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <i class="fas fa-play text-emerald-400 text-[10px]"></i>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-xs font-semibold text-emerald-400 mb-0.5">샘플 레슨 체험</h3>
              <p class="text-[10px] text-slate-400 leading-relaxed mb-2">왼쪽 커리큘럼의 1단원을 클릭하거나 버튼으로 바로 시작!</p>
              <button onclick="window.startDemoLesson(0)" 
                      class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-medium rounded-md transition-all shadow-sm hover:shadow-emerald-500/20">
                <i class="fas fa-rocket mr-1 text-[8px]"></i>레슨 시작
              </button>
            </div>
          </div>
        </div>
        
        <!-- AI 맞춤 커리큘럼 -->
        <div class="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3 text-left">
          <div class="flex items-start gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <i class="fas fa-brain text-cyan-400 text-[10px]"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-xs font-medium text-cyan-400 mb-0.5">AI 맞춤 커리큘럼</h3>
              <p class="text-[10px] text-slate-500 leading-relaxed">로그인하면 AI가 맞춤 학습 플랜을 생성해요</p>
            </div>
          </div>
        </div>
        
        <!-- 학습 기록 저장 -->
        <div class="bg-slate-800/40 border border-slate-700/30 rounded-lg p-3 text-left">
          <div class="flex items-start gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <i class="fas fa-chart-line text-purple-400 text-[10px]"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-xs font-medium text-purple-400 mb-0.5">학습 기록 저장</h3>
              <p class="text-[10px] text-slate-500 leading-relaxed">대시보드에서 내 실력 분석을 확인하세요</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- CTA 버튼 -->
      <a href="login.html" 
         class="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 
                text-white text-xs font-medium rounded-lg shadow-lg transition-all hover:shadow-cyan-500/30 hover:-translate-y-0.5">
        <i class="fas fa-sign-in-alt text-[10px]"></i>로그인하고 시작하기
      </a>
      
      <p class="mt-2 text-[9px] text-slate-500">무료 회원가입 · 관리자 승인 후 이용 가능</p>
    </div>
  `;
}

/**
 * 게스트용 UI 잠금 처리
 */
function lockUIForGuest() {
  console.log('[DEMO] UI 잠금 및 체험 모드 활성화');
  
  // 1. 채팅 입력창 비활성화
  if (dom.chatInput) {
    dom.chatInput.disabled = true;
    dom.chatInput.placeholder = "💬 로그인하시면 AI와 대화할 수 있어요!";
    dom.chatInput.classList.add('cursor-not-allowed', 'opacity-60');
  }
  
  // 2. 전송 버튼 비활성화
  const submitBtn = dom.chatForm?.querySelector('button');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.classList.add('cursor-not-allowed', 'opacity-50');
  }

  // 3. '새 주제' 버튼 비활성화
  if (dom.newTopicBtn) {
    dom.newTopicBtn.disabled = true;
    dom.newTopicBtn.classList.add('opacity-50', 'cursor-not-allowed');
  }

  // 4. 데모 모드 시작
  startGuestDemoMode();
}

function resetApp(showGreeting = true) {
  state.appState = 'IDLE';
  state.currentCurriculum = null;
  state.currentStepIndex = -1;
  state.problemJSON = null;
  state.chatHistory = [];
  state.editorInstance = null;
  state.intendedTopic = null;
  state.currentLessonPlan = null;
  state.currentLessonStepIndex = -1;
  
  // [신규] 로드맵 모드 초기화 - 새 주제 시작 시 학습유형 선택 가능하도록
  state.isRoadmapMode = false;
  state.roadmapContext = null;
  localStorage.removeItem('roadmap_context');
  setRoadmapMode(false);  // 사이드바 로드맵 위젯 숨기기

  // 학습 영역은 숨기지 않고, welcome-screen만 표시
  const welcomeScreen = document.getElementById('welcome-screen');
  const problemArea = document.getElementById('problem-area');
  if (welcomeScreen) welcomeScreen.classList.remove('hidden');
  if (problemArea) problemArea.classList.add('hidden');
  
  // 커리큘럼 초기화
  const curriculumTimeline = document.getElementById('curriculum-timeline');
  if (curriculumTimeline) {
    curriculumTimeline.innerHTML = '<div class="text-[10px] text-slate-500 text-center mt-4">주제를 입력하면<br>커리큘럼이 생성됩니다.</div>';
  }

  dom.resultModal?.classList?.add('hidden');
  dom.resultModal?.classList?.remove('flex');

  dom.chatLog.innerHTML = '';
  
  // 🌟 루나 페르소나 인사
  if (showGreeting) {
    setTutorExpression('default');
    addChatMessage('ai', TUTOR.messages.newSession());
  }
}

/**
 * [신규] 사이드바 로드맵 위젯 데이터 로드 및 업데이트
 */
async function loadAndUpdateRoadmapWidget() {
  try {
    const res = await getJSON('/roadmap');
    
    if (res.has_roadmap && res.roadmap) {
      const roadmap = res.roadmap;
      const ctx = state.roadmapContext;
      
      // 현재 Phase/Topic 인덱스 결정
      let currentPhaseIdx = ctx?.pIdx || 0;
      let currentTopicIdx = ctx?.tIdx || 0;
      
      // 활성 토픽 자동 탐지 (컨텍스트가 없는 경우)
      if (!ctx) {
        const phases = roadmap.phases || [];
        for (let pIdx = 0; pIdx < phases.length; pIdx++) {
          const topics = phases[pIdx].topics || [];
          for (let tIdx = 0; tIdx < topics.length; tIdx++) {
            if (topics[tIdx].status === 'active') {
              currentPhaseIdx = pIdx;
              currentTopicIdx = tIdx;
              break;
            }
          }
        }
      }
      
      // 위젯 업데이트
      updateRoadmapWidget(roadmap, currentPhaseIdx, currentTopicIdx);
      
      console.log('[Roadmap Widget] 로드맵 위젯 업데이트 완료:', {
        title: roadmap.roadmap_title,
        phase: currentPhaseIdx,
        topic: currentTopicIdx
      });
    }
  } catch (e) {
    console.warn('[Roadmap Widget] 로드맵 데이터 로드 실패:', e);
  }
}

/**
 * 음소거 버튼 초기화
 */
function setupMuteButton() {
  const muteBtn = document.getElementById('mute-btn');
  if (!muteBtn) return;
  
  const icon = muteBtn.querySelector('i');
  
  // 초기 상태 반영
  if (isSoundMuted()) {
    icon.className = 'fas fa-volume-mute text-sm text-slate-500';
    muteBtn.title = '효과음 켜기';
  }
  
  muteBtn.addEventListener('click', () => {
    const currentlyMuted = isSoundMuted();
    toggleMute(!currentlyMuted);
    
    if (!currentlyMuted) {
      // 음소거 활성화
      icon.className = 'fas fa-volume-mute text-sm text-slate-500';
      muteBtn.title = '효과음 켜기';
    } else {
      // 음소거 해제
      icon.className = 'fas fa-volume-up text-sm';
      muteBtn.title = '효과음 끄기';
      // 켰다는 확인음
      setTimeout(() => SFX.click(), 50);
    }
  });
}

async function init() {
  // 중복 초기화 방지: 브라우저/확장 플러그인의 자동 재실행 등으로 init가 두 번 이상 호출되는 경우 차단
  if (window.__CT_INIT_DONE__) {
    console.warn('[INIT] 중복 초기화 시도 차단됨', '- 현재 시각:', new Date().toLocaleTimeString());
    return;
  }
  console.log('[INIT] 앱 초기화 시작', '- 현재 시각:', new Date().toLocaleTimeString());
  console.trace('[INIT] 호출 스택:');
  window.__CT_INIT_DONE__ = true;

  // ========== marked.js 설정 (줄바꿈 자동 변환) ==========
  if (window.marked) {
    window.marked.setOptions({
      gfm: true,       // GitHub Flavored Markdown
      breaks: true     // 단일 줄바꿈을 <br>로 변환
    });
  }

  // ========== [신규] 음소거 버튼 초기화 ==========
  setupMuteButton();

  // ========== [신규] 인증 상태 확인 ==========
  const authResult = await checkAuth();
  
  // [수정] 로그인되지 않은 경우 → 게스트 모드로 진행 (로그인 페이지로 보내지 않음)
  if (!authResult.authenticated) {
    console.log('[INIT] 비로그인 상태 - 게스트 체험 모드로 시작합니다.');
    setupUserMenu(null); // null을 넘겨 게스트 UI 활성화
    lockUIForGuest();    // [중요] 기능 잠금 + 데모 시작
    return;              // 여기서 init 종료 (startSession 호출 안 함)
  } 
  // 승인 대기 중인 경우 → 승인 대기 화면 표시
  else if (!authResult.user?.is_approved) {
    console.log('[INIT] 승인 대기 중');
    showPendingApprovalScreen(authResult.user?.username || '사용자');
    return;
  }
  // 로그인 완료
  else {
    const authUser = authResult.user;
    console.log('[INIT] 인증 성공:', authUser.username);
    setupUserMenu(authUser); // 사용자 정보로 UI 설정
  }

  // ========== [신규] 로드맵 모드 감지 ==========
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');
  const topicFromUrl = urlParams.get('topic');
  
  if (mode === 'roadmap') {
    state.isRoadmapMode = true;
    
    // localStorage에서 로드맵 컨텍스트 읽기
    try {
      const ctxStr = localStorage.getItem('roadmap_context');
      if (ctxStr) {
        state.roadmapContext = JSON.parse(ctxStr);
        console.log('[INIT] 로드맵 모드 활성화:', state.roadmapContext);
        
        // 로드맵 토픽을 intendedTopic으로 설정
        if (state.roadmapContext.topic) {
          state.intendedTopic = state.roadmapContext.topic;
        }
      }
    } catch (e) {
      console.warn('[INIT] 로드맵 컨텍스트 파싱 실패:', e);
    }
    
    // URL에서 토픽이 넘어온 경우 사용
    if (topicFromUrl && !state.intendedTopic) {
      state.intendedTopic = decodeURIComponent(topicFromUrl);
    }
    
    // [신규] 사이드바 로드맵 위젯 활성화 및 데이터 로드
    setRoadmapMode(true);
    loadAndUpdateRoadmapWidget();
  }

  // ========== [신규] 사용자 UI 이벤트 설정 ==========
  dom.newTopicBtn?.addEventListener('click', () => resetApp(true));
  // 실행 버튼은 동적으로 추가됩니다(lesson.js). 고정 버튼 리스너 제거.
  dom.chatForm?.addEventListener('submit', handleChatSubmit);

  // [긴급] 폼 제출 완전 차단: 활동 영역 내부 모든 클릭은 폼 제출하지 않음
  document.addEventListener('submit', (e) => {
    // chatForm은 항상 허용
    if (e.target === dom.chatForm) {
      return; // 허용
    }
    // 비밀번호 변경 폼은 동적으로 생성되므로 ID로 실시간 확인
    if (e.target.id === 'change-password-form') {
      return; // 허용
    }
    console.warn('[FORM SUBMIT BLOCKED]', e.target);
    e.preventDefault();
    e.stopImmediatePropagation();
    return false;
  }, true);

  // [최종 방어선] 활동 영역 버튼 클릭 시 절대 폼 제출 안 되도록 원천 차단
  document.addEventListener('click', (e) => {
    const target = e.target;
    const btn = target.closest('button');
    if (!btn) return;
    
    // 활동/문제 영역의 버튼인 경우
    const inActivity = btn.closest('#activity-content, #activity-controls, #activity-text, #problem-container');
    if (inActivity) {
      // type이 submit이면 button으로 강제 변경
      if (btn.type === 'submit' || btn.type === '') {
        console.warn('[BUTTON TYPE FIX]', btn.textContent, '- type을 button으로 변경');
        btn.type = 'button';
      }
      
      // 혹시라도 폼 안에 있다면 폼 제출 차단
      const form = btn.closest('form');
      if (form && form !== dom.chatForm) {
        console.warn('[FORM IN ACTIVITY BLOCKED]', form);
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, true);

  dom.closeModalBtn?.addEventListener('click', () => {
    dom.resultModal.classList.add('hidden');
    dom.resultModal.classList.remove('flex');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dom.resultModal.classList.contains('hidden')) {
      dom.resultModal.classList.add('hidden');
      dom.resultModal.classList.remove('flex');
    }
  });
  dom.resultModal?.addEventListener('click', (e) => {
    if (e.target === dom.resultModal) {
      dom.resultModal.classList.add('hidden');
      dom.resultModal.classList.remove('flex');
    }
  });

  // [안정화] 활동 영역 버튼의 type 속성 보장 (submit 방지)
  const ensureButtonType = (e) => {
    try {
      const btn = e.target.closest?.('button');
      if (!btn) return;
      const withinActivity = btn.closest?.('#activity-content, #activity-controls, #problem-container');
      if (!withinActivity) return;
      // type 미지정 버튼은 강제로 button으로 설정
      if (!btn.getAttribute('type')) {
        btn.setAttribute('type', 'button');
      }
    } catch {}
  };
  document.addEventListener('click', ensureButtonType, true);

  const mainGrid = document.querySelector('main.grid');
  mainGrid.classList.remove('lg:grid-cols-2');
  mainGrid.classList.add('lg:grid-cols-1');
  dom.problemContainer = document.getElementById('problem-container');
  // problem-container는 항상 표시 (welcome-screen이 초기 안내 담당)

  // 초기 인사 메시지는 세션 복원 이후에 필요 시 표시합니다.

  setupEditableBlankEnhancer();

  // 사용자 세션 식별자 준비 및 세션 시작/복원 시도
  try {
    let userId = localStorage.getItem('coding_tutor_user_id');
    if (!userId) {
      // 랜덤 ID 생성 (비로그인 체험용)
      userId = 'user_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('coding_tutor_user_id', userId);
      console.log('[INIT] 새로운 임시 사용자 ID 생성:', userId);
    }
    // 세션 시작(복원)
    console.log('[INIT] startSession 호출 - userId:', userId);
    const sessionData = await startSession(userId);
    console.log('[INIT] startSession 응답:', sessionData?.status);
    
    // [신규] 게이미피케이션 상태 UI 반영
    if (sessionData?.gamification) {
      const g = sessionData.gamification;
      updateUserStatusUI(g.xp, g.level, g.streak, g.requiredXp);
    }
    
    if (sessionData && sessionData.status === 'resume' && sessionData.state) {
      // 🔥 [신규] 로드맵 모드에서 토픽 변경 감지
      const savedTopic = sessionData.state.intendedTopic || sessionData.state.currentCurriculum?.topic;
      const isTopicChanged = mode === 'roadmap' && topicFromUrl && savedTopic && 
                             decodeURIComponent(topicFromUrl) !== savedTopic;
      
      if (isTopicChanged) {
        // 토픽이 변경됨 → 새 커리큘럼 생성 필요
        console.log('[INIT] 토픽 변경 감지! 저장:', savedTopic, '→ 신규:', topicFromUrl);
        
        // 사용자에게 선택권 제공
        setTutorExpression('thinking');
        addChatMessage('ai', TUTOR.messages.newSession());
        
        const newTopicDecoded = decodeURIComponent(topicFromUrl);
        
        // DOM 요소 직접 생성 - 기존 카드 디자인과 통일
        const noticeEl = document.createElement('div');
        noticeEl.className = 'topic-change-selector w-full max-w-lg';
        noticeEl.innerHTML = `
          <div class="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
            <!-- 헤더 -->
            <div class="bg-gradient-to-r from-amber-600/20 to-orange-600/20 px-5 py-4 border-b border-slate-700/50">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <i class="fas fa-exchange-alt text-white text-lg"></i>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-white">토픽 변경 감지</h3>
                  <p class="text-xs text-slate-400">학습 중인 토픽과 다른 토픽을 선택하셨어요</p>
                </div>
              </div>
            </div>
            
            <!-- 토픽 비교 -->
            <div class="p-4">
              <div class="flex items-center gap-3 mb-4 p-3 rounded-xl bg-slate-800/50">
                <div class="flex-1 text-center">
                  <p class="text-xs text-slate-500 mb-1">이전 토픽</p>
                  <p class="text-sm text-slate-400 line-through">${savedTopic}</p>
                </div>
                <div class="flex-shrink-0">
                  <i class="fas fa-arrow-right text-amber-500"></i>
                </div>
                <div class="flex-1 text-center">
                  <p class="text-xs text-amber-500 mb-1">새 토픽</p>
                  <p class="text-sm text-white font-semibold">${newTopicDecoded}</p>
                </div>
              </div>
              
              <!-- 선택 버튼들 -->
              <div class="space-y-3">
                <button type="button" class="btn-new-curriculum w-full group flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-900/40 to-teal-900/30 hover:from-emerald-800/50 hover:to-teal-800/40 border border-emerald-500/30 hover:border-emerald-400/50 transition-all duration-200 text-left">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center flex-shrink-0 group-hover:from-emerald-500/50 group-hover:to-teal-500/50 transition-colors">
                    <i class="fas fa-rocket text-emerald-400 text-xl"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="text-base font-bold text-emerald-300 group-hover:text-emerald-200 transition-colors">✨ 새 커리큘럼 시작</h4>
                    <p class="text-sm text-slate-400 mt-1">새 토픽으로 처음부터 학습해요</p>
                  </div>
                  <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-chevron-right text-emerald-400"></i>
                  </div>
                </button>
                
                <button type="button" class="btn-continue-prev w-full group flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-700/40 to-slate-800/30 hover:from-slate-600/50 hover:to-slate-700/40 border border-slate-500/30 hover:border-slate-400/50 transition-all duration-200 text-left">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-500/30 to-slate-600/30 flex items-center justify-center flex-shrink-0 group-hover:from-slate-500/50 group-hover:to-slate-600/50 transition-colors">
                    <i class="fas fa-history text-slate-400 text-xl"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="text-base font-bold text-slate-300 group-hover:text-slate-200 transition-colors">↩️ 이전 학습 계속</h4>
                    <p class="text-sm text-slate-400 mt-1">"${savedTopic}" 학습을 이어서 해요</p>
                  </div>
                  <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-chevron-right text-slate-400"></i>
                  </div>
                </button>
              </div>
            </div>
            
            <!-- 푸터 안내 -->
            <div class="px-5 py-3 bg-slate-800/30 border-t border-slate-700/30">
              <p class="text-xs text-slate-500 text-center">
                <i class="fas fa-info-circle mr-1"></i>
                이전 학습 진행 상황은 서버에 저장되어 있어요
              </p>
            </div>
          </div>
        `;
        
        // 버튼 참조 가져오기
        const btnNew = noticeEl.querySelector('.btn-new-curriculum');
        const btnContinue = noticeEl.querySelector('.btn-continue-prev');
        
        addChatMessage('ai', noticeEl, true);
        
        // 버튼 비활성화 함수
        const disableButtons = () => {
          btnNew.disabled = true;
          btnContinue.disabled = true;
          btnNew.classList.add('opacity-50', 'pointer-events-none');
          btnContinue.classList.add('opacity-50', 'pointer-events-none');
        };
        
        // 버튼 클릭 핸들러 설정 (DOM 요소에 직접 연결)
        btnNew.addEventListener('click', async () => {
          disableButtons();
          // 새 커리큘럼 시작 - 상태 초기화 후 학습 시작
          console.log('[TOPIC_CHANGE] 새 커리큘럼 시작 선택');
          
          // 로드맵 컨텍스트 유지하면서 상태 초기화
          state.currentCurriculum = null;
          state.currentLessonPlan = null;
          state.currentLessonStepIndex = 0;
          state.lessonCompleted = false;
          state.chatHistory = [];
          state.intendedTopic = newTopicDecoded;
          state.curriculumProgress = {};
          
          // 채팅 영역 초기화
          dom.chatLog.innerHTML = '';
          setTutorExpression('happy');
          addChatMessage('ai', `🚀 **${newTopicDecoded}** 학습을 새로 시작합니다!`);
          
          // 자동으로 커리큘럼 생성 시작
          setTimeout(() => {
            if (dom.chatInput && dom.chatForm) {
              dom.chatInput.value = newTopicDecoded;
              dom.chatForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
          }, 500);
        });
        
        btnContinue.addEventListener('click', async () => {
          disableButtons();
          // 이전 학습 계속 - 기존 로직 수행
          console.log('[TOPIC_CHANGE] 이전 학습 계속 선택');
          
          // 채팅 메시지 초기화 후 기존 상태 복원
          dom.chatLog.innerHTML = '';
          Object.assign(state, sessionData.state);
          
          // 채팅 히스토리 복원
          if (state.chatHistory && Array.isArray(state.chatHistory)) {
            state.chatHistory.forEach(msg => {
              if (msg.role && msg.content) {
                addChatMessage(msg.role === 'user' ? 'user' : 'ai', msg.content, true);
              }
            });
          }
          
          setTutorExpression('happy');
          const topic = state.intendedTopic || state.currentCurriculum?.topic || '학습';
          const stepTitle = state.currentLessonPlan?.title || '현재 단계';
          addChatMessage('ai', TUTOR.messages.sessionResume(topic, stepTitle), true);
          
          // 상태에 맞춰 화면 복원
          try {
            const { startLessonFromState } = await import('./lesson.js');
            startLessonFromState();
          } catch {}
          
          if (state.lessonCompleted) {
            const { showChoiceMenu } = await import('./ui.js');
            showChoiceMenu(true);
          }
        });
        
        return; // 여기서 init 종료 - 사용자 선택 대기
      }
      
      // 서버 상태를 프론트 상태에 반영 (토픽 변경 없는 경우)
      console.log('[INIT] 서버에서 받은 state:', JSON.stringify(sessionData.state, null, 2));
      console.log('[INIT] currentLessonStepIndex:', sessionData.state.currentLessonStepIndex);
      Object.assign(state, sessionData.state);
      console.log('[INIT] Object.assign 후 state.currentLessonStepIndex:', state.currentLessonStepIndex);
      
      // [신규] 로드맵 모드 상태 복원 - 토픽 언락을 위해 필수!
      if (state.isRoadmapMode && state.roadmapContext) {
        console.log('[INIT] 로드맵 모드 복원:', state.roadmapContext);
        setRoadmapMode(true);
        // localStorage에도 다시 저장 (다른 페이지에서 참조할 수 있도록)
        localStorage.setItem('roadmap_context', JSON.stringify(state.roadmapContext));
        
        // [구조적 개선] 서버에서 curriculum_progress 복원
        try {
          const ctx = state.roadmapContext;
          const progressRes = await getJSON(`/roadmap/topic_progress?phase_index=${ctx.pIdx}&topic_index=${ctx.tIdx}`);
          if (progressRes.curriculum_progress?.steps) {
            state.curriculumProgress = progressRes.curriculum_progress.steps;
            console.log('[INIT] curriculum_progress 복원:', state.curriculumProgress);
          }
        } catch (e) {
          console.warn('[INIT] curriculum_progress 복원 실패:', e);
        }
      }
      
      // [신규] 채팅 히스토리 복원 - 기존 메시지들 다시 렌더링
      if (state.chatHistory && Array.isArray(state.chatHistory)) {
        state.chatHistory.forEach(msg => {
          if (msg.role && msg.content) {
            addChatMessage(msg.role === 'user' ? 'user' : 'ai', msg.content, true); // skipHistory=true
          }
        });
      }
      
      // 🌟 루나 페르소나로 인사 - happy 상태 유지
      const topic = state.intendedTopic || state.currentCurriculum?.topic || '학습';
      const stepTitle = state.currentLessonPlan?.title || '현재 단계';
      setTutorExpression('happy');
      addChatMessage('ai', TUTOR.messages.sessionResume(topic, stepTitle), true);  // skipHistory=true (복귀 메시지는 저장 안 함)
      
      // 상태에 맞춰 화면 복원
      try {
        const { startLessonFromState } = await import('./lesson.js');
        startLessonFromState();
      } catch {
        // 커리큘럼만 있는 경우 등
      }
      
      // [신규] 단원 완료 상태였다면 선택지 다시 표시
      console.log('[RESTORE] lessonCompleted 상태:', state.lessonCompleted);
      if (state.lessonCompleted) {
        console.log('[RESTORE] 단원 완료 상태 - showChoiceMenu 호출');
        const { showChoiceMenu } = await import('./ui.js');
        showChoiceMenu(true);  // 복원 모드: 축하 메시지 중복 출력 방지
      }
      
      // [신규] 세션 복원 시에도 로드맵 위젯 업데이트 시도
      // 로드맵 모드가 아니더라도 로드맵 데이터가 있으면 위젯 표시
      await loadAndUpdateRoadmapWidget();
    } else {
      // 🌟 새 세션 인사
      setTutorExpression('default');
      addChatMessage('ai', TUTOR.messages.newSession());
      
      // [신규] 로드맵 모드일 경우 자동으로 학습 시작
      if (state.isRoadmapMode && state.intendedTopic) {
        console.log('[INIT] 로드맵 모드 - 자동 학습 시작:', state.intendedTopic);
        
        // 로드맵 안내 메시지
        const roadmapTitle = state.roadmapContext?.roadmapTitle || '커리어 로드맵';
        addChatMessage('ai', `🗺️ **${roadmapTitle}**에서 **${state.intendedTopic}** 학습을 시작합니다!\n\n이 토픽을 완료하면 다음 토픽이 자동으로 언락되어요.`);
        
        // 짧은 지연 후 자동으로 채팅 제출 트리거
        setTimeout(() => {
          // 채팅 입력창에 토픽 입력 후 제출
          if (dom.chatInput && dom.chatForm) {
            dom.chatInput.value = state.intendedTopic;
            dom.chatForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          }
        }, 1500);
      }
    }
  } catch (err) {
    // 오류 발생 시에도 기본 인사 (로그인 페이지로 보내지 않음)
    console.error('[INIT] 세션 시작 중 오류 발생:', err);
    console.error('[INIT] 에러 상세:', err.message, err.stack);
    addChatMessage('ai', TUTOR.messages.newSession());
    addChatMessage('ai', '세션을 불러오는 중 문제가 발생했습니다. 새로운 학습을 시작하거나 페이지를 새로고침 해주세요.');
  }

  // [신규] 환영 화면 예시 카드 클릭 핸들러
  document.querySelectorAll('.example-card').forEach(card => {
    card.addEventListener('click', () => {
      const exampleText = card.dataset.exampleText;
      const exampleType = card.dataset.exampleType;
      if (exampleText && dom.chatInput) {
        dom.chatInput.value = exampleText;
        dom.chatInput.focus();
        
        // 예시 카드 클릭 시 안내 메시지
        const modeLabel = exampleType === 'roadmap' ? '🗺️ 커리어 로드맵' : '📚 단기 커리큘럼';
        addChatMessage('ai', `${modeLabel} 모드로 학습을 시작해볼까요?\n\n입력창에 예시 주제를 넣어드렸어요. **전송 버튼**을 눌러주세요! 🚀`);
      }
    });
  });

  // [신규] 빠른 토픽 태그 클릭 핸들러
  document.querySelectorAll('.topic-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const topicText = tag.dataset.topic || tag.textContent.trim();
      if (topicText && dom.chatInput) {
        dom.chatInput.value = topicText;
        dom.chatInput.focus();
        addChatMessage('ai', `"${topicText}" 주제로 학습을 시작해볼까요? **전송 버튼**을 눌러주세요! 💡`);
      }
    });
  });

  // 응용 과제 요청 이벤트 처리 (실력 확인하기 / IDE 챌린지)
  window.addEventListener('app:request-challenge', async () => {
    setLoading(true, 'IDE 챌린지를 생성 중입니다...');
    try {
      // 1. 현재 문제 기반으로 응용 과제 생성
      const challenge = await requestAppliedChallenge(state.problemJSON, getCurrentCode());
      
      // 2. 응용 과제 진입 플래그 설정
      state.currentChapterStage = 'APPLIED_CHALLENGE';
      
      // 3. 응용 과제 문제 구조 생성
      const challengeProblem = {
        type: (state.problemJSON?.type || ''),
        language: (state.problemJSON?.language || 'Python'),
        title: `${state.problemJSON?.title || '문제'} - IDE 챌린지`,
        description: String(challenge?.challenge_description || '응용 과제'),
        code_template: String(challenge?.code_template || ''),
        solution: challenge?.solution || '',
        hints: challenge?.hints || [],
        test_cases: challenge?.test_cases || state.problemJSON?.test_cases || [],
      };
      state.problemJSON = challengeProblem;
      
      // 4. 코딩 뷰 표시
      displayCodingView();
      state.appState = 'PROBLEM_SOLVING';
      
      // 5. 문제 렌더링
      renderProblem();
      
      // 6. 에디터 초기화 - 챌린지 템플릿으로
      const { renderEditorForStep } = await import('./editor.js');
      renderEditorForStep({
        language: challengeProblem.language,
        code_template: challengeProblem.code_template,
      }, 'final_code', null);
      
      // 7. 안내 메시지
      addChatMessage('ai', '🔥 IDE 챌린지! 배운 내용을 응용해서 새로운 문제를 해결해보세요. 힌트 없이 도전해봐요!');
      
    } catch (e) {
      console.error('[Challenge] IDE 챌린지 생성 실패:', e);
      addChatMessage('ai', 'IDE 챌린지 생성에 실패했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  });

  // 다음 챕터로 이동 이벤트 처리
  window.addEventListener('app:next-chapter', async () => {
    await goToNextStepExplanation();
  });

  // [신규] 정답 후 사용자 선택 메뉴를 외부 트리거로도 열 수 있도록 이벤트 바인딩 (옵션)
  window.addEventListener('app:show-choice-menu', () => {
    showChoiceMenu();
  });

  // 전역 네임스페이스 제공(디버그 용)
  window.App = {
    state,
    dom,
    UI: { setupEditableBlankEnhancer, addChatMessage, setLoading, resetApp },
    Flow: {
      handleChatSubmit,
      fetchLessonExplanationForCurrentStep: async () => {
        setLoading(true, 'AI 튜터가 강의를 준비 중입니다...');
        try {
          const explanation = await fetchLessonExplanation();
          addChatMessage('ai', explanation);
          addChatMessage('ai', '이제 설명해 드린 내용으로 예제를 풀어볼까요? (네/좋아요)');
          state.appState = 'LESSON_EXPLAINED';
        } finally {
          setLoading(false);
        }
      },
      fetchProblemForCurrentStep,
      goToCurrentStepProblem,
      startReviewExercise: async () => {
        const { startReviewExercise } = await import('./flow.js');
        return startReviewExercise();
      },
    },
    Editor: { renderEditor },
    Runner: { handleRunSimulation, handleRunAndGrade },
  };

  // 창 닫힘 시 즉시 저장 시도
  window.addEventListener('beforeunload', (e) => {
    console.warn('[BEFOREUNLOAD] 페이지가 언로드됩니다!', '- 현재 시각:', new Date().toLocaleTimeString());
    console.trace('[BEFOREUNLOAD] 호출 스택:');
    try { saveStateToServer.flush?.(); } catch {}
  });

  // 페이지 로드 완료 감지
  window.addEventListener('load', () => {
    console.log('[LOAD] 페이지 로드 완료', '- 현재 시각:', new Date().toLocaleTimeString());
  });
}

// DOMContentLoaded 보장: 스크립트 위치 변경 등에도 안전
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
