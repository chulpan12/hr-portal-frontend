/**
 * ============================================================
 * LUNA AI Coding Tutor - Configuration
 * hr-portal 통합 버전
 * ============================================================
 * API 주소 및 fetch 옵션을 중앙 관리합니다.
 * hr-portal API 서버 (api.dreamofenc.com)를 사용합니다.
 * ============================================================
 */

// ========== 환경 설정 ==========
// 개발 환경: http://localhost:8000/api/luna (hr-portal 백엔드 포트)
// 운영 환경: https://api.dreamofenc.com/api/luna

function getApiBase() {
  // URL 파라미터로 API 주소 명시적 지정 가능: ?api=http://192.168.0.100:8000/api/luna
  const urlParams = new URLSearchParams(window.location.search);
  const apiParam = urlParams.get('api');
  if (apiParam) {
    console.log('[LUNA CONFIG] URL 파라미터로 API 주소 설정:', apiParam);
    return apiParam;
  }
  
  // 현재 호스트 기반 자동 설정
  const currentHost = window.location.hostname;
  
  // localhost 또는 127.0.0.1인 경우 (개발 환경)
  // hr-portal 백엔드는 포트 8000 사용
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    return 'http://127.0.0.1:8000/api/luna';
  }
  
  // dreamofenc.com 도메인인 경우 (운영 환경)
  if (currentHost.includes('dreamofenc.com')) {
    return 'https://api.dreamofenc.com/api/luna';
  }
  
  // GitHub Pages 등 외부 호스팅인 경우
  if (currentHost.includes('github.io')) {
    return 'https://api.dreamofenc.com/api/luna';
  }
  
  // 네트워크 IP로 접속한 경우 (사내망 테스트)
  return `http://${currentHost}:8000/api/luna`;
}

export const API_BASE = getApiBase();
console.log('[LUNA CONFIG] API_BASE:', API_BASE);

// ========== Fetch 공통 옵션 ==========
// credentials: 'include' - 세션 쿠키 전송 필수 (Cross-Origin 인증)
export const FETCH_OPTIONS = {
  mode: 'cors',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
};

// ========== API 헬퍼 함수 ==========

// 타임아웃 상수 정의
export const TIMEOUT = {
  DEFAULT: 15000,        // 일반 요청: 15초
  AUTH: 10000,           // 인증 요청: 10초
  AI_GENERATION: 120000, // AI 생성 작업: 120초 (로드맵, 커리큘럼, 레슨)
  AI_CHAT: 60000,        // AI 채팅: 60초
};

/**
 * API 요청을 보내는 공통 함수 (타임아웃 포함)
 * @param {string} endpoint - API 엔드포인트 (예: '/api/login')
 * @param {Object} options - fetch 옵션 (method, body 등)
 * @param {number} timeout - 타임아웃 (ms), 기본 15초
 * @returns {Promise<Response>}
 */
export async function apiRequest(endpoint, options = {}, timeout = TIMEOUT.DEFAULT) {
  const url = `${API_BASE}${endpoint}`;
  const fetchOpts = {
    ...FETCH_OPTIONS,
    ...options,
    headers: {
      ...FETCH_OPTIONS.headers,
      ...(options.headers || {})
    }
  };
  
  // 타임아웃 구현
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { ...fetchOpts, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('요청 시간이 초과되었습니다. 네트워크 상태를 확인해주세요.');
    }
    throw err;
  }
}

/**
 * JSON POST 요청 헬퍼
 * @param {string} endpoint - API 엔드포인트
 * @param {Object} data - 전송할 데이터
 * @param {number} timeout - 타임아웃 (ms), 기본값 사용
 * @returns {Promise<Object>} - JSON 응답
 */
export async function postJSON(endpoint, data, timeout = TIMEOUT.DEFAULT) {
  const response = await apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  }, timeout);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '요청 실패' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

/**
 * JSON GET 요청 헬퍼
 * @param {string} endpoint - API 엔드포인트
 * @param {number} timeout - 타임아웃 (ms), 기본값 사용
 * @returns {Promise<Object>} - JSON 응답
 */
export async function getJSON(endpoint, timeout = TIMEOUT.DEFAULT) {
  const response = await apiRequest(endpoint, { method: 'GET' }, timeout);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '요청 실패' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

/**
 * [AI 생성 전용] 로드맵/커리큘럼/레슨 생성용 POST 요청
 * - 120초 타임아웃
 * - 에러 시 상세 메시지 포함
 * @param {string} endpoint - API 엔드포인트
 * @param {Object} data - 전송할 데이터
 * @returns {Promise<Object>} - JSON 응답
 */
export async function postAIGeneration(endpoint, data) {
  const response = await apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  }, TIMEOUT.AI_GENERATION);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'AI 생성 요청 실패' }));
    const errorMsg = error.error_message || error.error || `HTTP ${response.status}`;
    throw new Error(errorMsg);
  }
  
  const result = await response.json();
  
  // 서버가 에러 플래그를 보낸 경우 (Magic or Nothing)
  if (result.error) {
    throw new Error(result.error_message || 'AI 생성에 실패했습니다.');
  }
  
  return result;
}
