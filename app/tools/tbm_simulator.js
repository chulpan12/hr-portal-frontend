const API_BASE_URL = 'https://api.dreamofenc.com'; // ✨ [수정] 운영 서버 API 주소로 변경

// DOM 요소들
const dom = {
    mainContent: document.getElementById('main-content'),
    loginModal: document.getElementById('login-modal'),
    loginForm: document.getElementById('login-form'),
    loginSubmitBtn: document.getElementById('login-submit-btn'),
    startBtn: document.getElementById('startBtn'),
    guideBtn: document.getElementById('guideBtn'),
    themeToggle: document.getElementById('themeToggle'),
    themeIconMoon: document.getElementById('themeIconMoon'),
    themeIconSun: document.getElementById('themeIconSun'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    chatLog: document.getElementById('chatLog'),
    coachLog: document.getElementById('coachLog'),
    scenarioInfo: document.getElementById('scenarioInfo'),
    safetyScore: document.getElementById('safetyScore'),
    progressRing: document.getElementById('progressRing'),
    turnCount: document.getElementById('turnCount'),
    elapsedTime: document.getElementById('elapsedTime'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingMessage: document.getElementById('loadingMessage'),
    guideModal: document.getElementById('guideModal'),
    closeGuideBtn: document.getElementById('closeGuideBtn'),
    resultModal: document.getElementById('resultModal'),
    resultTitle: document.getElementById('resultTitle'),
    resultContent: document.getElementById('resultContent'),
    replayBtn: document.getElementById('replayBtn'),
    closeResultBtn: document.getElementById('closeResultBtn')
};

// 시뮬레이션 상태
let currentScenario = null;
let currentWorkers = [];
let conversationHistory = "";
let currentSafetyScore = 50;
let turnCount = 0;
let startTime = null;
let timerInterval = null;
let criticalInfoUncovered = false;

// DOM 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('ai-tool-token');
    if (!token) {
        dom.mainContent.classList.add('hidden');
        dom.loginModal.classList.remove('hidden');
        dom.loginModal.classList.add('flex');
    } else {
        dom.mainContent.classList.remove('hidden');
        dom.loginModal.classList.add('hidden');
    }
    
    updateThemeIcon();
    setupEventListeners();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    dom.loginForm.addEventListener('submit', handleLogin);
    dom.startBtn.addEventListener('click', startNewScenario);
    dom.guideBtn.addEventListener('click', showGuideModal);
    dom.closeGuideBtn.addEventListener('click', closeGuideModal);
    dom.themeToggle.addEventListener('click', toggleTheme);
    dom.sendBtn.addEventListener('click', handleSend);
    dom.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
    dom.replayBtn.addEventListener('click', startNewConversation);
    dom.closeResultBtn.addEventListener('click', closeResultModal);
    
    // 10턴 후 자동으로 결과 표시
    setInterval(() => {
        if (turnCount >= 10 && currentScenario) {
            showResultAndReplay();
        }
    }, 1000);
}

// 로그인 처리
async function handleLogin(e) {
    e.preventDefault();
    const username = dom.loginForm.username.value;
    const password = dom.loginForm.password.value;
    dom.loginSubmitBtn.disabled = true;
    dom.loginSubmitBtn.textContent = '로그인 중...';
    const apiUrl = `${API_BASE_URL}/api/auth/login`; 
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '로그인에 실패했습니다.');
        }
        const data = await response.json();
        sessionStorage.setItem('ai-tool-token', data.token);
        dom.loginModal.classList.add('hidden');
        dom.mainContent.classList.remove('hidden');
        dom.loginForm.reset();
    } catch (error) {
        alert(error.message);
    } finally {
        dom.loginSubmitBtn.disabled = false;
        dom.loginSubmitBtn.textContent = '로그인';
    }
}

// 새 시나리오 시작
async function startNewScenario() {
    setLoading(true, "시나리오를 생성하고 있습니다...");
    
    try {
        const token = sessionStorage.getItem('ai-tool-token');
        const response = await fetch(`${API_BASE_URL}/api/tbm/scenario`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('시나리오 생성에 실패했습니다.');
        }
        
        const data = await response.json();
        currentScenario = data.scenario;
        currentWorkers = data.workers;
        conversationHistory = "";
        currentSafetyScore = 50;
        turnCount = 0;
        criticalInfoUncovered = false;
        
        // UI 업데이트
        updateScenarioUI();
        updateSafetyScoreUI();
        initializeTurnTime();
        
        // 첫 대화 추가
        if (data.initial_dialogue && data.initial_dialogue.length > 0) {
            data.initial_dialogue.forEach(dialogue => {
                addMessage('ai', dialogue.speaker_name, dialogue.text);
            });
        }
        
        setLoading(false);
    } catch (error) {
        console.error('시나리오 생성 오류:', error);
        alert('시나리오 생성에 실패했습니다: ' + error.message);
        setLoading(false);
    }
}

// 메시지 전송 처리
async function handleSend() {
    const message = dom.messageInput.value.trim();
    if (!message || !currentScenario) return;
    
    // 사용자 메시지 추가
    addMessage('user', '관리자', message);
    dom.messageInput.value = '';
    
    // AI 응답 요청
    try {
        const token = sessionStorage.getItem('ai-tool-token');
        const response = await fetch(`${API_BASE_URL}/api/tbm/chat`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                scenario: currentScenario,
                workers: currentWorkers,
                history: conversationHistory,
                message: message,
                currentSafetyScore: currentSafetyScore
            })
        });
        
        if (!response.ok) {
            throw new Error('AI 응답 생성에 실패했습니다.');
        }
        
        const data = await response.json();
        
        // 작업자 응답 추가
        if (data.worker_responses) {
            data.worker_responses.forEach(response => {
                addMessage('ai', response.speaker_name, response.text);
            });
        }
        
        // 돌발 상황 처리
        if (data.sudden_event) {
            showSuddenEvent(data.sudden_event);
        }
        
        // 안전도 점수 업데이트
        currentSafetyScore = Math.max(0, Math.min(100, currentSafetyScore + data.safety_score_change));
        updateSafetyScoreUI();
        
        // 코칭 피드백 추가
        if (data.coach_feedback) {
            addCoachFeedback(data.coach_feedback.type, data.coach_feedback.text);
        }
        
        // 숨겨진 정보 발견 여부 업데이트
        if (data.critical_info_revealed) {
            criticalInfoUncovered = true;
        }
        
        // 턴 카운트 증가
        turnCount++;
        updateTurnAndTime();
        
    } catch (error) {
        console.error('AI 응답 오류:', error);
        addMessage('ai', '시스템', '죄송합니다. 응답 생성 중 오류가 발생했습니다.');
    }
}

// 메시지 추가
function addMessage(sender, name, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`;
    
    const bubbleClass = sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai';
    messageDiv.innerHTML = `
        <div class="chat-bubble ${bubbleClass} px-4 py-2 rounded-lg max-w-xs">
            <div class="font-semibold text-sm mb-1">${name}</div>
            <div>${text}</div>
        </div>
    `;
    
    dom.chatLog.appendChild(messageDiv);
    dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
    
    // 대화 기록에 추가
    if (sender === 'user') {
        conversationHistory += `관리자: ${text}\n`;
    } else {
        conversationHistory += `${name}: ${text}\n`;
    }
}

// 코칭 피드백 추가
function addCoachFeedback(type, text) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = `coach-card p-3 rounded-lg ${type === 'good' ? 'coach-good' : 'coach-suggestion'}`;
    feedbackDiv.style.backgroundColor = 'var(--bg-secondary)';
    feedbackDiv.style.borderColor = type === 'good' ? '#22c55e' : '#facc15';
    
    const icon = type === 'good' ? 'fa-check-circle' : 'fa-lightbulb';
    const color = type === 'good' ? 'text-green-400' : 'text-yellow-400';
    
    feedbackDiv.innerHTML = `
        <div class="flex items-start space-x-2">
            <i class="fas ${icon} ${color} mt-1"></i>
            <div class="text-sm">${text}</div>
        </div>
    `;
    
    dom.coachLog.appendChild(feedbackDiv);
    dom.coachLog.scrollTop = dom.coachLog.scrollHeight;
}

// 시나리오 UI 업데이트
function updateScenarioUI() {
    if (!currentScenario) return;
    
    dom.scenarioInfo.innerHTML = `
        <div class="space-y-4">
            <div>
                <h4 class="font-semibold text-blue-400 mb-2">상황</h4>
                <p class="text-sm">${currentScenario.situation}</p>
            </div>
            <div>
                <h4 class="font-semibold text-green-400 mb-2">주요 작업</h4>
                <p class="text-sm">${currentScenario.task}</p>
            </div>
            <div>
                <h4 class="font-semibold text-yellow-400 mb-2">날씨/환경</h4>
                <p class="text-sm">${currentScenario.weather}</p>
            </div>
            <div>
                <h4 class="font-semibold text-purple-400 mb-2">투입 인력</h4>
                <p class="text-sm">${currentScenario.personnel_count}명</p>
            </div>
            <div>
                <h4 class="font-semibold text-red-400 mb-2">작업 구역</h4>
                <pre id="workAreaDiagram" class="text-xs bg-gray-800 p-2 rounded overflow-x-auto">${currentScenario.work_area_diagram}</pre>
                <div class="text-xs text-gray-400 mt-1">${currentScenario.diagram_legend}</div>
            </div>
            <div>
                <h4 class="font-semibold text-indigo-400 mb-2">참여 작업자</h4>
                <div class="space-y-2">
                    ${currentWorkers.map(worker => `
                        <div class="text-sm">
                            <span class="font-semibold">${worker.name}</span> (${worker.role})
                            <div class="text-xs text-gray-400">${worker.personality}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// 돌발 상황 표시
function showSuddenEvent(eventText) {
    const eventDiv = document.createElement('div');
    eventDiv.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse';
    eventDiv.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${eventText}</span>
        </div>
    `;
    
    document.body.appendChild(eventDiv);
    
    setTimeout(() => {
        eventDiv.remove();
    }, 5000);
}

// 안전도 점수 UI 업데이트
function updateSafetyScoreUI() {
    dom.safetyScore.textContent = currentSafetyScore;
    
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (currentSafetyScore / 100) * circumference;
    dom.progressRing.style.strokeDashoffset = offset;
    
    // 점수에 따른 색상 변경
    let color = '#f59e0b'; // amber-500
    if (currentSafetyScore >= 80) color = '#22c55e'; // green-500
    else if (currentSafetyScore >= 60) color = '#3b82f6'; // blue-500
    else if (currentSafetyScore < 40) color = '#ef4444'; // red-500
    
    dom.progressRing.style.stroke = color;
}

// 턴 및 시간 초기화
function initializeTurnTime() {
    startTime = new Date();
    turnCount = 0;
    updateTurnAndTime();
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTurnAndTime, 1000);
}

// 턴 및 시간 업데이트
function updateTurnAndTime() {
    dom.turnCount.textContent = turnCount;
    
    if (startTime) {
        const elapsed = Math.floor((new Date() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        dom.elapsedTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

// 로딩 상태 설정
function setLoading(isLoading, message = "") {
    if (isLoading) {
        dom.loadingOverlay.classList.remove('hidden');
        if (message) {
            dom.loadingMessage.textContent = message;
        }
    } else {
        dom.loadingOverlay.classList.add('hidden');
    }
}

// 가이드 모달 표시
function showGuideModal() {
    dom.guideModal.classList.remove('hidden');
}

// 가이드 모달 닫기
function closeGuideModal() {
    dom.guideModal.classList.add('hidden');
}

// 결과 모달 표시
async function showResultAndReplay() {
    if (!currentScenario) return;
    
    setLoading(true, "작업 결과를 분석하고 있습니다...");
    
    try {
        const token = sessionStorage.getItem('ai-tool-token');
        const response = await fetch(`${API_BASE_URL}/api/tbm/result`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                safetyScore: currentSafetyScore,
                scenario: currentScenario,
                workers: currentWorkers,
                conversationHistory: conversationHistory,
                criticalInfoUncovered: criticalInfoUncovered
            })
        });
        
        if (!response.ok) {
            throw new Error('결과 분석에 실패했습니다.');
        }
        
        const data = await response.json();
        
        // 결과 모달 표시
        dom.resultTitle.textContent = getResultTitle(data.result_type);
        dom.resultContent.innerHTML = `
            <div class="space-y-4">
                <div class="p-4 rounded-lg" style="background-color: var(--input-bg); border: 1px solid var(--input-border);">
                    <p class="text-lg mb-2">${data.narrative}</p>
                    <p class="text-sm text-gray-400">재해 현황: ${data.casualties}</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-amber-400">최종 안전도: ${currentSafetyScore}점</p>
                    <p class="text-sm text-gray-400">총 ${turnCount}턴, ${dom.elapsedTime.textContent} 소요</p>
                </div>
            </div>
        `;
        
        dom.resultModal.classList.remove('hidden');
        setLoading(false);
        
    } catch (error) {
        console.error('결과 분석 오류:', error);
        alert('결과 분석에 실패했습니다: ' + error.message);
        setLoading(false);
    }
}

// 결과 제목 생성
function getResultTitle(resultType) {
    switch (resultType) {
        case 'success':
            return '🎉 완벽한 성공!';
        case 'minor_accident':
            return '⚠️ 아차사고 발생';
        case 'major_accident':
            return '🚨 중대재해 발생';
        default:
            return '📊 작업 결과';
    }
}

// 결과 모달 닫기
function closeResultModal() {
    dom.resultModal.classList.add('hidden');
}

// 새 대화 시작
function startNewConversation() {
    closeResultModal();
    startNewScenario();
}

// 테마 토글
function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('light')) {
        html.classList.remove('light');
        localStorage.setItem('theme', 'dark');
    } else {
        html.classList.add('light');
        localStorage.setItem('theme', 'light');
    }
    updateThemeIcon();
}

// 테마 아이콘 업데이트
function updateThemeIcon() {
    const html = document.documentElement;
    if (html.classList.contains('light')) {
        dom.themeIconMoon.classList.add('hidden');
        dom.themeIconSun.classList.remove('hidden');
    } else {
        dom.themeIconMoon.classList.remove('hidden');
        dom.themeIconSun.classList.add('hidden');
    }
}

// 저장된 테마 적용
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.documentElement.classList.add('light');
} 