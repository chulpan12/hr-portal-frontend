import { API_BASE, FETCH_OPTIONS, state } from './state.js';
import { TIMEOUT, apiRequest } from './config.js';

// FETCH_OPTIONS는 이제 config.js에서 가져옴 (state.js를 통해 re-export)
const fetchOptions = FETCH_OPTIONS;

// [수정] 커리큘럼 생성 - 120초 타임아웃 적용
export async function fetchCurriculum(topic) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT.AI_GENERATION);
  
  try {
    const resp = await fetch(`${API_BASE}/curriculum`, {
      ...fetchOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    // [Magic or Nothing] 에러 응답 처리
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      const errorMsg = errorData.error_message || errorData.error || '커리큘럼 생성에 실패했습니다.';
      throw new Error(errorMsg);
    }
    
    const data = await resp.json();
    
    // [Magic or Nothing] 서버가 error 플래그를 보낸 경우
    if (data.error) {
      throw new Error(data.error_message || '커리큘럼 생성에 실패했습니다.');
    }
    
    // 주제 세분화 단계일 수 있으므로, is_broad가 true면 커리큘럼 상태를 갱신하지 않음
    if (!data?.is_broad) {
      state.currentCurriculum = data;
      state.currentStepIndex = -1;
    }
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('커리큘럼 생성 시간이 초과되었습니다. 다시 시도해주세요.');
    }
    throw err;
  }
}

export async function fetchLessonExplanation() {
  const curriculum = state.currentCurriculum || {};
  const step = (curriculum.curriculum || [])[state.currentStepIndex] || {};
  const specificQuestion = `좋습니다. 이제 다음 단계인 "${step.title || '다음 주제'}"에 대해 설명해주세요.`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT.AI_CHAT);
  
  try {
    const resp = await fetch(`${API_BASE}/chat`, {
      ...fetchOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problem: {},
        user_code: '',
        chat_history: state.chatHistory,
        question: specificQuestion,
        curriculum,
        current_step: step,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!resp.ok) throw new Error('단계 설명을 가져오는데 실패했습니다.');
    const data = await resp.json();
    return data.answer || '설명을 가져오지 못했습니다.';
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('응답 시간이 초과되었습니다. 다시 시도해주세요.');
    }
    throw err;
  }
}

export async function chatWithTutor(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT.AI_CHAT);
  
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      ...fetchOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error('AI 채팅 응답에 실패했습니다.');
    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('채팅 응답 시간이 초과되었습니다. 다시 시도해주세요.');
    }
    throw err;
  }
}

// ========== [신규] 스트리밍 채팅 함수 ==========
/**
 * 스트리밍 방식으로 AI 튜터와 채팅합니다.
 * @param {Object} payload - 채팅 요청 데이터
 * @param {Function} onChunk - 텍스트 조각이 도착할 때마다 호출되는 콜백 (chunk: string) => void
 * @param {Function} onComplete - 스트리밍 완료 시 호출되는 콜백 (fullText: string) => void
 * @returns {Promise<{answer: string, new_problem?: Object}>}
 */
export async function chatWithTutorStream(payload, onChunk, onComplete) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT.AI_CHAT);
  
  try {
    const response = await fetch(`${API_BASE}/chat_stream`, {
      ...fetchOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) throw new Error('AI 채팅 응답에 실패했습니다.');
    
    // Content-Type 확인 - JSON이면 기존 방식으로 처리 (첫 대화)
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (onComplete) onComplete(data.answer);
      return data;
    }
    
    // NDJSON 스트리밍 파싱
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      // 바이너리를 텍스트로 변환
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      // 줄바꿈 기준으로 분리
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 마지막 불완전한 라인은 버퍼에 유지
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        try {
          const jsonChunk = JSON.parse(line);
          
          if (jsonChunk.type === 'chunk' && jsonChunk.content) {
            fullText += jsonChunk.content;
            if (onChunk) onChunk(jsonChunk.content);
          } else if (jsonChunk.type === 'end') {
            // 스트리밍 완료
            if (onComplete) onComplete(fullText);
          }
        } catch (e) {
          console.warn('[스트리밍] JSON 파싱 건너뜀:', line.substring(0, 50));
        }
      }
    }
    
    return { answer: fullText };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('채팅 응답 시간이 초과되었습니다. 다시 시도해주세요.');
    }
    throw err;
  }
}

// [수정] 문제 생성 - 120초 타임아웃 적용
export async function requestProblem(topic, preferredLanguage, stepDescription) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT.AI_GENERATION);
  
  try {
    const response = await fetch(`${API_BASE}/problem`, {
      ...fetchOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, preferred_language: preferredLanguage, step_description: stepDescription }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    // [Magic or Nothing] 에러 응답 처리
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error_message || errorData.error || '문제 생성에 실패했습니다.';
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    
    // [Magic or Nothing] 서버가 error 플래그를 보낸 경우
    if (data.error) {
      throw new Error(data.error_message || '문제 생성에 실패했습니다.');
    }
    
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('문제 생성 시간이 초과되었습니다. 다시 시도해주세요.');
    }
    throw err;
  }
}

// [수정] 수업 계획 요청 - 120초 타임아웃 적용, 이전 학습 단계 정보 추가 (커리큘럼 중복 방지)
// [구조적 개선] roadmap_context 추가 - 전체 학습 맥락 전달
export async function requestLessonPlan(topic, lesson_title, previous_lessons = null, roadmap_context = null) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT.AI_GENERATION);
  
  try {
    const payload = { topic, lesson_title };
    // [Scaffolding] 이전 단계 학습 정보 전달 - 중복 콘텐츠 방지
    if (previous_lessons && previous_lessons.length > 0) {
      payload.previous_lessons = previous_lessons;
    }
    // [구조적 개선] 로드맵 컨텍스트 전달 - 전체 학습 맥락 제공
    if (roadmap_context) {
      payload.roadmap_context = roadmap_context;
    }
    
    const resp = await fetch(`${API_BASE}/lesson_plan`, {
      ...fetchOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    // [Magic or Nothing] 에러 응답 처리
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      const errorMsg = errorData.error_message || errorData.error || '수업 계획 생성에 실패했습니다.';
      throw new Error(errorMsg);
    }
    
    const data = await resp.json();
    
    // [Magic or Nothing] 서버가 error 플래그를 보낸 경우
    if (data.error) {
      throw new Error(data.error_message || '수업 계획 생성에 실패했습니다.');
    }
    
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('수업 계획 생성 시간이 초과되었습니다. 다시 시도해주세요.');
    }
    throw err;
  }
}

// --- 상태 저장 유틸 (debounce) ---
function _debounce(fn, wait) {
  let t;
  const debounced = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
  debounced.flush = () => {
    clearTimeout(t);
    return fn();
  };
  debounced.cancel = () => {
    clearTimeout(t);
  };
  return debounced;
}

let __lastStateSignature = '';
export const saveStateToServer = _debounce(async () => {
  console.log('[SAVE] saveStateToServer 호출됨');
  try {
    const userId = localStorage.getItem('coding_tutor_user_id');
    if (!userId) return;
    
    // --- [신규 수정] ---
    // 'final_code' 단계 또는 'APPLIED_CHALLENGE'일 때만 에디터 내용을 스냅샷으로 저장합니다.
    const currentStep = state.currentLessonPlan?.steps?.[state.currentLessonStepIndex];
    const stepType = currentStep?.type?.toLowerCase();
    const isChallenge = String(state.currentChapterStage || '').toUpperCase() === 'APPLIED_CHALLENGE';

    if (state.editorInstance && (stepType === 'final_code' || isChallenge)) {
        console.log('[SAVE] final_code/challenge 단계이므로 스냅샷 저장');
        state.lastCodeSnapshot = state.editorInstance.getValue();
    } else {
        console.log(`[SAVE] ${stepType || 'N/A'} 단계이므로 스냅샷 저장 안함`);
        // concept, mcq, fill_in_blank 단계에서는 스냅샷을 갱신하지 않습니다.
    }
    // --- [수정 완료] ---
    
    // 전송 페이로드를 안전한 최소 필드로 제한하여 순환 참조/대용량 전송 방지
    const safeState = {
      appState: state.appState,  // [신규] 앱 상태 저장 (IDLE, PROBLEM_SOLVING 등)
      intendedTopic: state.intendedTopic,
      currentCurriculum: state.currentCurriculum,
      currentLessonPlan: state.currentLessonPlan,
      // [수정] 두 인덱스를 명확히 구분하여 전송
      currentStepIndex: state.currentStepIndex, // 커리큘럼 인덱스
      currentLessonStepIndex: state.currentLessonStepIndex, // 수업 인덱스
      chatHistory: state.chatHistory,
      lastCodeSnapshot: state.lastCodeSnapshot, // 이 값은 이제 'final_code'일 때만 갱신됩니다.
      // [신규] 단원 완료 상태 저장
      lessonCompleted: state.lessonCompleted || false,
      // [신규] 로드맵 모드 상태 저장 - 토픽 언락에 필요
      isRoadmapMode: state.isRoadmapMode || false,
      roadmapContext: state.roadmapContext || null,
    };
    console.log('[SAVE] 저장할 currentLessonStepIndex:', safeState.currentLessonStepIndex);
    const signature = JSON.stringify(safeState);
    if (signature === __lastStateSignature) {
      console.log('[SAVE] 변경 없음, 저장 스킵');
      return; // 변경 없음 → 저장 스킵
    }
    __lastStateSignature = signature;

    console.log('[SAVE] 서버로 상태 저장 중...');
    console.log('[SAVE] 저장할 currentLessonPlan title:', safeState.currentLessonPlan?.title);
    const response = await fetch(`${API_BASE}/save_state`, {
      ...fetchOptions,
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, state: safeState }),
    });
    const result = await response.json();
    console.log('[SAVE] 저장 응답:', result);
    console.log('[SAVE] 저장 완료');
  } catch (e) {
    console.warn('[SAVE] save_state 실패', e);
  }
}, 2000);

export async function runPython(code) {
  const r = await fetch(`${API_BASE}/run`, {
    ...fetchOptions,
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  if (!r.ok) throw new Error('실행 실패');
  return r.json();
}

export async function simulate(problem, user_code) {
  const sresp = await fetch(`${API_BASE}/simulate`, {
    ...fetchOptions,
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem, user_code })
  });
  if (!sresp.ok) throw new Error('시뮬레이션 실패');
  return sresp.json();
}

export async function validate(problem, user_code) {
  const vresp = await fetch(`${API_BASE}/validate`, {
    ...fetchOptions,
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem, user_code })
  });
  if (!vresp.ok) throw new Error('검증 실패');
  return vresp.json();
}

export async function feedback(problem, user_code, result, rendered_html) {
  const response = await fetch(`${API_BASE}/feedback`, {
    ...fetchOptions,
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem, user_code, result, rendered_html }),
  });
  if (!response.ok) return null;
  return response.json();
}

// [신규] 세션 시작/복원
export async function startSession(user_id, topic) {
  const resp = await fetch(`${API_BASE}/start_session`, {
    ...fetchOptions,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, topic }),
  });
  if (!resp.ok) return null;
  return resp.json();
}

// [신규] 진척도 저장
export async function saveProgress(user_id, step_index) {
  const resp = await fetch(`${API_BASE}/save_progress`, {
    ...fetchOptions,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, step_index }),
  });
  if (!resp.ok) return null;
  return resp.json();
}

// [신규] 정답 후 다음 단계 통합 안내 요청
export async function nextStep(correct_problem, next_step) {
  const resp = await fetch(`${API_BASE}/next_step`, {
    ...fetchOptions,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correct_problem, next_step }),
  });
  if (!resp.ok) throw new Error('다음 단계 안내 요청 실패');
  return resp.json();
}

// [신규] 테스트케이스 기반 코드 채점
export async function gradeCode(problem, user_code) {
  // user_id 전달하여 XP 보상 처리 가능하게
  const user_id = localStorage.getItem('coding_tutor_user_id');
  const resp = await fetch(`${API_BASE}/grade`, {
    ...fetchOptions,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem, user_code, user_id }),
  });
  
  // [신규] 429 에러 처리 - Rate Limit 초과
  if (resp.status === 429) {
    const errorData = await resp.json();
    throw new Error(`rate_limit_exceeded`);  // runner.js에서 친근한 메시지로 처리
  }
  
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.error || '채점 서버와 통신에 실패했습니다.');
  }
  
  return resp.json();
}

// [신규] 응용 과제 요청
export async function requestAppliedChallenge(problem, user_code) {
  const resp = await fetch(`${API_BASE}/applied_challenge`, {
    ...fetchOptions,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem, user_code }),
  });
  if (!resp.ok) throw new Error('응용 과제 생성에 실패했습니다.');
  return resp.json();
}

// [신규] 레슨 완료 기록 (대시보드 타임라인용)
export async function completeLesson(topic, lessonTitle, summary, userCode) {
  try {
    const resp = await fetch(`${API_BASE}/complete_lesson`, {
      ...fetchOptions,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: topic || '',
        lesson_title: lessonTitle || '',
        summary: summary || '',
        user_code: userCode || ''
      }),
    });
    if (!resp.ok) {
      console.warn('[API] 레슨 완료 기록 실패:', resp.status);
      return null;
    }
    const result = await resp.json();
    console.log('[API] 레슨 완료 기록 성공:', result);
    return result;
  } catch (error) {
    console.error('[API] 레슨 완료 기록 에러:', error);
    return null;
  }
}
