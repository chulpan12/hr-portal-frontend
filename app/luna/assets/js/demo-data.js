/**
 * ============================================================
 * AI Coding Tutor - Demo Data (게스트 체험용)
 * ============================================================
 * 로그인 없이 체험할 수 있는 샘플 커리큘럼 및 대화 시나리오
 * ============================================================
 */

// 샘플 커리큘럼 (Python 기초)
export const DEMO_CURRICULUM = {
  topic: "Python 기초: 변수와 출력",
  chapters: [
    {
      title: "1단원: Hello World 출력하기",
      description: "파이썬의 print() 함수를 사용해 첫 프로그램을 만들어봅니다.",
      stage: "CONCEPT",
      interactive: true  // 체험 가능
    },
    {
      title: "2단원: 변수 선언과 사용",
      description: "변수에 값을 저장하고 활용하는 방법을 배웁니다.",
      stage: "CONCEPT",
      interactive: false  // 로그인 필요
    },
    {
      title: "3단원: 문자열 다루기",
      description: "문자열 연결과 포매팅을 실습합니다.",
      stage: "PRACTICE",
      interactive: false  // 로그인 필요
    }
  ]
};

// 샘플 대화 시나리오
export const DEMO_CONVERSATIONS = [
  {
    role: 'ai',
    message: '안녕하세요! 저는 AI 코딩 튜터 루나예요. 😊\n무엇을 배우고 싶으신가요?',
    delay: 0
  },
  {
    role: 'user',
    message: 'Python 기초를 배우고 싶어요!',
    delay: 1500
  },
  {
    role: 'ai',
    message: '좋아요! Python은 배우기 쉬운 언어예요. 📚\n먼저 "변수와 출력"부터 시작해볼까요?',
    delay: 2500
  },
  {
    role: 'ai',
    message: '커리큘럼을 생성했어요. 왼쪽 사이드바를 확인해주세요!',
    delay: 4000
  }
];

// 샘플 레슨 플랜 (1단원) - 실제 체험 가능
export const DEMO_LESSON = {
  title: "Hello World 출력하기",
  language: "python",
  steps: [
    {
      type: "concept",
      title: "print() 함수란?",
      content: "Python에서 화면에 메시지를 출력하려면 `print()` 함수를 사용합니다.\n\n예를 들어:\n```python\nprint('Hello, World!')\n```\n\n위 코드는 'Hello, World!'라는 문자열을 화면에 출력합니다.\n\n💡 **팁**: print() 안에 작은따옴표('')나 큰따옴표(\"\")로 문자열을 감싸야 해요!",
      code_template: "print('Hello, World!')"
    },
    {
      type: "concept",
      title: "한글도 출력할 수 있어요!",
      content: "Python은 한글도 완벽하게 지원합니다.\n\n```python\nprint('안녕하세요!')\nprint('파이썬은 쉬워요')\n```\n\n여러 줄을 출력하려면 print()를 여러 번 사용하면 됩니다.",
      code_template: "print('안녕하세요!')\nprint('파이썬은 쉬워요')"
    },
    {
      type: "concept",
      title: "숫자도 출력할 수 있어요",
      content: "숫자는 따옴표 없이 바로 출력할 수 있습니다.\n\n```python\nprint(100)\nprint(3.14)\n```\n\n문자열과 숫자를 같이 출력하려면 쉼표(,)로 구분합니다:\n```python\nprint('내 나이는', 25, '살입니다')\n```",
      code_template: "print('내 나이는', 25, '살입니다')"
    }
  ]
};

// 샘플 문제 (간단한 덧셈)
export const DEMO_PROBLEM = {
  language: "python",
  title: "두 수의 합 구하기",
  description: "두 개의 숫자를 더하는 프로그램을 작성하세요.",
  code_template: "a = 5\nb = 3\n# 두 수의 합을 구해 result에 저장하세요\nresult = ___BLANK___\nprint(result)",
  test_cases: [
    {
      input: "",
      expected_output: "8",
      description: "5 + 3 = 8"
    }
  ],
  hints: [
    "덧셈 연산자 +를 사용하세요",
    "a + b의 결과를 result에 저장하면 됩니다"
  ]
};
