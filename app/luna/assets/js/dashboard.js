/**
 * ============================================================
 * AI Coding Tutor - Dashboard
 * ============================================================
 * 마이 대시보드: 학습 통계, 활동 차트, 타임라인 표시
 * ============================================================
 */

import { getJSON, API_BASE, FETCH_OPTIONS } from './config.js';

// DOM 요소 참조
const dom = {
  loadingState: document.getElementById('loading-state'),
  dashboardContent: document.getElementById('dashboard-content'),
  errorState: document.getElementById('error-state'),
  errorMessage: document.getElementById('error-message'),
  
  // 통계
  statLevel: document.getElementById('stat-level'),
  statXp: document.getElementById('stat-xp'),
  statStreak: document.getElementById('stat-streak'),
  currentXp: document.getElementById('current-xp'),
  requiredXp: document.getElementById('required-xp'),
  xpProgress: document.getElementById('xp-progress'),
  
  // 차트
  activityChart: document.getElementById('activityChart'),
  skillChart: document.getElementById('skillChart'),
  
  // 타임라인
  timelineContainer: document.getElementById('timeline-container'),
  timelineEmpty: document.getElementById('timeline-empty'),
  timelineCount: document.getElementById('timeline-count'),
};

// Chart.js 전역 설정
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.05)';
Chart.defaults.font.family = "'Noto Sans KR', sans-serif";

/**
 * 활동 차트 (Line Chart) 렌더링
 */
function renderActivityChart(heatmapData) {
  const ctx = dom.activityChart.getContext('2d');
  
  // 최근 14일 날짜 생성
  const labels = [];
  const data = [];
  const today = new Date();
  
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const displayDate = `${date.getMonth() + 1}/${date.getDate()}`;
    
    labels.push(displayDate);
    data.push(heatmapData[dateStr] || 0);
  }

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '획득 XP',
        data: data,
        borderColor: '#22d3ee',
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return 'rgba(34, 211, 238, 0.1)';
          
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(34, 211, 238, 0)');
          gradient.addColorStop(1, 'rgba(34, 211, 238, 0.3)');
          return gradient;
        },
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#22d3ee',
        pointBorderColor: '#0B0E14',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (context) => `${context.parsed.y} XP 획득`,
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            font: { size: 11 }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.03)',
          },
          ticks: {
            font: { size: 11 },
            callback: (value) => value + ' XP'
          }
        }
      }
    }
  });
}

/**
 * 스킬 레이더 차트 렌더링
 * 백엔드에서 [문법, 논리, 문제해결, 코드품질, 꾸준함] 배열로 제공
 */
function renderSkillChart(skillData = null) {
  const ctx = dom.skillChart.getContext('2d');
  
  // 레이블 순서: [문법, 논리, 문제해결, 코드품질, 꾸준함]
  const labels = ['문법 이해', '논리 구성', '문제 해결', '코드 품질', '학습 꾸준함'];
  
  // 백엔드에서 배열로 제공, 없으면 기본값
  const data = Array.isArray(skillData) ? skillData : [50, 50, 50, 50, 50];
  
  new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: '내 능력치',
        data: data,
        borderColor: '#a78bfa',
        backgroundColor: 'rgba(167, 139, 250, 0.15)',
        borderWidth: 2,
        pointBackgroundColor: '#a78bfa',
        pointBorderColor: '#0B0E14',
        pointBorderWidth: 2,
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
          },
          angleLines: {
            color: 'rgba(255, 255, 255, 0.05)',
          },
          pointLabels: {
            font: { size: 11 },
            color: '#94a3b8',
          },
          ticks: {
            display: false,
            stepSize: 20,
          }
        }
      }
    }
  });
}

/**
 * 코드 문자열을 안전하게 이스케이프
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 타임라인 렌더링
 */
function renderTimeline(logs) {
  const container = dom.timelineContainer;
  const timelineLine = container.querySelector('.timeline-line');
  
  // 기존 아이템 제거 (라인은 유지)
  container.querySelectorAll('.timeline-item').forEach(el => el.remove());
  
  if (!logs || logs.length === 0) {
    dom.timelineEmpty.classList.remove('hidden');
    if (timelineLine) timelineLine.style.display = 'none';
    dom.timelineCount.textContent = '';
    return;
  }
  
  dom.timelineEmpty.classList.add('hidden');
  if (timelineLine) timelineLine.style.display = 'block';
  dom.timelineCount.textContent = `(${logs.length}개의 기록)`;

  logs.forEach((log, index) => {
    const item = document.createElement('div');
    item.className = 'timeline-item relative pl-12 pb-8';
    
    // 코드가 있으면 details로 감싸기
    const hasCode = log.code && log.code.trim();
    const codeSection = hasCode ? `
      <details class="mt-3 group/code">
        <summary class="cursor-pointer text-xs text-slate-500 hover:text-cyan-400 flex items-center gap-2 select-none transition-colors">
          <i class="fas fa-code"></i>
          <span>작성한 코드 보기</span>
          <i class="fas fa-chevron-down text-[10px] transition-transform group-open/code:rotate-180"></i>
        </summary>
        <div class="mt-2 code-preview p-4 rounded-lg overflow-x-auto max-h-64 overflow-y-auto dashboard-scroll">
          <pre class="text-xs text-green-400 whitespace-pre-wrap">${escapeHtml(log.code)}</pre>
        </div>
      </details>
    ` : '';
    
    // 요약이 있으면 표시
    const summarySection = log.summary ? `
      <div class="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl">
        <p class="text-sm text-slate-300 leading-relaxed">
          <i class="fas fa-quote-left text-slate-600 mr-2 text-xs"></i>
          ${escapeHtml(log.summary)}
        </p>
      </div>
    ` : '';
    
    item.innerHTML = `
      <div class="timeline-dot absolute left-[18px] top-1 w-3 h-3 bg-cyan-500 rounded-full z-10"></div>
      
      <div class="text-xs text-slate-500 mb-1.5 flex items-center gap-2">
        <span>${log.date}</span>
        ${log.time ? `<span class="text-slate-600">·</span><span>${log.time}</span>` : ''}
        <span class="text-slate-600">·</span>
        <span class="text-purple-400 font-medium">${escapeHtml(log.topic)}</span>
      </div>
      
      <h4 class="text-lg font-semibold text-white mb-3 hover:text-cyan-300 transition-colors">
        ${escapeHtml(log.title)}
      </h4>
      
      ${summarySection}
      ${codeSection}
    `;
    
    container.appendChild(item);
  });
}

/**
 * 통계 업데이트
 */
function updateStats(data) {
  // 안전하게 기본값 설정
  const level = data?.level || 1;
  const totalXp = data?.total_xp || 0;
  const streak = data?.streak || 0;
  const requiredXp = data?.required_xp || 100;
  
  // 애니메이션 효과를 위한 숫자 카운트업
  animateValue(dom.statLevel, 0, level, 500);
  animateValue(dom.statXp, 0, totalXp, 800, true);
  animateValue(dom.statStreak, 0, streak, 600);
  
  // XP 진행률
  const xpProgress = requiredXp > 0 
    ? Math.min((totalXp / requiredXp) * 100, 100) 
    : 0;
  
  dom.currentXp.textContent = totalXp.toLocaleString();
  dom.requiredXp.textContent = requiredXp.toLocaleString();
  
  // 약간의 지연 후 프로그레스 바 애니메이션
  setTimeout(() => {
    dom.xpProgress.style.width = `${xpProgress}%`;
  }, 300);
}

/**
 * 숫자 카운트업 애니메이션
 */
function animateValue(element, start, end, duration, formatNumber = false) {
  if (!element) {
    console.warn('[DASHBOARD] animateValue: element is null');
    return;
  }
  
  const startTime = performance.now();
  const update = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // easeOutQuart 이징
    const easeProgress = 1 - Math.pow(1 - progress, 4);
    const current = Math.floor(start + (end - start) * easeProgress);
    
    element.textContent = formatNumber ? current.toLocaleString() : current;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  };
  
  requestAnimationFrame(update);
}

/**
 * UI 상태 전환
 */
function showLoading() {
  dom.loadingState.classList.remove('hidden');
  dom.dashboardContent.classList.add('hidden');
  dom.errorState.classList.add('hidden');
}

function showContent() {
  dom.loadingState.classList.add('hidden');
  dom.dashboardContent.classList.remove('hidden');
  dom.errorState.classList.add('hidden');
}

function showError(message) {
  dom.loadingState.classList.add('hidden');
  dom.dashboardContent.classList.add('hidden');
  dom.errorState.classList.remove('hidden');
  dom.errorMessage.textContent = message || '알 수 없는 오류가 발생했어요.';
}

/**
 * 대시보드 초기화
 */
async function initDashboard() {
  showLoading();
  
  try {
    const data = await getJSON('/dashboard');
    
    // 통계 업데이트 (레벨, XP, 스트릭)
    updateStats(data);
    
    // 차트 렌더링
    renderActivityChart(data.heatmap || {});
    renderSkillChart(data.stats || null);  // stats: 5축 스킬 배열
    
    // 타임라인 렌더링
    renderTimeline(data.timeline || []);
    
    // [신규] 로드맵 프리뷰 로드
    await loadRoadmapPreview();
    
    showContent();
    
  } catch (error) {
    console.error('[DASHBOARD] 데이터 로드 실패:', error);
    
    // 인증 오류인 경우 로그인 페이지로 리다이렉트
    if (error.message.includes('401') || error.message.includes('로그인')) {
      window.location.href = 'login.html?redirect=dashboard.html';
      return;
    }
    
    showError(error.message);
  }
}

/**
 * [신규] 로드맵 프리뷰 로드
 */
async function loadRoadmapPreview() {
  const previewEl = document.getElementById('roadmap-preview');
  if (!previewEl) return;
  
  try {
    const res = await getJSON('/roadmap');
    
    if (res.has_roadmap && res.roadmap) {
      const roadmap = res.roadmap;
      const phases = roadmap.phases || [];
      const totalTopics = phases.reduce((sum, p) => sum + (p.topics?.length || 0), 0);
      const completedTopics = phases.reduce((sum, p) => {
        return sum + (p.topics?.filter(t => t.status === 'completed').length || 0);
      }, 0);
      const progress = roadmap.total_progress || 0;
      
      // 현재 활성 토픽 찾기
      let currentTopic = null;
      for (const phase of phases) {
        const active = phase.topics?.find(t => t.status === 'active');
        if (active) {
          currentTopic = { ...active, phase: phase.title };
          break;
        }
      }
      
      previewEl.innerHTML = `
        <div class="flex-1">
          <h4 class="text-base font-semibold text-white mb-1">${escapeHtml(roadmap.roadmap_title || '학습 로드맵')}</h4>
          <p class="text-xs text-slate-400">${escapeHtml(roadmap.description || '')}</p>
          <div class="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span><i class="fas fa-layer-group mr-1"></i>${phases.length} 페이즈</span>
            <span><i class="fas fa-book mr-1"></i>${completedTopics}/${totalTopics} 토픽 완료</span>
          </div>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- 진행률 원형 -->
          <div class="relative w-16 h-16">
            <svg class="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="4"/>
              <circle cx="32" cy="32" r="28" fill="none" stroke="url(#roadmap-gradient)" stroke-width="4" 
                stroke-dasharray="${2 * Math.PI * 28}" 
                stroke-dashoffset="${2 * Math.PI * 28 * (1 - progress / 100)}"
                stroke-linecap="round"/>
              <defs>
                <linearGradient id="roadmap-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#8b5cf6"/>
                  <stop offset="100%" stop-color="#06b6d4"/>
                </linearGradient>
              </defs>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-sm font-bold text-white">${Math.round(progress)}%</span>
            </div>
          </div>
          
          ${currentTopic ? `
          <div class="text-right">
            <div class="text-[10px] text-slate-500 mb-1">현재 학습</div>
            <div class="text-sm font-medium text-cyan-400">${escapeHtml(currentTopic.title)}</div>
            <div class="text-[10px] text-slate-500">${escapeHtml(currentTopic.phase)}</div>
          </div>
          ` : ''}
        </div>
      `;
    } else {
      // 로드맵 없음
      previewEl.innerHTML = `
        <div class="flex-1 flex items-center gap-4">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
            <i class="fas fa-map text-2xl text-purple-400"></i>
          </div>
          <div>
            <h4 class="text-base font-semibold text-white mb-1">커리어 로드맵 만들기</h4>
            <p class="text-xs text-slate-400">AI가 맞춤 학습 경로를 설계해드려요</p>
          </div>
        </div>
        <a href="roadmap.html" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors">
          <i class="fas fa-plus mr-2"></i>시작하기
        </a>
      `;
    }
  } catch (e) {
    console.warn('[DASHBOARD] 로드맵 프리뷰 로드 실패:', e);
    previewEl.innerHTML = `
      <div class="text-sm text-slate-500">
        <i class="fas fa-exclamation-circle mr-2"></i>로드맵 정보를 불러올 수 없어요
      </div>
    `;
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', initDashboard);
