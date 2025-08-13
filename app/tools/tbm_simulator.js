// tbm_simulator.js (전체 최종 코드)

document.addEventListener('DOMContentLoaded', () => {
    // 로그인 체크
    const token = sessionStorage.getItem('ai-tool-token');
    if (!token) {
        document.getElementById('main-content').classList.add('hidden');
        document.getElementById('login-modal').classList.remove('hidden');
        document.getElementById('login-modal').classList.add('flex');
    } else {
        document.getElementById('main-content').classList.remove('hidden');
        document.getElementById('login-modal').classList.add('hidden');
    }

    // 로그인 폼 이벤트 리스너
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    const dom = {
        chatLog: document.getElementById('chatLog'),
        coachLog: document.getElementById('coachLog'),
        userInput: document.getElementById('userInput'),
        sendBtn: document.getElementById('sendBtn'),
        newScenarioBtn: document.getElementById('newScenarioBtn'),
        scenarioContainer: document.getElementById('scenarioContainer'),
        progressRing: document.getElementById('progressRing'),
        safetyScoreText: document.getElementById('safetyScoreText'),
        startSimulationBtn: document.getElementById('startSimulationBtn'),
        startSimulationArea: document.getElementById('startSimulationArea'),
        chatInputArea: document.getElementById('chatInputArea'),
        workAreaDiagram: document.getElementById('workAreaDiagram'),
        diagramLegend: document.getElementById('diagramLegend'),
        showResultBtn: document.getElementById('showResultBtn'),
        suddenEventArea: document.getElementById('suddenEventArea'),
        suddenEventText: document.getElementById('suddenEventText'),
        turnTimeInfo: document.getElementById('turnTimeInfo'),
        elapsedTimeText: document.getElementById('elapsedTimeText'),
        turnsLeftText: document.getElementById('turnsLeftText'),
        replayModal: document.getElementById('replayModal'),
        replayCard: document.getElementById('replayCard'),
        finalResultTitle: document.getElementById('finalResultTitle'),
        finalResultNarrative: document.getElementById('finalResultNarrative'),
        replayLog: document.getElementById('replayLog'),
        closeReplayBtn: document.getElementById('closeReplayBtn'),
        newSimulationBtn: document.getElementById('newSimulationBtn'),
        // ✨ [신규] 재해 수치 표시용 DOM 요소들
        majorCasualtyCount: document.getElementById('majorCasualtyCount'),
        minorCasualtyCount: document.getElementById('minorCasualtyCount'),
        safetyScoreDisplay: document.getElementById('safetyScoreDisplay'),
        // ✨ [신규] 채팅 컨테이너
        chatContainer: document.getElementById('chatContainer'),
        // ✨ [신규] 가이드 모달 관련 DOM 요소들
        showGuideBtn: document.getElementById('showGuideBtn'),
        guideModal: document.getElementById('guideModal'),
        guideCard: document.getElementById('guideCard'),
        guideContent: document.getElementById('guideContent'),
        closeGuideBtn: document.getElementById('closeGuideBtn')
    };

    const API_BASE_URL = 'https://api.dreamofenc.com'; // ✨ [수정] 운영 서버 API 주소로 변경

    // ✨ 기호 설정을 한 곳에서 통합 관리 (유지보수 용이)
    const SYMBOL_CONFIG = [
        { pattern: /:::/g, symbol: ':::', desc: '특정 구역', color: 'text-pink-400' },
        { pattern: /\.\.\./g, symbol: '...', desc: '점선 영역', color: 'text-cyan-400' },
        { pattern: /~~~/g, symbol: '~~~', desc: '유동적 경계', color: 'text-orange-400' },
        { pattern: /\/\\/g, symbol: '/\\', desc: '대각선 구조물', color: 'text-purple-400' },
        { pattern: /!!/g, symbol: '!!', desc: '위험!', color: 'text-red-500 font-bold' },
        { pattern: /W/g, symbol: 'W', desc: '작업자', color: 'text-amber-400' },
        { pattern: /E/g, symbol: 'E', desc: '주요 장비', color: 'text-blue-400' },
        { pattern: /H/g, symbol: 'H', desc: '위험구역', color: 'text-red-400' },
        { pattern: /S/g, symbol: 'S', desc: '안전구역', color: 'text-green-400' },
        { pattern: /#/g, symbol: '#', desc: '벽/울타리', color: 'text-gray-400' },
        { pattern: /=/g, symbol: '=', desc: '방호벽', color: 'text-gray-500' },
        { pattern: /\^/g, symbol: '^', desc: '경사면/높이', color: 'text-yellow-400' },
        { pattern: /@/g, symbol: '@', desc: '주의 지점', color: 'text-yellow-500' },
        { pattern: /\|/g, symbol: '|', desc: '수직 구조물', color: 'text-gray-400' },
        { pattern: /-/g, symbol: '-', desc: '수평선', color: 'text-gray-500' },
        { pattern: /\+/g, symbol: '+', desc: '모서리/교차점', color: 'text-gray-400' },
    ];

    let state = {
        scenario: null,
        workers: [], // ✨ 단일 worker -> 복수 workers 배열로 변경
        history: "",
        safetyScore: 50,
        dialogueLog: [], // ✨ 리플레이를 위한 대화 상세 기록
        isAwaitingResponse: false,
        turn: 0, // 현재 턴 수
        elapsedTime: 0, // 경과된 시간 (초)
        totalTurns: 0, // 전체 턴 수
        turnTime: 0, // 각 턴의 시간 (초)
        // ✨ [신규] 숨겨진 결정적 정보 발견 여부 추적
        criticalInfoUncovered: false,
        hiddenCriticalInfo: null
    };

    // 로그인 처리 함수
    async function handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginSubmitBtn = document.getElementById('login-submit-btn');
        
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.textContent = '로그인 중...';
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
            document.getElementById('login-modal').classList.add('hidden');
            document.getElementById('main-content').classList.remove('hidden');
            document.getElementById('login-form').reset();
        } catch (error) {
            alert(error.message);
        } finally {
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.textContent = '로그인';
        }
    }

    // --- UI 업데이트 함수 ---

    function addMessage(sender, name, text) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble p-3 rounded-lg flex flex-col ${sender === 'user' ? 'chat-bubble-user self-end' : 'chat-bubble-ai self-start'}`;
        bubble.innerHTML = `<span class="text-xs font-bold mb-1">${name}</span><p>${text}</p>`;
        dom.chatLog.appendChild(bubble);
        
        // 스크롤을 맨 아래로 이동 (강제)
        setTimeout(() => { 
            dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
        }, 100);
    }

    function addCoachFeedback(type, text) {
        const card = document.createElement('div');
        card.className = `coach-card p-3 rounded-md bg-gray-800/50 ${type === 'good' ? 'coach-good' : 'coach-suggestion'}`;
        const icon = type === 'good' ? 'fa-thumbs-up text-green-400' : 'fa-lightbulb text-yellow-400';
        card.innerHTML = `<i class="fas ${icon} mr-2"></i><span class="text-sm">${text}</span>`;
        dom.coachLog.appendChild(card);
        
        // 스크롤을 맨 아래로 이동 (강제)
        setTimeout(() => { 
            dom.coachLog.scrollTop = dom.coachLog.scrollHeight;
        }, 100);
    }

    function updateScenarioUI() {
        if (!state.scenario) return;
        
        dom.scenarioContainer.innerHTML = `
            <div class="space-y-3">
                <div>
                    <h4 class="text-sm font-semibold text-blue-400 mb-1">상황</h4>
                    <p class="text-xs text-gray-300">${state.scenario.situation}</p>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-green-400 mb-1">주요 작업</h4>
                    <p class="text-xs text-gray-300">${state.scenario.task}</p>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-yellow-400 mb-1">날씨/환경</h4>
                    <p class="text-xs text-gray-300">${state.scenario.weather}</p>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-purple-400 mb-1">투입 인력</h4>
                    <p class="text-xs text-gray-300">${state.scenario.personnel_count}명</p>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-red-400 mb-1">참여 작업자</h4>
                    <div class="space-y-1">
                        ${state.workers.map(worker => `
                            <div class="text-xs">
                                <span class="font-semibold">${worker.name}</span> (${worker.role})
                                <div class="text-gray-400">${worker.personality}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    function updateWorkAreaDiagramUI(diagramText) {
        if (!diagramText) return;
        
        let processedText = diagramText;
        SYMBOL_CONFIG.forEach(config => {
            processedText = processedText.replace(config.pattern, `<span class="${config.color}">${config.symbol}</span>`);
        });
        
        dom.workAreaDiagram.innerHTML = processedText;
    }

    function updateDiagramLegendUI(diagramText, legendTextFromAI) {
        if (!diagramText) return;
        
        // AI에서 제공한 범례가 있으면 사용, 없으면 기본 범례 생성
        if (legendTextFromAI) {
            dom.diagramLegend.innerHTML = legendTextFromAI.split('\n').map(line => 
                `<div class="text-xs">${line}</div>`
            ).join('');
        } else {
            // 기본 범례 생성
            const usedSymbols = SYMBOL_CONFIG.filter(config => 
                diagramText.includes(config.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            );
            
            dom.diagramLegend.innerHTML = usedSymbols.map(config => 
                `<div class="text-xs"><span class="${config.color}">${config.symbol}</span> ${config.desc}</div>`
            ).join('');
        }
    }

    function updateSafetyScoreUI() {
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (state.safetyScore / 100) * circumference;
        dom.progressRing.style.strokeDasharray = circumference;
        dom.progressRing.style.strokeDashoffset = offset;
        dom.safetyScoreText.textContent = state.safetyScore;
    }

    function showSuddenEvent(eventText) {
        dom.suddenEventText.textContent = eventText;
        dom.suddenEventArea.classList.remove('hidden');
        
        // 5초 후 자동으로 숨김
        setTimeout(() => {
            dom.suddenEventArea.classList.add('hidden');
        }, 5000);
    }

    function updateTurnAndTime() {
        dom.elapsedTimeText.textContent = formatTime(state.elapsedTime);
        dom.turnsLeftText.textContent = Math.max(0, 10 - state.turn);
    }

    function initializeTurnTime() {
        state.turn = 0;
        state.elapsedTime = 0;
        updateTurnAndTime();
        
        // 1초마다 시간 업데이트
        if (window.turnTimer) clearInterval(window.turnTimer);
        window.turnTimer = setInterval(() => {
            state.elapsedTime++;
            updateTurnAndTime();
        }, 1000);
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // --- API 호출 함수 ---

    async function fetchNewScenario() {
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
            state.scenario = data.scenario;
            state.workers = data.workers;
            state.history = "";
            state.safetyScore = 50;
            state.dialogueLog = [];
            state.criticalInfoUncovered = false;
            state.hiddenCriticalInfo = data.scenario.hidden_critical_info;
            
            updateScenarioUI();
            updateWorkAreaDiagramUI(state.scenario.work_area_diagram);
            updateDiagramLegendUI(state.scenario.work_area_diagram, state.scenario.diagram_legend);
            updateSafetyScoreUI();
            
            // 첫 대화 추가
            if (data.initial_dialogue && data.initial_dialogue.length > 0) {
                data.initial_dialogue.forEach(dialogue => {
                    addMessage('ai', dialogue.speaker_name, dialogue.text);
                    state.dialogueLog.push({
                        sender: 'ai',
                        name: dialogue.speaker_name,
                        text: dialogue.text,
                        timestamp: new Date().toISOString()
                    });
                });
            }
            
            return true;
        } catch (error) {
            console.error('시나리오 생성 오류:', error);
            alert('시나리오 생성에 실패했습니다: ' + error.message);
            return false;
        }
    }

    async function sendMessage(message) {
        if (state.isAwaitingResponse) return;
        
        state.isAwaitingResponse = true;
        addMessage('user', '관리자', message);
        state.dialogueLog.push({
            sender: 'user',
            name: '관리자',
            text: message,
            timestamp: new Date().toISOString()
        });
        
        try {
            const token = sessionStorage.getItem('ai-tool-token');
            const response = await fetch(`${API_BASE_URL}/api/tbm/chat`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    scenario: state.scenario,
                    workers: state.workers,
                    history: state.history,
                    message: message,
                    currentSafetyScore: state.safetyScore
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
                    state.dialogueLog.push({
                        sender: 'ai',
                        name: response.speaker_name,
                        text: response.text,
                        timestamp: new Date().toISOString()
                    });
                });
            }
            
            // 돌발 상황 처리
            if (data.sudden_event) {
                showSuddenEvent(data.sudden_event);
            }
            
            // 안전도 점수 업데이트
            state.safetyScore = Math.max(0, Math.min(100, state.safetyScore + data.safety_score_change));
            updateSafetyScoreUI();
            
            // 코칭 피드백 추가
            if (data.coach_feedback) {
                addCoachFeedback(data.coach_feedback.type, data.coach_feedback.text);
            }
            
            // 숨겨진 정보 발견 여부 업데이트
            if (data.critical_info_revealed) {
                state.criticalInfoUncovered = true;
            }
            
            // 턴 카운트 증가
            state.turn++;
            updateTurnAndTime();
            
        } catch (error) {
            console.error('AI 응답 오류:', error);
            addMessage('ai', '시스템', '죄송합니다. 응답 생성 중 오류가 발생했습니다.');
        } finally {
            state.isAwaitingResponse = false;
        }
    }

    async function getWorkResult() {
        try {
            const token = sessionStorage.getItem('ai-tool-token');
            const response = await fetch(`${API_BASE_URL}/api/tbm/result`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    safetyScore: state.safetyScore,
                    scenario: state.scenario,
                    workers: state.workers,
                    conversationHistory: state.history,
                    criticalInfoUncovered: state.criticalInfoUncovered
                })
            });
            
            if (!response.ok) {
                throw new Error('결과 분석에 실패했습니다.');
            }
            
            return await response.json();
        } catch (error) {
            console.error('결과 분석 오류:', error);
            throw error;
        }
    }

    // --- 이벤트 리스너 ---

    dom.newScenarioBtn.addEventListener('click', async () => {
        const success = await fetchNewScenario();
        if (success) {
            dom.newScenarioBtnText.textContent = '새로운 상황';
        }
    });

    dom.startSimulationBtn.addEventListener('click', () => {
        dom.startSimulationArea.classList.add('hidden');
        dom.chatContainer.classList.remove('hidden');
        dom.chatInputArea.classList.remove('hidden');
        dom.turnTimeInfo.classList.remove('hidden');
        initializeTurnTime();
    });

    dom.sendBtn.addEventListener('click', () => {
        const message = dom.userInput.value.trim();
        if (message && !state.isAwaitingResponse) {
            sendMessage(message);
            dom.userInput.value = '';
        }
    });

    dom.userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            dom.sendBtn.click();
        }
    });

    dom.showResultBtn.addEventListener('click', async () => {
        try {
            const result = await getWorkResult();
            showFinalResult(result);
        } catch (error) {
            alert('결과 분석에 실패했습니다: ' + error.message);
        }
    });

    dom.closeReplayBtn.addEventListener('click', () => {
        dom.replayModal.classList.add('hidden');
    });

    dom.newSimulationBtn.addEventListener('click', () => {
        dom.replayModal.classList.add('hidden');
        resetSimulation();
    });

    dom.showGuideBtn.addEventListener('click', () => {
        dom.guideModal.classList.remove('hidden');
        loadGuideContent();
    });

    dom.closeGuideBtn.addEventListener('click', () => {
        dom.guideModal.classList.add('hidden');
    });

    // --- 결과 표시 함수 ---

    function showFinalResult(result) {
        dom.finalResultTitle.textContent = getResultTitle(result.result_type);
        dom.finalResultNarrative.textContent = result.narrative;
        
        // 재해 수치 파싱 및 표시
        const casualtyStats = parseCasualtyStats(result.casualties);
        dom.majorCasualtyCount.textContent = casualtyStats.major;
        dom.minorCasualtyCount.textContent = casualtyStats.minor;
        dom.safetyScoreDisplay.textContent = state.safetyScore;
        
        // 리플레이 로그 생성
        generateReplayLog();
        
        // 모달 표시
        dom.replayModal.classList.remove('hidden');
        setTimeout(() => {
            dom.replayCard.classList.remove('scale-95', 'opacity-0');
        }, 100);
    }

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

    function parseCasualtyStats(casualtiesText) {
        const majorMatch = casualtiesText.match(/중대재해\s*(\d+)/);
        const minorMatch = casualtiesText.match(/일반재해\s*(\d+)/);
        
        return {
            major: majorMatch ? parseInt(majorMatch[1]) : 0,
            minor: minorMatch ? parseInt(minorMatch[1]) : 0
        };
    }

    function generateReplayLog() {
        dom.replayLog.innerHTML = state.dialogueLog.map(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            const senderClass = log.sender === 'user' ? 'text-blue-400' : 'text-gray-300';
            const nameClass = log.sender === 'user' ? 'font-bold' : 'font-semibold';
            
            return `
                <div class="mb-2 p-2 rounded bg-gray-800">
                    <div class="text-xs text-gray-500 mb-1">${time}</div>
                    <div class="${senderClass}">
                        <span class="${nameClass}">${log.name}:</span> ${log.text}
                    </div>
                </div>
            `;
        }).join('');
    }

    function resetSimulation() {
        state.turn = 0;
        state.elapsedTime = 0;
        state.dialogueLog = [];
        state.criticalInfoUncovered = false;
        
        dom.chatLog.innerHTML = '';
        dom.coachLog.innerHTML = '';
        dom.startSimulationArea.classList.remove('hidden');
        dom.chatContainer.classList.add('hidden');
        dom.chatInputArea.classList.add('hidden');
        dom.turnTimeInfo.classList.add('hidden');
        dom.suddenEventArea.classList.add('hidden');
        
        if (window.turnTimer) {
            clearInterval(window.turnTimer);
        }
    }

    function loadGuideContent() {
        dom.guideContent.innerHTML = `
            <div class="space-y-6">
                <div>
                    <h3 class="text-lg font-semibold mb-2 text-teal-400">🎯 목표</h3>
                    <p class="text-sm">AI 작업자들과 대화하며 안전 리더십을 훈련하고, 숨겨진 위험 요소를 발견하여 안전한 작업 환경을 조성하세요.</p>
                </div>
                <div>
                    <h3 class="text-lg font-semibold mb-2 text-teal-400">🎮 게임 방법</h3>
                    <ul class="text-sm space-y-1 list-disc list-inside">
                        <li>새 시나리오를 시작하면 AI 작업자들과 TBM(도구상자회의)가 시작됩니다.</li>
                        <li>작업자들의 대화를 주의 깊게 듣고, 위험 요소를 파악하세요.</li>
                        <li>적절한 질문과 지시로 안전한 작업 환경을 만들어가세요.</li>
                        <li>숨겨진 위험 요소를 발견하면 더 높은 점수를 얻을 수 있습니다.</li>
                    </ul>
                </div>
                <div>
                    <h3 class="text-lg font-semibold mb-2 text-teal-400">📊 점수 시스템</h3>
                    <ul class="text-sm space-y-1 list-disc list-inside">
                        <li><strong>85점 이상:</strong> 완벽한 성공 - 재해 없음</li>
                        <li><strong>60-84점:</strong> 아차사고 또는 경미한 재해</li>
                        <li><strong>40-59점:</strong> 일반재해 발생</li>
                        <li><strong>40점 미만:</strong> 중대재해 발생</li>
                    </ul>
                </div>
                <div>
                    <h3 class="text-lg font-semibold mb-2 text-teal-400">💡 팁</h3>
                    <ul class="text-sm space-y-1 list-disc list-inside">
                        <li>작업자들의 말에 귀 기울이고, 불안해하는 표현을 놓치지 마세요.</li>
                        <li>구체적이고 명확한 지시를 내리세요.</li>
                        <li>작업자들의 의견을 경청하고 공감을 표현하세요.</li>
                        <li>돌발 상황이 발생하면 즉시 적절한 조치를 취하세요.</li>
                    </ul>
                </div>
            </div>
        `;
    }

    // 초기 시나리오 로드
    fetchNewScenario();
}); 