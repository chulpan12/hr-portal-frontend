/**
 * ============================================================
 * AI Coding Tutor - Sound Effects Module
 * ============================================================
 * Web Audio API를 활용한 순수 자바스크립트 효과음 시스템
 * 파일 로딩 없이 브라우저 내장 Oscillator로 소리 생성
 * ============================================================
 */

// 오디오 컨텍스트 (브라우저 호환성)
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

// 소리 끄기/켜기 상태 (localStorage에 저장)
let isMuted = localStorage.getItem('coding_tutor_muted') === 'true';

/**
 * AudioContext 초기화 (사용자 인터랙션 후 호출 필요)
 */
function initAudioContext() {
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
      console.log('[SOUND] AudioContext 초기화 완료');
    } catch (e) {
      console.warn('[SOUND] AudioContext 초기화 실패:', e);
    }
  }
  return audioCtx;
}

/**
 * 음소거 토글
 * @param {boolean} state - true면 음소거
 */
export function toggleMute(state) {
  isMuted = state;
  localStorage.setItem('coding_tutor_muted', state.toString());
}

/**
 * 현재 음소거 상태 반환
 */
export function isSoundMuted() {
  return isMuted;
}

/**
 * 기본 톤 생성기
 * @param {number} freq - 주파수 (Hz)
 * @param {string} type - 파형 타입 ('sine', 'square', 'sawtooth', 'triangle')
 * @param {number} duration - 지속 시간 (초)
 * @param {number} vol - 볼륨 (0~1)
 */
function playTone(freq, type, duration, vol = 0.08) {
  if (isMuted) return;
  
  const ctx = initAudioContext();
  if (!ctx) return;
  
  // 브라우저 정책상 suspended 상태면 재개
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  gain.gain.setValueAtTime(vol, ctx.currentTime);
  // 소리가 부드럽게 사라지도록 (Exponential Ramp)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + duration);
}

/**
 * 효과음 프리셋 (Presets)
 */
export const SFX = {
  /**
   * 정답 (맑은 3화음 아르페지오: 도-미-솔)
   */
  correct: () => {
    if (isMuted) return;
    // C5 - E5 - G5
    setTimeout(() => playTone(523.25, 'sine', 0.12, 0.06), 0);
    setTimeout(() => playTone(659.25, 'sine', 0.12, 0.06), 60);
    setTimeout(() => playTone(783.99, 'sine', 0.25, 0.08), 120);
  },

  /**
   * 오답 (낮고 둔탁한 소리)
   */
  incorrect: () => {
    if (isMuted) return;
    playTone(180, 'triangle', 0.18, 0.12);
  },

  /**
   * 레슨/커리큘럼 시작 (상승 슬라이드)
   */
  start: () => {
    if (isMuted) return;
    const ctx = initAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    // 주파수 슬라이딩 (슈웅~ 올라가는 소리)
    osc.frequency.setValueAtTime(350, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  },

  /**
   * 레벨업/완료 (화려한 팡파레)
   */
  levelUp: () => {
    if (isMuted) return;
    // 빠라밤! (도-도-솔-높은도)
    setTimeout(() => playTone(523.25, 'triangle', 0.1, 0.07), 0);
    setTimeout(() => playTone(523.25, 'triangle', 0.1, 0.07), 100);
    setTimeout(() => playTone(783.99, 'triangle', 0.12, 0.08), 200);
    setTimeout(() => playTone(1046.50, 'triangle', 0.5, 0.1), 300);
  },

  /**
   * 버튼 클릭 (가벼운 틱)
   */
  click: () => {
    if (isMuted) return;
    playTone(800, 'sine', 0.04, 0.02);
  },

  /**
   * 알림/힌트 (부드러운 벨)
   */
  notify: () => {
    if (isMuted) return;
    setTimeout(() => playTone(880, 'sine', 0.15, 0.05), 0);
    setTimeout(() => playTone(1100, 'sine', 0.2, 0.04), 80);
  },

  /**
   * XP 획득 (코인 소리 느낌)
   */
  xpGain: () => {
    if (isMuted) return;
    setTimeout(() => playTone(987.77, 'sine', 0.08, 0.05), 0);
    setTimeout(() => playTone(1318.51, 'sine', 0.15, 0.06), 50);
  }
};

// 첫 사용자 인터랙션 시 AudioContext 초기화 (브라우저 정책)
document.addEventListener('click', () => initAudioContext(), { once: true });
document.addEventListener('keydown', () => initAudioContext(), { once: true });

console.log('[SOUND] 효과음 모듈 로드 완료, muted:', isMuted);
