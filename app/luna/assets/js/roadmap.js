/**
 * ============================================================
 * AI Coding Tutor - Career Roadmap Module
 * ============================================================
 * 커리어 로드맵 페이지의 모든 기능을 관리합니다.
 * - 로드맵 생성/조회
 * - 토픽 언락 및 진행률 관리
 * - 레슨 시작 연동
 * ============================================================
 */

import { getJSON, postJSON, postAIGeneration, TIMEOUT } from './config.js';

// ========== DOM 요소 ==========
const dom = {
  // 뷰 컨테이너
  createView: document.getElementById('create-view'),
  roadmapView: document.getElementById('roadmap-view'),
  loadingView: document.getElementById('loading-view'),
  
  // 생성 화면 요소
  goalInput: document.getElementById('goal-input'),
  generateBtn: document.getElementById('generate-btn'),
  goalTags: document.querySelectorAll('.goal-tag'),
  
  // 로드맵 헤더 요소
  headerProgress: document.getElementById('header-progress'),
  progressPercent: document.getElementById('progress-percent'),
  headerProgressBar: document.getElementById('header-progress-bar'),
  resetBtn: document.getElementById('reset-roadmap-btn'),
  
  // 로드맵 정보 요소
  roadmapTitle: document.getElementById('roadmap-title'),
  roadmapDesc: document.getElementById('roadmap-desc'),
  roadmapDuration: document.getElementById('roadmap-duration'),
  phaseCount: document.getElementById('phase-count'),
  topicCount: document.getElementById('topic-count'),
  mainProgress: document.getElementById('main-progress'),
  mainProgressBar: document.getElementById('main-progress-bar'),
  phasesContainer: document.getElementById('phases-container'),
  
  // 모달
  completeModal: document.getElementById('complete-modal'),
  modalNewRoadmap: document.getElementById('modal-new-roadmap'),
  modalClose: document.getElementById('modal-close'),
};

// ========== 상태 ==========
let currentRoadmap = null;

// ========== 초기화 ==========
async function init() {
  // 인증 체크
  try {
    const authRes = await getJSON('/check_auth');
    if (!authRes.authenticated) {
      window.location.href = 'login.html';
      return;
    }
  } catch (e) {
    console.error('Auth check failed:', e);
    window.location.href = 'login.html';
    return;
  }
  
  // 이벤트 바인딩
  bindEvents();
  
  // 로드맵 로드
  await loadRoadmap();
}

// ========== 이벤트 바인딩 ==========
function bindEvents() {
  // 로드맵 생성 버튼
  dom.generateBtn.addEventListener('click', handleGenerate);
  
  // 엔터키로 생성
  dom.goalInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleGenerate();
  });
  
  // 인기 목표 태그 클릭
  dom.goalTags.forEach(tag => {
    tag.addEventListener('click', () => {
      dom.goalInput.value = tag.textContent.trim();
      dom.goalInput.focus();
    });
  });
  
  // 초기화 버튼
  dom.resetBtn.addEventListener('click', handleReset);
  
  // 모달 버튼
  dom.modalNewRoadmap.addEventListener('click', () => {
    dom.completeModal.classList.add('hidden');
    handleReset();
  });
  
  dom.modalClose.addEventListener('click', () => {
    dom.completeModal.classList.add('hidden');
  });
}

// ========== 뷰 전환 ==========
function showView(viewName) {
  dom.createView.classList.add('hidden');
  dom.roadmapView.classList.add('hidden');
  dom.loadingView.classList.add('hidden');
  
  switch (viewName) {
    case 'create':
      dom.createView.classList.remove('hidden');
      dom.headerProgress.classList.add('hidden');
      dom.resetBtn.classList.add('hidden');
      break;
    case 'roadmap':
      dom.roadmapView.classList.remove('hidden');
      dom.headerProgress.classList.remove('hidden');
      dom.headerProgress.classList.add('flex');
      dom.resetBtn.classList.remove('hidden');
      break;
    case 'loading':
      dom.loadingView.classList.remove('hidden');
      break;
  }
}

// ========== 로드맵 로드 ==========
async function loadRoadmap() {
  showView('loading');
  
  try {
    const res = await getJSON('/roadmap');
    
    if (res.has_roadmap && res.roadmap) {
      currentRoadmap = res.roadmap;
      renderRoadmap(res.roadmap);
      showView('roadmap');
    } else {
      showView('create');
    }
  } catch (e) {
    console.error('Load roadmap failed:', e);
    showView('create');
  }
}

// ========== 로드맵 생성 ==========
async function handleGenerate() {
  const goal = dom.goalInput.value.trim();
  if (!goal) {
    dom.goalInput.focus();
    dom.goalInput.classList.add('border-red-500');
    setTimeout(() => dom.goalInput.classList.remove('border-red-500'), 2000);
    return;
  }
  
  // 버튼 비활성화
  dom.generateBtn.disabled = true;
  dom.generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>AI가 설계 중... (최대 2분 소요)';
  
  showView('loading');
  
  try {
    // [수정] AI 생성 전용 함수 사용 (120초 타임아웃)
    const roadmap = await postAIGeneration('/roadmap/generate', { goal });
    
    // 로드맵이 비어있으면 에러 처리
    if (!roadmap || !roadmap.phases || roadmap.phases.length === 0) {
      throw new Error('로드맵 생성 결과가 비어있습니다.');
    }
    
    currentRoadmap = roadmap;
    renderRoadmap(roadmap);
    showView('roadmap');
  } catch (e) {
    console.error('Generate failed:', e);
    // [개선] 에러 시 생성 화면으로 복귀하고 명확한 안내
    showGenerationError('로드맵', e.message);
    showView('create');
  } finally {
    dom.generateBtn.disabled = false;
    dom.generateBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles mr-2"></i>로드맵 생성하기';
  }
}

// [신규] 생성 실패 시 에러 UI 표시
function showGenerationError(type, message) {
  // 기존 에러 메시지 제거
  const existingError = document.getElementById('generation-error');
  if (existingError) existingError.remove();
  
  const errorDiv = document.createElement('div');
  errorDiv.id = 'generation-error';
  errorDiv.className = 'bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 text-center';
  errorDiv.innerHTML = `
    <div class="flex items-center justify-center gap-2 text-red-400 mb-2">
      <i class="fas fa-exclamation-triangle"></i>
      <span class="font-medium">${type} 생성에 실패했어요</span>
    </div>
    <p class="text-sm text-slate-400 mb-3">${message || '잠시 후 다시 시도해주세요.'}</p>
    <button onclick="this.parentElement.remove()" class="text-xs text-slate-500 hover:text-slate-400">
      <i class="fas fa-times mr-1"></i>닫기
    </button>
  `;
  
  // 생성 버튼 위에 삽입
  dom.generateBtn.parentElement.insertBefore(errorDiv, dom.generateBtn);
}

// ========== 로드맵 초기화 ==========
async function handleReset() {
  if (!confirm('정말 로드맵을 초기화할까요?\n모든 진행 상황이 삭제됩니다.')) return;
  
  try {
    await postJSON('/roadmap/reset', {});
    currentRoadmap = null;
    dom.goalInput.value = '';
    showView('create');
  } catch (e) {
    console.error('Reset failed:', e);
    alert('초기화에 실패했어요. 다시 시도해주세요.');
  }
}

// ========== 로드맵 렌더링 ==========
function renderRoadmap(data) {
  // 헤더 정보 업데이트
  dom.roadmapTitle.textContent = data.roadmap_title || '학습 로드맵';
  dom.roadmapDesc.textContent = data.description || '';
  dom.roadmapDuration.textContent = data.estimated_duration || '3-4개월';
  
  const phases = data.phases || [];
  const totalTopics = phases.reduce((sum, p) => sum + (p.topics?.length || 0), 0);
  
  dom.phaseCount.textContent = phases.length;
  dom.topicCount.textContent = totalTopics;
  
  // 진행률 업데이트
  const progress = data.total_progress || 0;
  updateProgress(progress);
  
  // 페이즈 렌더링
  dom.phasesContainer.innerHTML = '';
  
  phases.forEach((phase, pIdx) => {
    const phaseEl = createPhaseElement(phase, pIdx, phases.length);
    dom.phasesContainer.appendChild(phaseEl);
  });
}

// ========== 페이즈 요소 생성 ==========
function createPhaseElement(phase, pIdx, totalPhases) {
  const topics = phase.topics || [];
  const completedTopics = topics.filter(t => t.status === 'completed').length;
  const hasActiveTopic = topics.some(t => t.status === 'active');
  const isPhaseComplete = completedTopics === topics.length && topics.length > 0;
  
  // 페이즈 상태 결정
  let phaseStatus = 'locked';
  if (isPhaseComplete) phaseStatus = 'completed';
  else if (hasActiveTopic || completedTopics > 0) phaseStatus = 'active';
  
  // Phase별 아이콘 및 색상 (AI 생성 또는 기본값)
  const defaultIcons = ['fa-seedling', 'fa-code', 'fa-database', 'fa-server', 'fa-rocket', 'fa-trophy'];
  const defaultColors = ['cyan', 'blue', 'purple', 'indigo', 'pink', 'amber'];
  const phaseIcon = phase.icon || defaultIcons[pIdx % defaultIcons.length];
  const phaseColor = phase.color || defaultColors[pIdx % defaultColors.length];
  
  const container = document.createElement('div');
  container.className = 'phase-container relative';
  
  // 상태별 색상 클래스
  const numberBgClass = isPhaseComplete 
    ? `bg-emerald-500` 
    : (phaseStatus === 'active' ? `bg-${phaseColor}-500` : 'bg-slate-800');
  const numberBorderClass = isPhaseComplete 
    ? 'border-emerald-400' 
    : (phaseStatus === 'active' ? `border-${phaseColor}-400` : 'border-slate-600');
  
  container.innerHTML = `
    <div class="phase-line"></div>
    
    <!-- 페이즈 헤더 -->
    <div class="flex items-start gap-3 mb-3">
      <div class="phase-number ${phaseStatus} w-9 h-9 rounded-full ${numberBgClass} border-2 ${numberBorderClass} flex items-center justify-center font-bold text-sm shrink-0 shadow-lg">
        ${isPhaseComplete 
          ? '<i class="fas fa-check text-white text-xs"></i>' 
          : `<i class="fas ${phaseIcon} text-white text-xs"></i>`}
      </div>
      <div class="flex-1 pt-1">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-bold text-white">${escapeHtml((phase.title || `Phase ${pIdx + 1}`).replace(/^Phase\s*\d+\.?\s*/i, '').trim() || phase.title || `Phase ${pIdx + 1}`)}</h3>
          <span class="text-[10px] text-slate-500">${completedTopics}/${topics.length}</span>
        </div>
        <p class="text-[11px] text-slate-400 leading-relaxed mt-0.5">${escapeHtml(phase.description || '')}</p>
      </div>
    </div>
    
    <!-- 토픽 목록 -->
    <div class="ml-11 space-y-2 topics-list"></div>
  `;
  
  const topicsList = container.querySelector('.topics-list');
  
  topics.forEach((topic, tIdx) => {
    const topicCard = createTopicCard(topic, pIdx, tIdx, phaseColor);
    topicsList.appendChild(topicCard);
  });
  
  return container;
}

// ========== 토픽 카드 생성 ==========
function createTopicCard(topic, pIdx, tIdx, phaseColor = 'cyan') {
  const status = topic.status || 'locked';
  
  let icon, statusBadge;
  switch (status) {
    case 'completed':
      icon = 'fa-check';
      statusBadge = '<span class="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">완료</span>';
      break;
    case 'active':
      icon = 'fa-play';
      statusBadge = `<span class="text-[9px] text-${phaseColor}-400 bg-${phaseColor}-500/10 px-1.5 py-0.5 rounded">학습하기</span>`;
      break;
    default:
      icon = 'fa-lock';
      statusBadge = '<span class="text-[9px] text-slate-500">잠김</span>';
  }
  
  const card = document.createElement('div');
  card.className = `topic-card ${status} bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-all hover:border-slate-600/50`;
  card.dataset.pIdx = pIdx;
  card.dataset.tIdx = tIdx;
  
  // 활성 상태 색상을 phase 색상으로 적용
  const iconBgClass = status === 'active' 
    ? `bg-${phaseColor}-500 text-white shadow-lg shadow-${phaseColor}-500/30` 
    : status === 'completed' 
      ? 'bg-emerald-500/20 text-emerald-400' 
      : 'bg-slate-700/50 text-slate-500';
  
  card.innerHTML = `
    <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBgClass}">
      <i class="fas ${icon} text-xs"></i>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <h4 class="text-xs font-medium text-slate-200 truncate">${escapeHtml(topic.title || '토픽')}</h4>
        ${statusBadge}
      </div>
      <p class="text-[10px] text-slate-500 truncate mt-0.5">${escapeHtml(topic.description || '')}</p>
    </div>
    ${status === 'active' ? `<i class="fas fa-chevron-right text-${phaseColor}-400 text-xs"></i>` : ''}
  `;
  
  // 클릭 이벤트
  if (status === 'active') {
    card.addEventListener('click', () => startLesson(topic, pIdx, tIdx));
  }
  
  return card;
}

// ========== 레슨 시작 ==========
function startLesson(topic, pIdx, tIdx) {
  // 로드맵 컨텍스트를 localStorage에 저장
  localStorage.setItem('roadmap_context', JSON.stringify({
    topic: topic.title,
    description: topic.description,
    pIdx,
    tIdx,
    roadmapTitle: currentRoadmap?.roadmap_title || ''
  }));
  
  // index.html로 이동 (로드맵 모드)
  window.location.href = `index.html?mode=roadmap&topic=${encodeURIComponent(topic.title)}`;
}

// ========== 진행률 업데이트 ==========
function updateProgress(percent) {
  const p = Math.round(percent);
  
  dom.progressPercent.textContent = p;
  dom.mainProgress.textContent = p;
  
  // 애니메이션 적용
  requestAnimationFrame(() => {
    dom.headerProgressBar.style.width = `${p}%`;
    dom.mainProgressBar.style.width = `${p}%`;
  });
}

// ========== 유틸리티 ==========
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== 초기화 실행 ==========
init();
