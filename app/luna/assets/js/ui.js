import { dom, state } from './state.js';
import { goToNextStepExplanation } from './flow.js';
import { saveStateToServer, completeLesson } from './api.js';
import { getCurrentCode } from './editor.js';
// [신규] 효과음 모듈 import
import { SFX } from './sound.js';

// ============================================
// [신규] 모달 유틸리티 함수
// ============================================

// 시뮬레이션 결과 모달 닫기
export function closeResultModal() {
  if (dom.resultModal) {
    dom.resultModal.classList.add('hidden');
    dom.resultModal.classList.remove('flex');
  }
}

// 단원완료 선택 버튼 비활성화 (이미 선택한 후 중복 클릭 방지)
function disableChoiceButtons(wrapElement) {
  if (!wrapElement) return;
  
  // 버튼들 찾기
  const buttons = wrapElement.querySelectorAll('.choice-btn');
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    btn.style.pointerEvents = 'none';
  });
  
  // 헤더 텍스트 변경으로 상태 표시
  const titleEl = wrapElement.querySelector('.choice-title');
  if (titleEl) {
    titleEl.textContent = '진행 중...';
  }
  
  // 부제목 변경
  const subtitleEl = wrapElement.querySelector('.choice-subtitle');
  if (subtitleEl) {
    subtitleEl.textContent = '다음 학습을 준비하고 있어요';
  }
}

// ============================================
// [신규] 게이미피케이션 UI 함수들
// ============================================

// [신규] 사용자 스테이터스(XP/레벨) 업데이트 함수
export function updateUserStatusUI(xp, level, streak, requiredXp) {
  const xpEl = document.getElementById('user-xp');
  const levelEl = document.getElementById('user-level');
  const streakEl = document.getElementById('user-streak');
  const barEl = document.getElementById('xp-progress-bar');
  
  if (xpEl) xpEl.textContent = xp;
  if (levelEl) levelEl.textContent = level;
  if (streakEl) streakEl.textContent = streak;
  
  if (barEl) {
    // 퍼센트 계산
    const percent = Math.min(100, Math.max(0, (xp / requiredXp) * 100));
    barEl.style.width = `${percent}%`;
  }
}

// [신규] 사이드바 커리큘럼 렌더링 함수
// onStepClick: 단계 클릭 시 호출되는 콜백 (stepIndex) => void
// completedSteps: 서버에서 받아온 완료 상태 배열 (선택적)
export function renderSidebarCurriculum(curriculum, currentIndex, onStepClick = null, completedSteps = null) {
  const container = document.getElementById('curriculum-timeline');
  if (!container) return;

  container.innerHTML = '';
  const steps = curriculum?.curriculum || [];

  if (steps.length === 0) {
    container.innerHTML = '<div class="text-xs text-slate-500 text-center mt-10">생성된 단계가 없습니다.</div>';
    return;
  }

  steps.forEach((step, idx) => {
    const item = document.createElement('div');
    const isActive = idx === currentIndex;
    
    // [구조적 개선] 완료 상태 판정 - 서버 데이터 우선, 없으면 기존 로직
    let isCompleted = false;
    if (completedSteps && completedSteps[idx]?.completed) {
      isCompleted = true;
    } else if (idx < currentIndex) {
      isCompleted = true;  // 기존 로직: 현재보다 앞선 단계는 완료 처리
    }
    
    let statusClass = isActive ? 'active' : (isCompleted ? 'completed' : 'opacity-40');
    
    // [신규] 클릭 가능한 스타일 추가
    const clickableClass = onStepClick ? 'cursor-pointer hover:bg-slate-700/50 transition-colors' : '';
    
    item.className = `timeline-item ${statusClass} ${clickableClass}`;
    
    // [구조적 개선] 완료된 Step에 체크 표시 추가
    const completionBadge = isCompleted ? '<span class="text-emerald-400 ml-1">✓</span>' : '';
    
    item.innerHTML = `
      <div class="flex flex-col">
        <span class="text-[9px] font-bold tracking-wider ${isActive ? 'text-cyan-400' : (isCompleted ? 'text-emerald-400' : 'text-slate-500')} uppercase">
          STEP ${step.step || idx + 1}${completionBadge}
        </span>
        <span class="text-xs font-medium ${isActive ? 'text-white' : (isCompleted ? 'text-slate-400' : 'text-slate-300')} leading-tight truncate">
          ${escapeHtml(step.title) || `단계 ${idx + 1}`}
        </span>
      </div>
    `;
    
    // [신규] 클릭 이벤트 추가
    if (onStepClick) {
      item.addEventListener('click', () => {
        onStepClick(idx, step);
      });
    }
    
    container.appendChild(item);
  });
  
  // 활성 아이템으로 스크롤 이동
  const activeItem = container.querySelector('.timeline-item.active');
  if (activeItem) {
    activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// [신규] AI 아바타 상태 업데이트
export function updateAIStatus(status) {
  const statusText = document.getElementById('ai-status-text');
  const avatarContainer = document.getElementById('ai-avatar-container');
  
  const statusMap = {
    'idle': { text: 'AI 대기중', class: '' },
    'thinking': { text: '생각 중...', class: 'animate-pulse' },
    'happy': { text: '잘했어요! 🎉', class: 'animate-glow' },
    'teaching': { text: '설명 중...', class: 'animate-pulse-slow' },
  };
  
  const config = statusMap[status] || statusMap['idle'];
  
  if (statusText) statusText.textContent = config.text;
  if (avatarContainer) {
    avatarContainer.classList.remove('animate-pulse', 'animate-glow', 'animate-pulse-slow');
    if (config.class) avatarContainer.classList.add(config.class);
  }
}

// [신규] 레벨업 축하 효과
export function showLevelUpEffect(newLevel) {
  const levelEl = document.getElementById('user-level');
  if (levelEl) {
    levelEl.classList.add('levelup-effect');
    setTimeout(() => levelEl.classList.remove('levelup-effect'), 500);
  }
  
  // 🌟 루나 페르소나로 레벨업 축하 (놀람 → 기쁨 전환)
  const { setTutorExpression, TUTOR } = window.TutorPersona || {};
  if (setTutorExpression) {
    setTutorExpression('surprised');  // 먼저 놀람!
    setTimeout(() => setTutorExpression('happy'), 1500);  // 1.5초 후 기쁨으로 (유지)
  }
  const message = TUTOR?.messages?.levelUp?.(newLevel) || `🎉 레벨 ${newLevel}에 도달했습니다!`;
  addChatMessage('ai', message);
  // 표정 유지 - 다음 상호작용까지 happy 상태 유지
}

// [신규] XP 획득 처리 함수 (API 응답의 reward 처리)
export function handleReward(reward) {
  if (!reward) return;
  
  updateUserStatusUI(
    reward.current_xp,
    reward.current_level,
    reward.streak,
    reward.required_xp
  );
  
  if (reward.leveled_up) {
    // 🎵 레벨업 효과음
    SFX.levelUp();
    showLevelUpEffect(reward.current_level);
  } else if (reward.xp_earned > 0) {
    // 🎵 XP 획득 효과음 (레벨업 아닐 때만)
    SFX.xpGain();
  }
  
  updateAIStatus('happy');
  setTimeout(() => updateAIStatus('idle'), 2000);
}

// ============================================
// 기존 함수들
// ============================================

// 편집 가능한 빈칸 보조
export function setupEditableBlankEnhancer() {
  const enhance = () => {
    const container = dom.codeEditor;
    if (!container) return;
    const spans = container.querySelectorAll('.editable-blank');
    let index = 1;
    spans.forEach((span) => {
      if (!span.hasAttribute('contenteditable')) span.setAttribute('contenteditable', 'true');
      if (!span.getAttribute('data-placeholder')) {
        const label = spans.length > 1 ? `빈칸 ${index}` : '빈칸';
        span.setAttribute('data-placeholder', `${label}`);
      }
      if (!span.getAttribute('title')) span.setAttribute('title', '여기에 필요한 코드를 입력하세요');
      index += 1;

      if (!span.__kbdBound) {
        span.addEventListener('keydown', (e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const range = sel.getRangeAt(0);
            const tabText = document.createTextNode('    ');
            range.insertNode(tabText);
            range.setStartAfter(tabText);
            range.setEndAfter(tabText);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const range = sel.getRangeAt(0);
            const br = document.createElement('br');
            range.insertNode(br);
            const tn = document.createTextNode('\n');
            br.after(tn);
            range.setStartAfter(tn);
            range.setEndAfter(tn);
          }
        });
        span.__kbdBound = true;
      }
    });
  };

  enhance();
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes && m.addedNodes.length) { enhance(); break; }
    }
  });
  if (dom.codeEditor) mo.observe(dom.codeEditor, { childList: true, subtree: true });
}

// 채팅 메시지 출력 (HTMLElement 지원 + ``` 코드 블록)
// skipHistory: true이면 state.chatHistory에 추가하지 않음 (복원 시 사용)
export function addChatMessage(role, message, skipHistory = false) {
  const messageEl = document.createElement('div');
  messageEl.className = 'flex items-start gap-3';

  const iconEl = document.createElement('i');
  iconEl.className = `fas ${role === 'user' ? 'fa-user text-blue-400' : 'fa-user-astronaut text-purple-400'} mt-1 flex-shrink-0`;

  const contentContainerEl = document.createElement('div');
  contentContainerEl.className = 'p-3 rounded-lg bg-slate-700 flex-1';

  const messageContentEl = document.createElement('div');
  messageContentEl.className = 'text-sm';

  const appendCode = (codeText) => {
    const pre = document.createElement('pre');
    pre.className = 'code-area p-2 rounded-md my-2 text-xs whitespace-pre-wrap';
    const code = document.createElement('code');
    code.textContent = codeText;
    pre.appendChild(code);
    messageContentEl.appendChild(pre);
  };

  // HTMLElement는 복원 불가능하므로 히스토리에 저장하지 않음
  const isHtmlElement = message instanceof HTMLElement;
  
  if (isHtmlElement) {
    messageContentEl.appendChild(message);
  } else if (role === 'ai') {
    try {
      const rawHtml = window.marked ? window.marked.parse(String(message)) : String(message);
      
      // [보안 강화] XSS 방지: DOMPurify로 HTML 소독
      const cleanHtml = window.DOMPurify ? window.DOMPurify.sanitize(rawHtml) : rawHtml;
      
      messageContentEl.innerHTML = `<div class="prose max-w-none">${cleanHtml}</div>`;
    } catch {
      const p = document.createElement('p');
      p.textContent = String(message);
      messageContentEl.appendChild(p);
    }
  } else {
    const p = document.createElement('p');
    p.textContent = String(message);
    messageContentEl.appendChild(p);
  }

  contentContainerEl.appendChild(messageContentEl);
  messageEl.appendChild(iconEl);
  messageEl.appendChild(contentContainerEl);

  dom.chatLog.appendChild(messageEl);
  dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
  
  // [신규] 채팅 히스토리에 저장 (HTMLElement가 아니고 skipHistory가 아닐 때만)
  if (!skipHistory && !isHtmlElement && typeof message === 'string') {
    if (!state.chatHistory) state.chatHistory = [];
    state.chatHistory.push({ role: role === 'user' ? 'user' : 'ai', content: message });
  }
  
  return messageEl;
}

// ========== [신규] 스트리밍 메시지 (타이핑 효과) ==========
/**
 * 스트리밍용 빈 메시지 버블을 생성하고, 텍스트를 점진적으로 추가할 수 있는 컨트롤러를 반환합니다.
 * @returns {{ append: (text: string) => void, finalize: (fullText: string) => void, element: HTMLElement }}
 */
export function createStreamingMessage() {
  const messageEl = document.createElement('div');
  messageEl.className = 'flex items-start gap-3 streaming-message';

  const iconEl = document.createElement('i');
  iconEl.className = 'fas fa-user-astronaut text-purple-400 mt-1 flex-shrink-0';

  const contentContainerEl = document.createElement('div');
  contentContainerEl.className = 'p-3 rounded-lg bg-slate-700 flex-1';

  const messageContentEl = document.createElement('div');
  messageContentEl.className = 'text-sm';
  
  // 타이핑 커서 효과
  const proseEl = document.createElement('div');
  proseEl.className = 'prose max-w-none streaming-content';
  proseEl.innerHTML = '<span class="typing-cursor">▋</span>';
  
  messageContentEl.appendChild(proseEl);
  contentContainerEl.appendChild(messageContentEl);
  messageEl.appendChild(iconEl);
  messageEl.appendChild(contentContainerEl);

  dom.chatLog.appendChild(messageEl);
  dom.chatLog.scrollTop = dom.chatLog.scrollHeight;

  let accumulatedText = '';
  let renderTimeout = null;
  
  // 마크다운 렌더링 (디바운스 적용)
  const renderMarkdown = () => {
    if (renderTimeout) clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => {
      try {
        const html = window.marked ? window.marked.parse(accumulatedText) : accumulatedText;
        proseEl.innerHTML = html + '<span class="typing-cursor">▋</span>';
        dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
      } catch {
        proseEl.textContent = accumulatedText;
      }
    }, 30); // 30ms 디바운스로 너무 잦은 렌더링 방지
  };

  return {
    element: messageEl,
    
    // 텍스트 조각 추가
    append(text) {
      accumulatedText += text;
      renderMarkdown();
    },
    
    // 스트리밍 완료 - 최종 렌더링 및 히스토리 저장
    finalize(fullText) {
      if (renderTimeout) clearTimeout(renderTimeout);
      accumulatedText = fullText || accumulatedText;
      
      try {
        const html = window.marked ? window.marked.parse(accumulatedText) : accumulatedText;
        proseEl.innerHTML = html; // 커서 제거
        proseEl.classList.remove('streaming-content');
      } catch {
        proseEl.textContent = accumulatedText;
      }
      
      messageEl.classList.remove('streaming-message');
      dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
      
      // 채팅 히스토리에 저장
      if (!state.chatHistory) state.chatHistory = [];
      state.chatHistory.push({ role: 'ai', content: accumulatedText });
    },
    
    // 현재까지 누적된 텍스트 반환
    getText() {
      return accumulatedText;
    }
  };
}

// ========== [신규] 일반 메시지에 타이핑 효과 적용 ==========
/**
 * 타이핑 효과가 있는 AI 메시지를 추가합니다.
 * @param {string} message - 표시할 전체 메시지
 * @param {Object} options - 옵션 { skipHistory: false, typingSpeed: 15 }
 * @returns {Promise<HTMLElement>} - 완료 후 메시지 요소 반환
 */
export function addChatMessageWithTyping(message, options = {}) {
  const { skipHistory = false, typingSpeed = 12 } = options;
  
  return new Promise((resolve) => {
    const messageEl = document.createElement('div');
    messageEl.className = 'flex items-start gap-3 streaming-message';

    const iconEl = document.createElement('i');
    iconEl.className = 'fas fa-user-astronaut text-purple-400 mt-1 flex-shrink-0';

    const contentContainerEl = document.createElement('div');
    contentContainerEl.className = 'p-3 rounded-lg bg-slate-700 flex-1';

    const messageContentEl = document.createElement('div');
    messageContentEl.className = 'text-sm';
    
    const proseEl = document.createElement('div');
    proseEl.className = 'prose max-w-none streaming-content';
    proseEl.innerHTML = '<span class="typing-cursor">▋</span>';
    
    messageContentEl.appendChild(proseEl);
    contentContainerEl.appendChild(messageContentEl);
    messageEl.appendChild(iconEl);
    messageEl.appendChild(contentContainerEl);

    dom.chatLog.appendChild(messageEl);
    dom.chatLog.scrollTop = dom.chatLog.scrollHeight;

    // 글자 단위로 타이핑 효과
    let currentIndex = 0;
    let displayText = '';
    const fullText = String(message);
    
    const typeNextChar = () => {
      if (currentIndex < fullText.length) {
        // 한 번에 여러 글자 추가 (속도 향상)
        const chunkSize = Math.min(3, fullText.length - currentIndex);
        displayText += fullText.substring(currentIndex, currentIndex + chunkSize);
        currentIndex += chunkSize;
        
        try {
          const html = window.marked ? window.marked.parse(displayText) : displayText;
          proseEl.innerHTML = html + '<span class="typing-cursor">▋</span>';
        } catch {
          proseEl.textContent = displayText;
        }
        
        dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
        setTimeout(typeNextChar, typingSpeed);
      } else {
        // 타이핑 완료
        try {
          const html = window.marked ? window.marked.parse(fullText) : fullText;
          proseEl.innerHTML = html;
        } catch {
          proseEl.textContent = fullText;
        }
        
        proseEl.classList.remove('streaming-content');
        messageEl.classList.remove('streaming-message');
        dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
        
        // 히스토리 저장
        if (!skipHistory && typeof message === 'string') {
          if (!state.chatHistory) state.chatHistory = [];
          state.chatHistory.push({ role: 'ai', content: message });
        }
        
        resolve(messageEl);
      }
    };
    
    // 타이핑 시작
    setTimeout(typeNextChar, 50);
  });
}

// ============================================
// [신규] 채팅 입력 잠금/해제 함수
// ============================================

/**
 * 채팅 입력을 잠금/해제합니다.
 * 특정 상태(학습 유형 선택, 생성 완료 확인 등)에서 채팅 입력을 막고 버튼만 사용하도록 함
 * @param {boolean} locked - true면 잠금, false면 해제
 * @param {string} placeholder - 잠금 시 표시할 placeholder 텍스트
 */
export function setChatInputLocked(locked, placeholder = '') {
  state.chatInputLocked = locked;
  
  if (dom.chatInput) {
    dom.chatInput.disabled = locked;
    if (locked) {
      dom.chatInput.placeholder = placeholder || '위의 버튼을 선택해주세요';
      dom.chatInput.classList.add('cursor-not-allowed', 'opacity-60');
    } else {
      dom.chatInput.placeholder = '무엇을 배우고 싶으신가요?';
      dom.chatInput.classList.remove('cursor-not-allowed', 'opacity-60');
    }
  }
  
  const submitBtn = dom.chatForm?.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = locked;
    if (locked) {
      submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }
}

// ============================================
// [신규] 학습 유형 선택 버튼 UI
// ============================================

/**
 * 장기 로드맵 / 단기 커리큘럼 선택 버튼을 표시합니다.
 * @param {string} topic - 사용자가 입력한 학습 주제
 * @param {Function} onSelectRoadmap - 로드맵 선택 시 콜백
 * @param {Function} onSelectCurriculum - 커리큘럼 선택 시 콜백
 */
export function showLearningTypeSelector(topic, onSelectRoadmap, onSelectCurriculum) {
  const container = document.createElement('div');
  container.className = 'learning-type-selector w-full max-w-lg';
  
  container.innerHTML = `
    <div class="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
      <!-- 헤더 -->
      <div class="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 px-5 py-4 border-b border-slate-700/50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
            <i class="fas fa-graduation-cap text-white text-lg"></i>
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">학습 유형 선택</h3>
            <p class="text-xs text-slate-400">"${escapeHtml(topic)}" 주제로 어떻게 학습할까요?</p>
          </div>
        </div>
      </div>
      
      <!-- 선택 버튼들 -->
      <div class="p-4 space-y-3">
        <!-- 장기 로드맵 -->
        <button type="button" class="select-roadmap-btn w-full group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-indigo-900/40 to-purple-900/30 hover:from-indigo-800/50 hover:to-purple-800/40 border border-indigo-500/30 hover:border-indigo-400/50 transition-all duration-200 text-left">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center flex-shrink-0 group-hover:from-indigo-500/50 group-hover:to-purple-500/50 transition-colors">
            <i class="fas fa-route text-indigo-400 text-xl"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-base font-bold text-indigo-300 group-hover:text-indigo-200 transition-colors">🗺️ 장기 로드맵</h4>
            <p class="text-sm text-slate-400 mt-1">체계적인 커리어 성장 경로를 설계해요.<br><span class="text-indigo-400/80">수개월~1년 장기 학습 계획</span></p>
          </div>
          <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-center">
            <i class="fas fa-chevron-right text-indigo-400"></i>
          </div>
        </button>
        
        <!-- 단기 커리큘럼 -->
        <button type="button" class="select-curriculum-btn w-full group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-cyan-900/40 to-blue-900/30 hover:from-cyan-800/50 hover:to-blue-800/40 border border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-200 text-left">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/30 to-blue-500/30 flex items-center justify-center flex-shrink-0 group-hover:from-cyan-500/50 group-hover:to-blue-500/50 transition-colors">
            <i class="fas fa-book-open text-cyan-400 text-xl"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-base font-bold text-cyan-300 group-hover:text-cyan-200 transition-colors">📚 단기 커리큘럼</h4>
            <p class="text-sm text-slate-400 mt-1">빠르게 핵심만 배우고 싶을 때!<br><span class="text-cyan-400/80">몇 시간~며칠 단기 학습</span></p>
          </div>
          <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-center">
            <i class="fas fa-chevron-right text-cyan-400"></i>
          </div>
        </button>
      </div>
      
      <!-- 푸터 안내 -->
      <div class="px-5 py-3 bg-slate-800/30 border-t border-slate-700/30">
        <p class="text-xs text-slate-500 text-center">
          <i class="fas fa-info-circle mr-1"></i>
          나중에 언제든 다른 유형으로 새 학습을 시작할 수 있어요
        </p>
      </div>
    </div>
  `;
  
  // 이벤트 바인딩
  const roadmapBtn = container.querySelector('.select-roadmap-btn');
  const curriculumBtn = container.querySelector('.select-curriculum-btn');
  
  roadmapBtn.addEventListener('click', () => {
    // 버튼 비활성화 (중복 클릭 방지)
    roadmapBtn.disabled = true;
    curriculumBtn.disabled = true;
    roadmapBtn.classList.add('opacity-50');
    curriculumBtn.classList.add('opacity-50');
    onSelectRoadmap();
  });
  
  curriculumBtn.addEventListener('click', () => {
    roadmapBtn.disabled = true;
    curriculumBtn.disabled = true;
    roadmapBtn.classList.add('opacity-50');
    curriculumBtn.classList.add('opacity-50');
    onSelectCurriculum();
  });
  
  addChatMessage('ai', container);
}

// ============================================
// [신규] 생성 완료 확인 버튼 UI
// ============================================

/**
 * 로드맵/커리큘럼 생성 완료 후 확인 버튼을 표시합니다.
 * @param {string} type - 'roadmap' 또는 'curriculum'
 * @param {Function} onProceed - 이대로 진행 선택 시 콜백
 * @param {Function} onRegenerate - 다시 생성 선택 시 콜백
 */
export function showGenerationConfirmButtons(type, onProceed, onRegenerate) {
  const typeLabel = type === 'roadmap' ? '로드맵' : '커리큘럼';
  const typeIcon = type === 'roadmap' ? 'fa-route' : 'fa-book-open';
  const typeColor = type === 'roadmap' ? 'indigo' : 'cyan';
  
  const container = document.createElement('div');
  container.className = 'generation-confirm-buttons flex flex-wrap items-center gap-3 mt-3';
  
  // 이대로 진행 버튼
  const proceedBtn = document.createElement('button');
  proceedBtn.type = 'button';
  proceedBtn.className = `flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 shadow-lg hover:shadow-emerald-500/25 hover:scale-105`;
  proceedBtn.innerHTML = `<i class="fas fa-check"></i> 이대로 진행하기`;
  proceedBtn.onclick = () => {
    container.remove();
    onProceed();
  };
  
  // 다시 생성 버튼
  const regenerateBtn = document.createElement('button');
  regenerateBtn.type = 'button';
  regenerateBtn.className = `flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200`;
  regenerateBtn.innerHTML = `<i class="fas fa-sync-alt"></i> ${typeLabel} 다시 생성`;
  regenerateBtn.onclick = () => {
    container.remove();
    onRegenerate();
  };
  
  container.appendChild(proceedBtn);
  container.appendChild(regenerateBtn);
  
  addChatMessage('ai', container);
}

/**
 * HTML 이스케이프 유틸 (XSS 방지)
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function setLoading(isLoading, message = '') {
  state.isAwaitingResponse = isLoading;
  const existingLoader = dom.chatLog?.querySelector?.('.loader-message');
  if (existingLoader) existingLoader.remove();

  if (dom.newTopicBtn) dom.newTopicBtn.disabled = isLoading;
  if (dom.chatInput) dom.chatInput.disabled = isLoading;
  const submitBtn = dom.chatForm?.querySelector('button');
  if (submitBtn) submitBtn.disabled = isLoading;

  if (isLoading) {
    const loadingEl = addChatMessage('ai', message || 'AI 튜터가 답변을 준비 중입니다...');
    loadingEl.classList.add('loader-message');
    const icon = loadingEl.querySelector('i');
    if (icon) {
      icon.classList.remove('fa-user-astronaut');
      icon.classList.add('fa-spinner', 'fa-spin');
    }
  }

  // 활동 패널 컨트롤 버튼 일시 비활성화/복원
  try {
    const controls = document.getElementById('activity-controls');
    if (controls) {
      controls.querySelectorAll('button').forEach((btn) => {
        btn.disabled = isLoading;
      });
    }
  } catch {}
}

export function displayCodingView() {
  console.log('[UI] displayCodingView 호출됨');
  
  // problem-container 표시 (main.js에서 숨겨놓은 것 복원)
  const problemContainer = document.getElementById('problem-container');
  if (problemContainer) {
    problemContainer.classList.remove('hidden');
    console.log('[UI] problem-container 표시 완료');
  }
  
  // 환영 화면 숨기고 문제 영역 표시
  const welcomeScreen = document.getElementById('welcome-screen');
  const problemArea = document.getElementById('problem-area');
  
  console.log('[UI] welcomeScreen:', welcomeScreen);
  console.log('[UI] problemArea:', problemArea);
  
  if (welcomeScreen) {
    welcomeScreen.classList.add('hidden');
    console.log('[UI] welcome-screen 숨김 처리 완료');
  }
  if (problemArea) {
    problemArea.classList.remove('hidden');
    console.log('[UI] problem-area 표시 처리 완료');
  }
}

// [신규] 개념/문제풀이 선택 버튼 표시
export function showStepOptions() {
  const options = document.createElement('div');
  options.className = 'flex items-center gap-2 mt-2';

  const btnConcept = document.createElement('button');
  btnConcept.type = 'button';
  btnConcept.textContent = '핵심 개념 보기 🧠';
  btnConcept.className = 'bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold py-2 px-3 rounded-md';
  btnConcept.onclick = () => window.App?.Flow?.fetchLessonExplanationForCurrentStep?.();

  const btnProblem = document.createElement('button');
  btnProblem.type = 'button';
  btnProblem.textContent = '바로 문제 풀기 💪';
  btnProblem.className = 'bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 px-3 rounded-md';
  // 문제 패널 표시까지 포함된 흐름으로 연결
  btnProblem.onclick = () => window.App?.Flow?.goToCurrentStepProblem?.();

  options.appendChild(btnConcept);
  options.appendChild(btnProblem);
  addChatMessage('ai', options);
}

// [신규] 레슨 완료 기록 헬퍼 (대시보드용)
// 백그라운드에서 실행되며, 실패해도 사용자 경험에 영향 없음
async function recordLessonCompletion() {
  try {
    const topic = state.intendedTopic || state.currentCurriculum?.topic || '';
    const lessonTitle = state.currentLessonPlan?.title || '';
    const userCode = getCurrentCode() || '';
    
    // [Scaffolding] 완료된 단원의 learned_keywords를 커리큘럼에 저장
    // 이후 단원 생성 시 중복 방지용으로 사용됨
    if (state.currentCurriculum && Array.isArray(state.currentCurriculum) && state.currentStepIndex >= 0) {
      const currentStep = state.currentCurriculum[state.currentStepIndex];
      if (currentStep && state.currentLessonPlan?.learned_keywords) {
        currentStep.learned_keywords = state.currentLessonPlan.learned_keywords;
        currentStep.completed = true;
        console.log('[SCAFFOLDING] 단원 완료 - learned_keywords 저장:', currentStep.learned_keywords);
      }
    }
    
    // [구조적 개선] 로드맵 모드에서 Step 완료 API 호출
    const steps = Array.isArray(state.currentCurriculum?.curriculum) ? state.currentCurriculum.curriculum : [];
    const currentStepIdx = state.currentLessonStepIndex ?? 0;
    const isLastStep = currentStepIdx >= steps.length - 1;
    
    console.log('[UI] recordLessonCompletion - steps:', steps.length, 'currentStepIdx:', currentStepIdx, 'isLastStep:', isLastStep);
    
    if (state.isRoadmapMode) {
      try {
        const { postJSON } = await import('./config.js');
        const ctx = state.roadmapContext || {};
        const phaseIndex = ctx.pIdx ?? 0;
        const topicIndex = ctx.tIdx ?? 0;
        const stepIndex = currentStepIdx;
        
        // Step 완료 API 호출 (XP 중복 방지 포함)
        console.log('[UI] Step 완료 API 호출:', { phaseIndex, topicIndex, stepIndex, isLastStep });
        const completeRes = await postJSON('/roadmap/complete_step', {
          phase_index: phaseIndex,
          topic_index: topicIndex,
          step_index: stepIndex
        });
        console.log('[UI] complete_step 결과:', completeRes);
        
        // XP 획득 정보를 state에 저장 (UI에서 사용)
        state.lastStepCompletion = {
          xpGained: completeRes.xp_gained || 0,
          alreadyCompleted: completeRes.already_completed || false,
          allStepsCompleted: completeRes.all_steps_completed || false
        };
        
        // [구조적 개선] 로컬 curriculumProgress 캐시 업데이트
        if (completeRes.step_progress) {
          if (!state.curriculumProgress) {
            state.curriculumProgress = [];
          }
          state.curriculumProgress[stepIndex] = completeRes.step_progress;
          console.log('[UI] curriculumProgress 캐시 업데이트:', state.curriculumProgress);
        }
        
        // 🔥 [핵심 수정] 마지막 Step이면 무조건 unlock_next 호출
        // 서버의 all_steps_completed 대신 프론트에서 직접 판단
        console.log('[UI] Step 완료 - isLastStep:', isLastStep, ', all_steps_completed:', completeRes.all_steps_completed);
        
        if (isLastStep) {
          console.log('[UI] 🎉 마지막 Step 완료! unlock_next 호출');
          const unlockRes = await postJSON('/roadmap/unlock_next', {
            phase_index: phaseIndex,
            topic_index: topicIndex
          });
          console.log('[UI] unlock_next 결과:', unlockRes);
        }
      } catch (e) {
        console.warn('[UI] Step 완료 처리 실패:', e);
      }
    }
    
    // 간단한 요약 생성 (AI 호출 없이 기본 메시지)
    const summary = `'${lessonTitle}' 단원을 성공적으로 완료했습니다.`;
    
    await completeLesson(topic, lessonTitle, summary, userCode);
    console.log('[UI] 레슨 완료 기록 성공');
  } catch (error) {
    // 실패해도 무시 (사용자 경험에 영향 없음)
    console.warn('[UI] 레슨 완료 기록 실패 (무시됨):', error);
  }
}

// [신규] 정답 후 사용자 선택 메뉴(리뷰/챌린지/다음 단계) - 세련된 디자인
// isRestore: 새로고침 후 복원 시 true (축하 메시지 중복 방지)
export function showChoiceMenu(isRestore = false) {
  // 🌟 루나 페르소나 반응 - proud 상태 유지
  const { setTutorExpression, TUTOR } = window.TutorPersona || {};
  if (setTutorExpression) setTutorExpression('proud');
  
  // [신규] 단원 완료 상태 저장 (새로고침 시 복원용)
  state.lessonCompleted = true;
  
  // [신규] 대시보드용 레슨 완료 기록 (복원 시에는 스킵)
  if (!isRestore) {
    recordLessonCompletion();
  }
  
  // 🔥 [수정] 로드맵 모드 처리 - localStorage에서 강제 복원
  let isRoadmapMode = state.isRoadmapMode || false;
  let roadmapContext = state.roadmapContext;
  
  // state에 없으면 localStorage에서 복원 시도 (복습 모드에서 중요!)
  if (!isRoadmapMode || !roadmapContext) {
    try {
      const ctxStr = localStorage.getItem('roadmap_context');
      if (ctxStr) {
        roadmapContext = JSON.parse(ctxStr);
        isRoadmapMode = true;
        // state에도 복원
        state.isRoadmapMode = true;
        state.roadmapContext = roadmapContext;
        console.log('[showChoiceMenu] 로드맵 컨텍스트 localStorage에서 복원:', roadmapContext);
      }
    } catch (e) {
      console.warn('[showChoiceMenu] 로드맵 컨텍스트 복원 실패:', e);
    }
  }
  
  const wrap = document.createElement('div');
  wrap.className = 'choice-menu-card';
  wrap.innerHTML = `
    <div class="choice-header">
      <span class="choice-icon">🎉</span>
      <span class="choice-title">단원 완료!</span>
    </div>
    <p class="choice-subtitle">다음 학습을 선택하세요</p>
    <div class="choice-buttons"></div>
  `;

  const btnsContainer = wrap.querySelector('.choice-buttons');

  const btnReview = document.createElement('button');
  btnReview.type = 'button';
  btnReview.className = 'choice-btn choice-btn-review';
  btnReview.innerHTML = `
    <i class="fas fa-redo"></i>
    <span class="btn-label">개념 다지기</span>
    <span class="btn-desc">같은 문제 다시 풀기</span>
  `;
  btnReview.onclick = () => {
    closeResultModal();  // [UX] 시뮬레이션 모달 자동 닫기
    disableChoiceButtons(wrap);  // [UX] 선택 버튼 비활성화
    state.lessonCompleted = false;  // 새 활동 시작 시 리셋
    state.currentProblemXpAwarded = false;  // XP 중복 방지 플래그 리셋
    setLoading(true, '개념 다지기 문제를 준비하고 있어요...');
    window.App?.Flow?.startReviewExercise?.();
  };

  const btnChallenge = document.createElement('button');
  btnChallenge.type = 'button';
  btnChallenge.className = 'choice-btn choice-btn-challenge';
  btnChallenge.innerHTML = `
    <i class="fas fa-fire"></i>
    <span class="btn-label">실력 확인하기</span>
    <span class="btn-desc">응용 문제 도전</span>
  `;
  btnChallenge.onclick = () => {
    closeResultModal();  // [UX] 시뮬레이션 모달 자동 닫기
    disableChoiceButtons(wrap);  // [UX] 선택 버튼 비활성화
    state.lessonCompleted = false;  // 새 활동 시작 시 리셋
    state.currentProblemXpAwarded = false;  // XP 중복 방지 플래그 리셋
    setLoading(true, 'IDE 챌린지 문제를 생성하고 있어요...');
    window.dispatchEvent(new CustomEvent('app:request-challenge'));
  };

  const btnNext = document.createElement('button');
  btnNext.type = 'button';
  btnNext.className = 'choice-btn choice-btn-next';
  btnNext.innerHTML = `
    <i class="fas fa-arrow-right"></i>
    <span class="btn-label">다음 단계로</span>
    <span class="btn-desc">새로운 개념 학습</span>
  `;
  btnNext.onclick = () => {
    closeResultModal();  // [UX] 시뮬레이션 모달 자동 닫기
    disableChoiceButtons(wrap);  // [UX] 선택 버튼 비활성화
    state.lessonCompleted = false;  // 새 활동 시작 시 리셋
    state.currentProblemXpAwarded = false;  // XP 중복 방지 플래그 리셋
    goToNextStepExplanation();
  };

  btnsContainer.appendChild(btnReview);
  btnsContainer.appendChild(btnChallenge);
  
  // [구조적 개선] 로드맵 모드에서 마지막 Step 확인
  const steps = Array.isArray(state.currentCurriculum?.curriculum) ? state.currentCurriculum.curriculum : [];
  const isLastStep = state.currentStepIndex >= steps.length - 1;
  
  // 로드맵 모드 + 마지막 Step이면 "다음 단계로" 대신 "로드맵으로" 버튼만 표시
  if (isRoadmapMode && isLastStep) {
    // 마지막 Step: 로드맵 이동 버튼만 (다음 단계 없음)
    const btnRoadmap = document.createElement('button');
    btnRoadmap.type = 'button';
    btnRoadmap.className = 'choice-btn choice-btn-roadmap';
    btnRoadmap.style.cssText = 'background: linear-gradient(135deg, #6366f1, #8b5cf6); border-color: #a78bfa;';
    btnRoadmap.innerHTML = `
      <i class="fas fa-map"></i>
      <span class="btn-label">다음 토픽 시작</span>
      <span class="btn-desc">로드맵에서 진행</span>
    `;
    btnRoadmap.onclick = async () => {
      closeResultModal();
      disableChoiceButtons(wrap);
      
      // 🔥 [안전장치] 로드맵 이동 전 unlock_next 한번 더 호출 (중복 호출해도 안전)
      try {
        const { postJSON } = await import('./config.js');
        const ctx = state.roadmapContext || {};
        if (ctx.pIdx !== undefined && ctx.tIdx !== undefined) {
          console.log('[Roadmap] 🔓 토픽 완료 unlock_next 호출 (안전장치)');
          const unlockRes = await postJSON('/roadmap/unlock_next', {
            phase_index: ctx.pIdx,
            topic_index: ctx.tIdx
          });
          console.log('[Roadmap] unlock_next 결과:', unlockRes);
        }
      } catch (e) {
        console.warn('[Roadmap] unlock_next 호출 실패 (무시):', e);
      }
      
      console.log('[Roadmap] 토픽 완료 - 로드맵 페이지로 이동');
      window.location.href = 'roadmap.html';
    };
    btnsContainer.appendChild(btnRoadmap);
  } else if (isRoadmapMode) {
    // 중간 Step: "다음 단계로" + "로드맵 보기" 둘 다 표시
    btnsContainer.appendChild(btnNext);
    
    const btnRoadmap = document.createElement('button');
    btnRoadmap.type = 'button';
    btnRoadmap.className = 'choice-btn choice-btn-roadmap';
    btnRoadmap.style.cssText = 'background: linear-gradient(135deg, #6366f1, #8b5cf6); border-color: #a78bfa;';
    btnRoadmap.innerHTML = `
      <i class="fas fa-map"></i>
      <span class="btn-label">로드맵 보기</span>
      <span class="btn-desc">진행 상황 확인</span>
    `;
    btnRoadmap.onclick = async () => {
      closeResultModal();
      disableChoiceButtons(wrap);
      console.log('[Roadmap] 로드맵 페이지로 이동');
      window.location.href = 'roadmap.html';
    };
    btnsContainer.appendChild(btnRoadmap);
  } else {
    // 일반 모드: "다음 단계로"만 표시
    btnsContainer.appendChild(btnNext);
  }

  // [수정] 복원 시에는 축하 메시지를 출력하지 않음 (이미 채팅 히스토리에서 렌더링됨)
  if (!isRestore) {
    // [구조적 개선] XP 정보 포함 축하 메시지
    let celebrationMsg = TUTOR?.messages?.lessonComplete?.() || '🎉 이 단원을 완료했어요!';
    
    // Step 완료 정보가 있으면 XP 메시지 추가
    if (state.lastStepCompletion) {
      const { xpGained, alreadyCompleted, allStepsCompleted } = state.lastStepCompletion;
      if (alreadyCompleted) {
        celebrationMsg += '\n\n📚 이미 완료한 단원입니다. 복습 모드로 학습했어요!';
      } else if (xpGained > 0) {
        celebrationMsg += `\n\n✨ +${xpGained} XP 획득!`;
        if (allStepsCompleted) {
          celebrationMsg += ' 🏆 이 토픽의 모든 단원을 완료했어요!';
        }
      }
      // 사용 후 초기화
      state.lastStepCompletion = null;
    }
    
    addChatMessage('ai', celebrationMsg);  // 히스토리에 저장됨
  }
  
  // 선택지 버튼은 항상 출력 (DOM 요소라서 히스토리에 저장 안 됨)
  addChatMessage('ai', wrap);
  
  // 상태 서버에 저장 (복원 시에는 저장 불필요)
  if (!isRestore) {
    console.log('[showChoiceMenu] lessonCompleted 저장:', state.lessonCompleted);
    saveStateToServer();
    console.log('[showChoiceMenu] saveStateToServer 호출 완료');
  }
  // 표정 유지 - 다음 상호작용까지 proud 상태 유지
}

// [신규] 피드백 후 맥락 버튼 부착
export function appendContextualButtons(messageEl, feedbackType) {
  try {
    const container = document.createElement('div');
    container.className = 'flex items-center gap-2 mt-3 pt-2 border-t border-slate-600';

    if (feedbackType === 'wrong_answer') {
      const hintBtn = document.createElement('button');
      hintBtn.type = 'button';
      hintBtn.textContent = '결정적인 힌트 보기 🤔';
      hintBtn.className = 'bg-yellow-600 hover:bg-yellow-700 text-white text-sm py-1 px-2 rounded-md';
      hintBtn.onclick = () => window.App?.Flow?.requestHint?.('decisive');
      container.appendChild(hintBtn);
    }

    const card = messageEl?.querySelector?.('.p-3');
    if (card) card.appendChild(container);
  } catch (e) {
    // no-op
  }
}

// [신규] 정답 피드백 후, 다음 행동 유도 버튼 생성
export function appendNextActionButtons(isBasicExerciseCorrect) {
  try {
    // [보강] 이미 선택 메뉴가 표시되어 있다면 중복 버튼을 추가하지 않습니다.
    const lastCard = dom.chatLog?.lastElementChild?.querySelector?.('.p-3');
    if (lastCard && lastCard.querySelector('.choice-menu')) {
      return;
    }
    const container = document.createElement('div');
    container.className = 'flex items-center gap-2 mt-3 pt-2 border-t border-slate-600';

    if (isBasicExerciseCorrect) {
      const challengeBtn = document.createElement('button');
      challengeBtn.type = 'button';
      challengeBtn.textContent = '응용 과제 풀기 🚀';
      challengeBtn.className = 'bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 px-3 rounded-md';
      challengeBtn.onclick = () => {
        window.dispatchEvent(new CustomEvent('app:request-challenge'));
      };
      container.appendChild(challengeBtn);
    }

    const nextChapterBtn = document.createElement('button');
    nextChapterBtn.type = 'button';
    nextChapterBtn.textContent = '다음 챕터로 이동 ➡️';
    nextChapterBtn.className = 'bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold py-2 px-3 rounded-md';
    nextChapterBtn.onclick = () => {
      window.dispatchEvent(new CustomEvent('app:next-chapter'));
    };
    container.appendChild(nextChapterBtn);

    const lastMessage = dom.chatLog?.lastElementChild?.querySelector?.('.p-3');
    if (lastMessage) lastMessage.appendChild(container);
  } catch {}
}

// ============================================
// [신규] 로드맵 프리뷰 카드 UI
// ============================================

/**
 * 채팅창에 인터랙티브한 로드맵 프리뷰 카드를 렌더링합니다.
 * @param {Object} roadmapData - 로드맵 데이터 (roadmap_title, description, phases 등)
 * @param {Object} callbacks - 버튼 콜백 함수 { onConfirm, onRegenerate }
 */
export function renderRoadmapPreview(roadmapData, callbacks = {}) {
  if (!roadmapData) return;
  
  const { onConfirm, onRegenerate } = callbacks;
  
  const card = document.createElement('div');
  card.className = 'roadmap-preview-card bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl overflow-hidden mt-2 shadow-2xl max-w-md';
  
  // Phase별 아이콘 매핑
  const phaseIcons = ['fa-seedling', 'fa-code', 'fa-database', 'fa-server', 'fa-rocket', 'fa-trophy'];
  const phaseColors = ['cyan', 'blue', 'purple', 'indigo', 'pink', 'amber'];
  
  // 총 토픽 수 계산
  const totalTopics = roadmapData.phases?.reduce((sum, p) => sum + (p.topics?.length || 0), 0) || 0;
  const totalPhases = roadmapData.phases?.length || 0;
  
  card.innerHTML = `
    <!-- 카드 헤더 -->
    <div class="relative bg-gradient-to-r from-indigo-900/90 via-purple-900/80 to-slate-900/90 p-4 border-b border-indigo-500/30 overflow-hidden">
      <!-- 배경 장식 -->
      <div class="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
      <div class="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>
      
      <div class="relative flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-indigo-500/30 text-indigo-300 font-bold mb-2">
            <i class="fas fa-sparkles text-[8px]"></i>
            ROADMAP GENERATED
          </span>
          <h3 class="text-base font-bold text-white leading-tight">${escapeHtml(roadmapData.roadmap_title || '학습 로드맵')}</h3>
          <p class="text-[11px] text-slate-400 mt-1 line-clamp-2">${escapeHtml(roadmapData.description || '')}</p>
        </div>
        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-indigo-300 shrink-0 border border-indigo-500/20">
          <i class="fas fa-route text-lg"></i>
        </div>
      </div>
      
      <!-- 통계 -->
      <div class="relative flex items-center gap-4 mt-3 text-[10px] text-slate-400">
        <span class="flex items-center gap-1">
          <i class="fas fa-layer-group text-purple-400"></i>
          ${totalPhases} Phases
        </span>
        <span class="flex items-center gap-1">
          <i class="fas fa-book text-cyan-400"></i>
          ${totalTopics} Topics
        </span>
        <span class="flex items-center gap-1">
          <i class="fas fa-clock text-amber-400"></i>
          ${escapeHtml(roadmapData.estimated_duration || '3-4개월')}
        </span>
      </div>
    </div>
    
    <!-- Phase 목록 -->
    <div class="p-3 space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
      <div class="phases-preview space-y-1.5"></div>
    </div>
    
    <!-- 액션 버튼 - 3개 통합 -->
    <div class="p-3 bg-slate-800/80 border-t border-slate-700/50">
      <div class="flex gap-2">
        <button class="btn-view-roadmap flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 border border-slate-600">
          <i class="fas fa-search"></i>
          상세 보기
        </button>
        <button class="btn-regenerate-roadmap flex-1 bg-slate-700 hover:bg-amber-600/80 text-slate-300 hover:text-white text-xs font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 border border-slate-600 hover:border-amber-500/50">
          <i class="fas fa-sync-alt"></i>
          재생성
        </button>
        <button class="btn-start-roadmap flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20">
          <i class="fas fa-rocket"></i>
          시작하기
        </button>
      </div>
    </div>
  `;
  
  // Phases 목록 동적 생성
  const listContainer = card.querySelector('.phases-preview');
  if (roadmapData.phases && listContainer) {
    roadmapData.phases.forEach((phase, idx) => {
      const iconClass = phase.icon || phaseIcons[idx % phaseIcons.length];
      const colorName = phaseColors[idx % phaseColors.length];
      const topicCount = phase.topics?.length || 0;
      
      // Phase 제목에서 "Phase N." 접두사 제거 (이미 배지로 표시됨)
      let displayTitle = phase.title || '';
      displayTitle = displayTitle.replace(/^Phase\s*\d+\.?\s*/i, '').trim() || displayTitle;
      
      const item = document.createElement('div');
      item.className = 'flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/50 transition-colors group';
      item.innerHTML = `
        <div class="w-7 h-7 rounded-lg bg-${colorName}-500/20 flex items-center justify-center shrink-0 group-hover:bg-${colorName}-500/30 transition-colors">
          <i class="fas ${iconClass} text-${colorName}-400 text-[10px]"></i>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="text-[9px] text-slate-500 font-medium">Phase ${idx + 1}</span>
            ${idx === 0 ? '<span class="text-[8px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">시작</span>' : ''}
          </div>
          <div class="text-[11px] font-medium text-slate-200 truncate leading-tight">${escapeHtml(displayTitle)}</div>
        </div>
        <div class="text-[9px] text-slate-500 shrink-0">${topicCount} topics</div>
      `;
      listContainer.appendChild(item);
    });
  }
  
  // 이벤트 바인딩
  const viewBtn = card.querySelector('.btn-view-roadmap');
  const regenerateBtn = card.querySelector('.btn-regenerate-roadmap');
  const startBtn = card.querySelector('.btn-start-roadmap');
  
  if (viewBtn) {
    viewBtn.onclick = () => {
      window.location.href = 'roadmap.html';
    };
  }
  
  // [신규] 재생성 버튼
  if (regenerateBtn) {
    if (onRegenerate) {
      regenerateBtn.onclick = () => {
        // 버튼 비활성화 (중복 클릭 방지)
        card.querySelectorAll('button').forEach(btn => btn.disabled = true);
        onRegenerate();
      };
    } else {
      // 콜백이 없으면 재생성 버튼 숨기기
      regenerateBtn.classList.add('hidden');
    }
  }
  
  if (startBtn) {
    startBtn.onclick = () => {
      // 버튼 비활성화 (중복 클릭 방지)
      card.querySelectorAll('button').forEach(btn => btn.disabled = true);
      
      // onConfirm 콜백이 있으면 먼저 호출 (상태 설정 등)
      if (onConfirm) {
        onConfirm();
      }
      
      // 첫 번째 활성 토픽 찾기
      const firstPhase = roadmapData.phases?.[0];
      const firstTopic = firstPhase?.topics?.[0];
      
      if (firstTopic) {
        // 로드맵 컨텍스트 저장
        localStorage.setItem('roadmap_context', JSON.stringify({
          topic: firstTopic.title,
          description: firstTopic.description,
          pIdx: 0,
          tIdx: 0,
          roadmapTitle: roadmapData.roadmap_title
        }));
        
        // 로드맵 모드로 학습 시작
        window.location.href = `index.html?mode=roadmap&topic=${encodeURIComponent(firstTopic.title)}`;
      } else {
        window.location.href = 'roadmap.html';
      }
    };
  }
  
  // 채팅창에 추가
  addChatMessage('ai', card);
}

// ============================================
// [신규] 사이드바 로드맵 위젯 업데이트
// ============================================

/**
 * 사이드바의 로드맵 컨텍스트 위젯을 업데이트합니다.
 * @param {Object} roadmapData - 현재 로드맵 데이터
 * @param {number} currentPhaseIdx - 현재 Phase 인덱스
 * @param {number} currentTopicIdx - 현재 Topic 인덱스
 */
export function updateRoadmapWidget(roadmapData, currentPhaseIdx = 0, currentTopicIdx = 0) {
  const widget = document.getElementById('roadmap-widget');
  const curriculumHeader = document.getElementById('curriculum-header');
  
  if (!widget) return;
  
  if (!roadmapData) {
    // 로드맵 없음 - 위젯 숨기기
    widget.classList.add('hidden');
    if (curriculumHeader) curriculumHeader.classList.remove('hidden');
    return;
  }
  
  // 위젯 표시
  widget.classList.remove('hidden');
  if (curriculumHeader) curriculumHeader.classList.add('hidden');
  
  const phases = roadmapData.phases || [];
  const currentPhase = phases[currentPhaseIdx];
  
  if (!currentPhase) return;
  
  const topics = currentPhase.topics || [];
  const currentTopic = topics[currentTopicIdx];
  const completedTopics = topics.filter(t => t.status === 'completed').length;
  const progressPercent = topics.length > 0 ? Math.round((completedTopics / topics.length) * 100) : 0;
  
  // Phase 제목 업데이트
  const phaseTitle = document.getElementById('roadmap-phase-title');
  if (phaseTitle) {
    // Phase 제목에서 "Phase N." 중복 방지
    let title = currentPhase.title || '';
    if (/^Phase\s*\d+/i.test(title)) {
      // 이미 "Phase N"으로 시작하면 그대로 사용
      phaseTitle.textContent = title;
    } else {
      phaseTitle.textContent = `Topic ${currentPhaseIdx + 1}. ${title}`;
    }
  }
  
  // 브레드크럼 업데이트
  const breadcrumb = document.getElementById('roadmap-breadcrumb');
  if (breadcrumb && currentTopic) {
    // Phase 번호 표시 - 제목에 이미 Phase가 있으면 그대로, 없으면 번호만
    const phaseLabel = /^Phase\s*\d+/i.test(currentPhase.title || '') 
      ? currentPhase.title.match(/^Phase\s*\d+/i)[0]
      : `Topic ${currentPhaseIdx + 1}`;
    breadcrumb.innerHTML = `
      <span class="text-indigo-400">${escapeHtml(phaseLabel)}</span>
      <i class="fas fa-chevron-right text-[7px] mx-1 text-slate-600"></i>
      <span class="text-cyan-400">${escapeHtml(currentTopic.title || '')}</span>
    `;
  }
  
  // 진행률 바 업데이트
  const progressBar = document.getElementById('roadmap-phase-progress');
  if (progressBar) {
    progressBar.style.width = `${progressPercent}%`;
  }
  
  // 진행률 텍스트 업데이트
  const progressText = document.getElementById('roadmap-progress-text');
  if (progressText) {
    progressText.textContent = `${completedTopics}/${topics.length} Topics`;
  }
  
  const progressPercentEl = document.getElementById('roadmap-progress-percent');
  if (progressPercentEl) {
    progressPercentEl.textContent = `${progressPercent}%`;
  }
  
  // 전체보기 버튼 이벤트
  const viewFullBtn = document.getElementById('view-full-roadmap-btn');
  if (viewFullBtn && !viewFullBtn.dataset.bound) {
    viewFullBtn.dataset.bound = 'true';
    viewFullBtn.onclick = () => {
      window.location.href = 'roadmap.html';
    };
  }
}

/**
 * 로드맵 모드 활성화/비활성화
 * @param {boolean} active - 활성화 여부
 */
export function setRoadmapMode(active) {
  const widget = document.getElementById('roadmap-widget');
  const curriculumHeader = document.getElementById('curriculum-header');
  
  if (active) {
    if (widget) widget.classList.remove('hidden');
    if (curriculumHeader) curriculumHeader.classList.add('hidden');
  } else {
    if (widget) widget.classList.add('hidden');
    if (curriculumHeader) curriculumHeader.classList.remove('hidden');
  }
}

