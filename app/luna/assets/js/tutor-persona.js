// AI 튜터 페르소나 시스템
// 친근하고 격려하는 여성형 AI 튜터 "루나"

// 이미지 경로 베이스
const IMG_BASE = './assets/images/tutor/';

export const TUTOR = {
  name: '루나',
  
  // 표정별 실제 이미지 파일
  expressions: {
    default: `${IMG_BASE}luna_default.png`,      // 기본: 대기, 인사
    teaching: `${IMG_BASE}luna_teaching.png`,    // 설명: 개념 설명
    happy: `${IMG_BASE}luna_happy.png`,          // 기쁨: 정답, 성공
    proud: `${IMG_BASE}luna_proud.png`,          // 뿌듯: 칭찬, 완료
    encouraging: `${IMG_BASE}luna_encouraging.png`, // 격려: 에러, 실패
    thinking: `${IMG_BASE}luna_thinking.png`,    // 고민: 로딩, 검색
    surprised: `${IMG_BASE}luna_surprised.png`,  // 놀람/부끄: 돌발, 칭찬
  },
  
  // 표정별 상태 텍스트 및 아이콘 설정
  expressionConfig: {
    default: { 
      icon: 'fa-face-smile', 
      iconColor: 'text-cyan-400', 
      status: '준비 완료! 🚀',
      statusTexts: ['안녕하세요! 오늘 학습도 기대되네요 ✨', '준비되셨나요? 달려봐요!', '무엇을 도와드릴까요? 😊']
    },
    teaching: { 
      icon: 'fa-chalkboard-user', 
      iconColor: 'text-blue-400', 
      status: '설명 중... 🎓',
      statusTexts: ['이 부분, 정말 중요해요! ✨', '핵심만 쏙쏙 알려드릴게요!', '잘 따라오고 계시죠?']
    },
    happy: { 
      icon: 'fa-face-laugh-beam', 
      iconColor: 'text-yellow-400', 
      status: '나이스! 🎉',
      statusTexts: ['와, 완벽해요! 대단합니다 👏', '정답입니다! 감각이 있으시네요 ✨', '바로 그거죠! 아주 훌륭해요!']
    },
    proud: { 
      icon: 'fa-face-grin-stars', 
      iconColor: 'text-pink-400', 
      status: '목표 달성! 🏆',
      statusTexts: ['해내셨군요! 정말 뿌듯해요 😎', '오늘 학습도 성공적이에요!', '실력이 쑥쑥 늘고 있어요!']
    },
    encouraging: { 
      icon: 'fa-face-smile-wink', 
      iconColor: 'text-green-400', 
      status: '디버깅 타임 🔧',
      statusTexts: ['앗, 에러가 났네요 😅 같이 잡아봐요!', '괜찮아요! 원래 코딩은 에러와의 싸움이죠 💪', '거의 다 왔어요! 다시 한번 볼까요?']
    },
    thinking: { 
      icon: 'fa-spinner fa-spin', 
      iconColor: 'text-purple-400', 
      status: '고민 중... 🤔',
      statusTexts: ['잠시만요, 최적의 답을 찾는 중이에요!', '열심히 코드를 분석하고 있어요...', '음, 이건 이렇게 하면 좋겠는데...']
    },
    surprised: { 
      icon: 'fa-face-flushed', 
      iconColor: 'text-red-400', 
      status: '오, 대박! 😲',
      statusTexts: ['와, 이런 방법도 생각하셨나요?', '생각보다 훨씬 빨리 푸셨네요!', '레벨업이라니! 축하드려요 🎉']
    },
  },
  
  // 상황별 메시지 템플릿
  messages: {
    // 세션 복원
    sessionResume: (topic, stepTitle) => {
      const greetings = [
        `어서오세요! 🌟 지난번 **${topic} - ${stepTitle}** 학습, 이어서 바로 가볼까요?`,
        `다시 만나서 반가워요! ✨ **${topic}** 공부하던 거 기억나죠? **${stepTitle}**부터 계속해봐요!`,
        `돌아오셨군요! 🌟 **${topic}** 학습, **${stepTitle}** 단계에서 멈췄었어요. 같이 마저 해봐요!`,
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    },
    
    // 새 세션 시작
    newSession: () => {
      const greetings = [
        `안녕하세요! 코딩 파트너 **루나**입니다 ✨\n오늘은 어떤 멋진 걸 배워볼까요?\n\n예시: "파이썬 기초", "웹 크롤링" 등`,
        `반가워요! AI 튜터 **루나**예요 🚀\n어떤 주제가 궁금하세요?\n\n예시: "Linux 명령어", "알고리즘" 등`,
        `안녕하세요! 🌟 여러분의 코딩 여정을 함께할 **루나**예요.\n배우고 싶은 것을 말씀해주세요!`,
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    },
    
    // 커리큘럼 생성 완료
    curriculumReady: (topic) => {
      return `짜잔! **${topic}** 마스터 플랜을 가져왔어요 🗺️\n어디서부터 시작할까요?`;
    },
    
    // 로드맵 생성 완료
    roadmapCreated: () => {
      return `와! 멋진 로드맵이 완성됐어요 🥰\n카드의 버튼을 눌러 진행해주세요!`;
    },
    
    // 학습유형 선택 요청
    askLearningType: () => {
      return `좋은 주제예요! ✨ 어떻게 학습하고 싶으신가요?`;
    },
    
    // 단원 시작
    lessonStart: (lessonTitle) => {
      const messages = [
        `좋아요! **${lessonTitle}** 힘차게 시작해봐요! 🥰`,
        `**${lessonTitle}**! 재미있는 주제예요 ✨\n같이 알아봐요!`,
        `**${lessonTitle}** 단원이에요 💪\n핵심만 쏙쏙 알려드릴게요!`,
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    },
    
    // MCQ 정답 (피드백과 함께 사용 - 짧게)
    correct: () => {
      const messages = [
        `정답입니다! 🎉`,
        `딩동댕! 완벽해요 💯`,
        `맞아요! 훌륭합니다 ⭐`,
        `정확해요! 센스 있으시네요 🌟`,
        `바로 그거예요! ✨`,
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    },
    
    // MCQ 오답 (격려 메시지 - 짧게)
    incorrect: () => {
      const messages = [
        `앗, 조금 아쉬워요! 다시 한번 볼까요? 💪`,
        `아쉽네요 😞 정답을 확인해봐요!`,
        `틀렸지만 괜찮아요! 배우는 과정이에요 🌱`,
        `거의 다 왔어요! 다시 도전! ✋`,
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    },
    
    // 코드 실행 성공 (AI 피드백과 함께 표시됨 - 짧게)
    codeSuccess: () => {
      const messages = [
        `테스트 통과! 코드가 깔끔하네요 ✨`,
        `완벽해요! 🎊`,
        `대단해요! 로직이 정확해요 💯`,
        `훌륭합니다! 🏆`,
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    },
    
    // 코드 실행 실패 (AI 피드백과 함께 표시됨 - 짧게)
    codeFail: (hint) => {
      const messages = [
        `앗, 테스트를 통과하지 못했어요 🔧 로직을 다시 점검해봐요!`,
        `조금 더 수정이 필요해요 🤔`,
        `거의 다 왔어요! 힌트를 참고해보세요 💡`,
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    },
    
    // 단원 완료
    lessonComplete: () => {
      const messages = [
        `수고하셨습니다! 이번 단원도 멋지게 클리어하셨네요 🎉`,
        `훌륭해요! 🏅 한 단계를 마스터했어요!`,
        `대단해요! ⭐ 끝까지 해내셨네요!`,
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    },
    
    // 커리큘럼 전체 완료
    curriculumComplete: () => {
      const messages = [
        `와, 축하합니다! 🥳 모든 과정을 완주하셨어요! 정말 대단해요!`,
        `🏆 모든 단계를 마스터했어요! 자랑스러운걸요!`,
        `🌟 끝까지 완주! 정말 멋져요!`,
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    },
    
    // 레벨업
    levelUp: (newLevel) => {
      return `대박! **레벨 ${newLevel}**로 올랐어요! 🚀 꾸준히 하신 결과네요!`;
    },
    
    // 연속 학습
    streak: (days) => {
      if (days >= 7) return `🔥 **${days}일 연속** 학습! 열정이 정말 뜨거운걸요?`;
      if (days >= 3) return `🔥 **${days}일 연속**! 습관이 되어가고 있어요!`;
      return `🔥 **${days}일 연속** 학습! 좋은 시작이에요!`;
    },
    
    // 로딩 중
    thinking: () => {
      const messages = [
        `잠시만요, 열심히 생각 중이에요... 🧠`,
        `음, 최적의 답을 찾는 중...`,
        `열심히 분석하고 있어요!`,
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    },
    
    // 에러 발생
    error: () => {
      const messages = [
        `앗, 연결이 살짝 불안정해요 😅 잠시 후 다시 시도해주실래요?`,
        `잠깐 오류가 났어요 🔧 다시 시도해볼까요?`,
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    },
  },
};

// 현재 표정 상태
let currentExpression = 'default';

// 랜덤 선택 헬퍼
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// AI 표정 변경 (실제 이미지 사용)
export function setTutorExpression(expression) {
  const avatarImg = document.getElementById('ai-avatar-img');
  const emotionIcon = document.getElementById('ai-emotion-icon');
  const statusText = document.getElementById('ai-status-text');
  
  // 유효한 표정인지 확인 (없으면 default로 폴백)
  if (!TUTOR.expressions[expression]) {
    expression = 'default';
  }
  
  currentExpression = expression;
  
  const config = TUTOR.expressionConfig[expression] || TUTOR.expressionConfig.default;
  
  // 이미지 변경 (부드러운 전환 효과)
  if (avatarImg && TUTOR.expressions[expression]) {
    avatarImg.style.transition = 'opacity 0.2s ease-in-out';
    avatarImg.style.opacity = '0.7';
    setTimeout(() => {
      avatarImg.src = TUTOR.expressions[expression];
      avatarImg.style.opacity = '1';
    }, 100);
  }
  
  // 아이콘 변경
  if (emotionIcon) {
    emotionIcon.className = `fas ${config.icon} ${config.iconColor} text-[10px]`;
  }
  
  // 상태 텍스트 변경 (랜덤 선택)
  if (statusText) {
    const statusMsg = randomPick(config.statusTexts) || config.status;
    statusText.textContent = statusMsg;
    statusText.className = `text-[10px] ${config.iconColor} font-medium leading-tight`;
  }
}

// 현재 표정 가져오기
export function getCurrentExpression() {
  return currentExpression;
}

// 상황별 자동 표정 + 메시지
export function tutorReact(situation, params = {}) {
  const { addChatMessage } = window.TutorUI || {};
  
  let expression = 'default';
  let message = '';
  
  switch (situation) {
    case 'session_resume':
      expression = 'happy';
      message = TUTOR.messages.sessionResume(params.topic || '학습', params.stepTitle || '현재 단계');
      break;
    case 'new_session':
      expression = 'default';
      message = TUTOR.messages.newSession();
      break;
    case 'curriculum_ready':
      expression = 'teaching';
      message = TUTOR.messages.curriculumReady(params.topic || '학습');
      break;
    case 'lesson_start':
      expression = 'teaching';
      message = TUTOR.messages.lessonStart(params.lessonTitle || '새 단원');
      break;
    case 'correct':
      expression = 'happy';
      message = TUTOR.messages.correct();
      break;
    case 'incorrect':
      expression = 'encouraging';
      message = TUTOR.messages.incorrect();
      break;
    case 'code_success':
      expression = 'proud';
      message = TUTOR.messages.codeSuccess();
      break;
    case 'code_fail':
      expression = 'encouraging';
      message = TUTOR.messages.codeFail(params.hint);
      break;
    case 'lesson_complete':
      expression = 'proud';
      message = TUTOR.messages.lessonComplete();
      break;
    case 'level_up':
      expression = 'surprised';  // 레벨업은 놀람+기쁨!
      message = TUTOR.messages.levelUp(params.level);
      break;
    case 'thinking':
      expression = 'thinking';
      message = TUTOR.messages.thinking();
      break;
    case 'surprised':  // 신규: 놀람/부끄 상황
      expression = 'surprised';
      break;
    case 'error':
      expression = 'encouraging';  // 에러 시에도 격려
      message = TUTOR.messages.error();
      break;
    default:
      expression = 'default';
  }
  
  setTutorExpression(expression);
  
  if (message && addChatMessage) {
    addChatMessage('ai', message);
  }
  
  return message;
}

// 표정을 일정 시간 후 기본으로 복원
export function resetExpressionAfter(ms = 3000) {
  setTimeout(() => {
    setTutorExpression('default');
  }, ms);
}

// 전역 접근을 위해 window에 등록
window.TutorPersona = {
  TUTOR,
  setTutorExpression,
  getCurrentExpression,
  tutorReact,
  resetExpressionAfter,
};
