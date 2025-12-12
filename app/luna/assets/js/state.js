// 중앙 상태 및 DOM 참조
export const state = {
  /**
   * 앱 상태 (흐름 제어):
   * - IDLE: 대기 (새 주제 입력 가능)
   * - AWAITING_LEARNING_TYPE: [신규] 학습 유형 선택 대기 (장기 로드맵 / 단기 커리큘럼)
   * - AWAITING_TOPIC_REFINEMENT: 세부 주제 선택 대기
   * - CURRICULUM_PROPOSED: 커리큘럼 제안됨
   * - CURRICULUM_GENERATED: [신규] 커리큘럼 생성 완료 (확인 대기)
   * - ROADMAP_PREVIEW: 로드맵 프리뷰 표시됨
   * - ROADMAP_GENERATED: [신규] 로드맵 생성 완료 (확인 대기)
   * - AWAITING_REGENERATE_INPUT: [신규] 다시 생성 시 방향 입력 대기
   * - CURRICULUM_CHOICE: 커리큘럼 단계 선택 가능
   * - CONCEPT_VIEW: 개념 학습 중
   * - LESSON_EXPLAINED: 레슨 설명 완료
   * - PROBLEM_SOLVING: 문제 풀이 중
   */
  appState: 'IDLE',
  // [신규] 챕터형 진행 상태: IDLE → CONCEPT → BASIC_EXERCISE → APPLIED_CHALLENGE
  currentChapterStage: 'IDLE',
  currentCurriculum: null,
  currentStepIndex: -1,
  // [신규] 한 차시 수업 계획 및 진행 인덱스
  currentLessonPlan: null,
  currentLessonStepIndex: -1,
  problemJSON: null,
  chatHistory: [],
  isAwaitingResponse: false,
  editorInstance: null,
  lastRunId: 0,
  // [신규] 다음 단계 제안 대기 상태 (정답 후 사용자 의사 확인)
  pendingNextStepOffer: false,
  // [추가] 사용자의 원래 학습 의도(Topic)를 저장
  intendedTopic: null,
  // [신규] 단원 완료 상태
  lessonCompleted: false,
  // [신규] 로드맵 모드 상태
  isRoadmapMode: false,
  roadmapContext: null,  // { topic, description, pIdx, tIdx, roadmapTitle }
  // [구조적 개선] 서버에서 가져온 Step 완료 상태 캐싱
  curriculumProgress: null,  // [ { step_index, completed, completed_at, xp_awarded }, ... ]
  // [구조적 개선] 마지막 Step 완료 정보 (XP 표시용)
  lastStepCompletion: null,  // { xpGained, alreadyCompleted, allStepsCompleted }
  // [신규] 다시 생성 요청 시 타입 저장 ('roadmap' | 'curriculum')
  pendingRegenerateType: null,
  // [신규] 채팅 입력 금지 상태
  chatInputLocked: false,
  // [신규] 우측 카드에서 미리 선택한 학습 타입 ('roadmap' | 'curriculum' | null)
  preselectedLearningType: null,
};

export const dom = {
  newTopicBtn: document.getElementById('new-topic-btn'),
  // [신규] 헤더 레슨 네비게이션 버튼들
  lessonBackBtn: document.getElementById('lesson-back-btn'),
  lessonSkipBtn: document.getElementById('lesson-skip-btn'),
  lessonNextBtn: document.getElementById('lesson-next-btn'),
  lessonRunBtn: document.getElementById('lesson-run-btn'),
  problemTitle: document.getElementById('problem-title'),
  // [변경] Markdown 설명 컨테이너 사용
  problemDescriptionMd: document.getElementById('problem-description-md'),
  // 문제/출력/모달 관련 DOM은 페이지에 존재하는 경우에만 참조됩니다
  problemContainer: document.getElementById('problem-container'),
  codeEditor: document.getElementById('code-editor'),
  // [신규] 수업 활동 패널 요소들 (없을 수도 있으므로 null 허용)
  activityText: document.getElementById('activity-text'),
  activityContent: document.getElementById('activity-content'),
  activityControls: document.getElementById('activity-controls'),
  runBtn: document.getElementById('run-btn'),
  outputContainer: document.getElementById('output-container'),
  outputIframe: document.getElementById('output-iframe'),
  resultModal: document.getElementById('result-modal'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  chatLog: document.getElementById('chat-log'),
  chatForm: document.getElementById('chat-form'),
  chatInput: document.getElementById('chat-input'),
};

// API 설정은 config.js에서 중앙 관리
import { API_BASE, FETCH_OPTIONS } from './config.js';

// config.js에서 re-export (기존 코드 호환성)
export { API_BASE, FETCH_OPTIONS };
