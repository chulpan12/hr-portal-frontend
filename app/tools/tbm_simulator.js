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
            closeGuideBtn: document.getElementById('closeGuideBtn'),
            // ✨ [신규] 현장 이미지 관련 DOM 요소들
            siteImageContainer: document.getElementById('siteImageContainer'),
            siteImage: document.getElementById('siteImage'),
            siteImageSpinner: document.getElementById('siteImageSpinner'),
            siteImagePlaceholder: document.getElementById('siteImagePlaceholder'),
            // ✨ [신규] 결과 이미지 관련 DOM 요소들
            resultImageContainer: document.getElementById('resultImageContainer'),
            resultImage: document.getElementById('resultImage')
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
        let cardClass, icon, iconClass;
        
        if (type === 'good') {
            cardClass = 'coach-good';
            icon = 'fa-thumbs-up';
            iconClass = 'text-green-400';
        } else if (type === 'mixed') {
            cardClass = 'coach-mixed';
            icon = 'fa-check';
            iconClass = 'text-blue-400';
        } else {
            cardClass = 'coach-suggestion';
            icon = 'fa-lightbulb';
            iconClass = 'text-yellow-400';
        }
        
        card.className = `coach-card p-3 rounded-md bg-gray-800/50 ${cardClass}`;
        card.innerHTML = `<div class="flex items-start gap-3"><i class="fas ${icon} ${iconClass} mt-1"></i><p class="text-sm">${text}</p></div>`;
        dom.coachLog.appendChild(card);
        
        // 스크롤을 맨 아래로 이동 (강제)
        setTimeout(() => { 
            dom.coachLog.scrollTop = dom.coachLog.scrollHeight;
        }, 100);
    }

    function updateScenarioUI() {
        if (!state.scenario || !state.workers.length) return;
        
        // 기본 시나리오 정보
        let scenarioHTML = `
            <p><strong><i class="fas fa-cloud w-5 text-center mr-2 text-gray-400"></i>상황:</strong> ${state.scenario.situation}</p>
            <p><strong><i class="fas fa-person-digging w-5 text-center mr-2 text-gray-400"></i>작업:</strong> ${state.scenario.task}</p>
            <p><strong><i class="fas fa-users w-5 text-center mr-2 text-gray-400"></i>투입인력:</strong> ${state.scenario.personnel_count || 'N/A'}명</p>
        `;
        
        // ✨ 여러 명의 작업자 정보를 리스트로 표시
        let workersHTML = '<div class="mt-3"><strong><i class="fas fa-user-group w-5 text-center mr-2 text-gray-400"></i>참여 작업자:</strong>';
        state.workers.forEach(worker => {
            workersHTML += `
                <div class="mt-2 p-2 bg-gray-700/50 rounded">
                    <p class="font-bold text-sm">${worker.name} <span class="font-normal text-xs">(${worker.role})</span></p>
                    <p class="text-xs text-gray-400">└ 성향: ${worker.personality}</p>
                </div>
            `;
        });
        workersHTML += '</div>';
        
        dom.scenarioContainer.innerHTML = scenarioHTML + workersHTML;
    }

    // ✨ [신규] 돌발 상황 표시 함수 (이미지 지원 버전)
    function showSuddenEvent(suddenEvent) {
        if (!suddenEvent) return;
        
        // suddenEvent가 문자열인 경우 (기존 호환성 유지)
        const eventText = typeof suddenEvent === 'string' ? suddenEvent : suddenEvent.text;
        const imageKey = typeof suddenEvent === 'object' ? suddenEvent.image_key : null;
        
        if (!eventText) return;
        
        // 상단 경고 영역 표시 (부드러운 애니메이션)
        dom.suddenEventText.textContent = eventText;
        dom.suddenEventArea.classList.remove('hidden');
        dom.suddenEventArea.classList.add('animate-pulse');
        
        // 채팅창에도 돌발 상황 메시지 추가 (중복 방지)
        const existingEvent = dom.chatLog.querySelector('.sudden-event-bubble');
        if (existingEvent) {
            existingEvent.remove(); // 기존 돌발 상황 메시지 제거
        }
        
        const suddenEventBubble = document.createElement('div');
        suddenEventBubble.className = 'w-full flex flex-col items-start sudden-event-bubble'; // 전체 너비를 사용하도록 수정

        let bubbleHTML = `
            <div class="chat-bubble p-3 rounded-lg flex flex-col chat-bubble-ai self-start bg-red-900/50 border border-red-500 animate-pulse">
                <span class="text-xs font-bold mb-1 text-red-300">🚨 돌발 상황</span>
                <div class="flex items-center gap-2">
                    <i class="fas fa-exclamation-triangle text-red-400"></i>
                    <p class="text-red-200">${eventText}</p>
                </div>
            </div>
        `;

        // 이미지 키가 있는 경우, 이미지 버블 추가
        if (imageKey) {
            const imageUrl = `./images/sites/${imageKey}.png?v=${new Date().getTime()}`;
            bubbleHTML += `
                <div class="mt-2 w-full max-w-md self-start rounded-lg overflow-hidden border-2 border-red-500">
                    <img src="${imageUrl}" alt="${eventText}" class="w-full aspect-video object-cover" 
                         onerror="this.style.display='none'; console.warn('돌발 상황 이미지 로딩 실패:', '${imageUrl}');">
                </div>
            `;
        }
        
        suddenEventBubble.innerHTML = bubbleHTML;
        dom.chatLog.appendChild(suddenEventBubble);
        
        // 스크롤을 맨 아래로 이동 (강제)
        setTimeout(() => { 
            dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
        }, 100);
        
        // 5초 후 상단 경고 영역 사라지게 함 (채팅창 메시지는 유지)
        setTimeout(() => {
            dom.suddenEventArea.classList.remove('animate-pulse');
            dom.suddenEventArea.classList.add('hidden');
        }, 5000);
    }

    function updateWorkAreaDiagramUI(diagramText) {
        if (!diagramText || diagramText === "[도면 정보 없음]") {
            dom.workAreaDiagram.textContent = '도면 정보가 없습니다.';
            return;
        }

        // AI가 보낸 \n을 실제 줄바꿈 문자로 변경
        const cleanText = diagramText.replace(/\\n/g, '\n');
        let coloredDiagramHTML = '';
        let i = 0;

        while (i < cleanText.length) {
            let matchFound = false;
            // SYMBOL_CONFIG는 긴 기호부터 정렬되어 있으므로, 가장 긴 기호부터 확인합니다.
            for (const config of SYMBOL_CONFIG) {
                // 현재 위치(i)에서 symbol이 일치하는지 확인
                if (cleanText.substring(i, i + config.symbol.length) === config.symbol) {
                    coloredDiagramHTML += `<span class="${config.color}">${config.symbol}</span>`;
                    i += config.symbol.length; // 일치한 기호의 길이만큼 인덱스 이동
                    matchFound = true;
                    break; // 일치하는 가장 긴 기호를 찾았으므로 내부 루프 중단
                }
            }

            // 어떤 기호와도 일치하지 않으면, 현재 문자 하나만 그대로 추가
            if (!matchFound) {
                // HTML 특수 문자인 <, > 등을 안전하게 처리
                const char = cleanText[i];
                if (char === '<') {
                    coloredDiagramHTML += '&lt;';
                } else if (char === '>') {
                    coloredDiagramHTML += '&gt;';
                } else {
                    coloredDiagramHTML += char;
                }
                i++; // 인덱스 1 증가
            }
        }

        dom.workAreaDiagram.innerHTML = coloredDiagramHTML;
    }
    
    function updateDiagramLegendUI(diagramText, legendTextFromAI) {
        let legendHTML = '<div class="grid grid-cols-2 gap-x-4 gap-y-1">';
        const usedSymbols = new Set();
        
        // 도면에서 사용된 기호 자동 감지
        SYMBOL_CONFIG.forEach(({ pattern, symbol }) => {
            if (pattern.test(diagramText)) {
                usedSymbols.add(symbol);
            }
        });

        if (usedSymbols.size === 0) {
            dom.diagramLegend.innerHTML = '<div class="text-gray-500 text-xs">표시할 범례가 없습니다.</div>';
            return;
        }

        usedSymbols.forEach(symbol => {
            const config = SYMBOL_CONFIG.find(c => c.symbol === symbol);
            if (config) {
                 legendHTML += `
                    <div class="flex items-center gap-2">
                        <span class="font-mono ${config.color} w-6 text-center">${config.symbol}</span>
                        <span class="text-gray-300 text-xs">${config.desc}</span>
                    </div>`;
            }
        });
        
        legendHTML += '</div>';
        dom.diagramLegend.innerHTML = legendHTML;
    }

    // ✨ [신규] 현장 이미지 표시 함수
    function updateSiteImageUI(imageKey) {
        const { siteImage, siteImageSpinner, siteImagePlaceholder } = dom;
        
        if (imageKey) {
            // 이미지 경로를 설정합니다. (예: /images/sites/fall_01.jpg)
            const imageUrl = `./images/sites/${imageKey}.png?v=${new Date().getTime()}`;
            
            // 플레이스홀더 숨기기
            siteImagePlaceholder.classList.add('hidden');
            siteImage.classList.add('hidden');
            siteImageSpinner.classList.remove('hidden');

            // 이미지 로딩이 끝나면 스피너를 숨기고 이미지를 표시
            siteImage.onload = () => {
                siteImageSpinner.classList.add('hidden');
                siteImage.classList.remove('hidden');
            };
            
            // 이미지 로딩 실패 시 처리
            siteImage.onerror = () => {
                siteImageSpinner.classList.add('hidden');
                siteImagePlaceholder.classList.remove('hidden');
                console.warn(`현장 이미지 로딩 실패: ${imageUrl}`);
            };
            
            siteImage.src = imageUrl;
        } else {
            // 이미지 키가 없으면 플레이스홀더 표시
            siteImage.classList.add('hidden');
            siteImageSpinner.classList.add('hidden');
            siteImagePlaceholder.classList.remove('hidden');
        }
    }

    function updateSafetyScoreUI() {
        // ✨ [수정] 시뮬레이션 중에는 점수를 숨기고, 게이지만 회색으로 표시
        const radius = dom.progressRing.r.baseVal.value;
        const circumference = 2 * Math.PI * radius;
        dom.progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
        dom.progressRing.style.strokeDashoffset = circumference; // 완전히 숨김
        dom.safetyScoreText.textContent = '?';
    }

    // ✨ [신규] 최종 결과에서 점수를 표시하는 함수
    function showFinalSafetyScore() {
        const radius = dom.progressRing.r.baseVal.value;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (state.safetyScore / 100) * circumference;
        dom.progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
        dom.progressRing.style.strokeDashoffset = offset;
        dom.safetyScoreText.textContent = state.safetyScore;
        
        // 점수에 따른 색상 변경
        if (state.safetyScore >= 80) {
            dom.progressRing.style.stroke = '#22c55e'; // 초록색
        } else if (state.safetyScore >= 60) {
            dom.progressRing.style.stroke = '#f59e0b'; // 주황색
        } else {
            dom.progressRing.style.stroke = '#ef4444'; // 빨간색
        }
    }

    // ✨ [신규] 턴 수와 시간 UI 업데이트 함수
    function updateTurnTimeUI() {
        dom.turnsLeftText.textContent = state.turnsLeft;
        
        const minutes = Math.floor(state.elapsedTime / 60);
        const seconds = state.elapsedTime % 60;
        dom.elapsedTimeText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // ✨ [신규] 턴 수와 시간 초기화 함수
    function initializeTurnTime() {
        state.turnsLeft = 5; // 기본 5턴
        state.elapsedTime = 0;
        updateTurnTimeUI();
        dom.turnTimeInfo.classList.remove('hidden');
        
        // ✨ TBM 종료 버튼 원래 상태로 초기화
        dom.showResultBtn.classList.remove('animate-pulse', 'bg-red-600');
        dom.showResultBtn.classList.add('bg-blue-600');
        dom.showResultBtn.innerHTML = '<i class="fas fa-flag-checkered mr-2"></i>TBM 종료 및 결과 보기';
    }

    // ✨ [신규] 턴 수 차감 및 시간 증가 함수
    function updateTurnAndTime() {
        state.turnsLeft--;
        state.elapsedTime += 30; // 30초씩 증가 (실제 TBM 시간을 고려)
        updateTurnTimeUI();
        
        // 마지막 턴일 경우 경고 표시
        if (state.turnsLeft === 1) {
            addCoachFeedback('suggestion', '마지막 대화입니다. 핵심 안전 사항을 정리하세요.');
        }
        
        // 턴 수가 0이 되면 입력만 막고 결과는 자동 생성하지 않음
        if (state.turnsLeft <= 0) {
            dom.userInput.disabled = true;
            dom.sendBtn.disabled = true;
            addCoachFeedback('good', '대화 횟수를 모두 사용했습니다. TBM 종료 버튼을 눌러 결과를 확인하세요.');
            
            // TBM 종료 버튼 활성화 및 강조
            dom.showResultBtn.classList.add('animate-pulse', 'bg-red-600');
            dom.showResultBtn.classList.remove('bg-blue-600');
            dom.showResultBtn.innerHTML = '<i class="fas fa-flag-checkered mr-2"></i>🚨 TBM 종료 및 결과 확인 ��';
        }
    }

    // --- API 호출 및 상태 관리 ---
    async function startNewScenario() {
        dom.chatLog.innerHTML = '';
        dom.coachLog.innerHTML = '';
        dom.workAreaDiagram.textContent = '';
        dom.diagramLegend.innerHTML = '';
        dom.suddenEventArea.classList.add('hidden'); // 돌발 상황 영역 숨기기
        
        // ✨ [신규] 현장 이미지 초기화
        updateSiteImageUI(null);
        
        // ✨ [수정] 턴 수와 시간 초기화 추가
        initializeTurnTime();
        
        // ✨ [신규] TBM 종료 버튼 재활성화
        dom.showResultBtn.disabled = false;
        dom.showResultBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        dom.showResultBtn.classList.add('hover:bg-blue-700');
        
        state.history = "";
        state.safetyScore = 50;
        state.dialogueLog = []; // ✨ 대화 기록 초기화
        updateSafetyScoreUI(); // ✨ 점수를 숨김 상태로 초기화
        setLoading(true, "새로운 시나리오를 생성 중입니다...");

        try {
            const token = sessionStorage.getItem('ai-tool-token');
            const response = await fetch(`${API_BASE_URL}/api/tbm/scenario`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) throw new Error('시나리오 생성에 실패했습니다.');
            
            const data = await response.json();
            
            // 디버깅을 위한 로그
            console.log('API 응답 데이터:', data);
            
            if (!data || !data.scenario || !data.workers) {
                throw new Error('시나리오 데이터가 올바르지 않습니다.');
            }
            
            state.scenario = data.scenario;
            state.workers = data.workers; // ✨ 작업자 배열 저장
            // ✨ [신규] 숨겨진 결정적 정보 저장
            state.hiddenCriticalInfo = data.scenario.hidden_critical_info;
            state.criticalInfoUncovered = false;
            
            updateScenarioUI();
            updateWorkAreaDiagramUI(state.scenario.work_area_diagram);
            updateDiagramLegendUI(state.scenario.work_area_diagram, state.scenario.diagram_legend);
            
            // ✨ [신규] 현장 이미지 표시 함수 호출
            updateSiteImageUI(state.scenario.image_key);
            
            // ✨ 첫 대사 처리 (안전한 처리)
            let startMsg, speakerName;
            
            if (data.initial_message && data.initial_message.text) {
                startMsg = data.initial_message.text;
                speakerName = data.initial_message.speaker_name || "작업자";
            } else if (data.initial_dialogue && data.initial_dialogue.length > 0) {
                // 백엔드에서 initial_dialogue 배열로 응답한 경우
                startMsg = data.initial_dialogue[0].text;
                speakerName = data.initial_dialogue[0].speaker_name || "작업자";
            } else {
                // 기본값
                startMsg = "안전관리자님, 오늘도 안전하게 작업하겠습니다.";
                speakerName = "작업자";
            }
            addMessage('ai', speakerName, startMsg);
            addCoachFeedback("suggestion", "AI 작업자들과의 TBM 시뮬레이션을 시작합니다. 먼저 작업자들의 말을 경청하고, 공감하는 태도로 대화를 시작해보세요.");
            
            // ✨ 첫 대화 로그 기록
            state.history += `- ${speakerName}: "${startMsg}"`;
            state.dialogueLog.push({ 
                speaker: speakerName, 
                message: startMsg, 
                type: 'ai',
                timestamp: new Date().toLocaleTimeString()
            });

        } catch (error) {
            console.error(error);
            addCoachFeedback('suggestion', `오류: ${error.message}`);
            dom.workAreaDiagram.textContent = '오류로 인해 도면을 불러올 수 없습니다.';
            dom.diagramLegend.innerHTML = '';
        } finally {
            setLoading(false);
        }
    }

    async function handleSend() {
        const userText = dom.userInput.value.trim();
        if (!userText || state.isAwaitingResponse) return;

        // ✨ 대화 시작 전 턴 수 체크
        if (state.turnsLeft <= 0) {
            addCoachFeedback('suggestion', '대화 횟수를 모두 사용했습니다. TBM을 종료하고 결과를 확인하세요.');
            return;
        }

        // ✨ 사용자 대화 로그 기록
        addMessage('user', '나 (관리자)', userText);
        state.history += `\n- 관리자: "${userText}"`;
        state.dialogueLog.push({ 
            speaker: 'user', 
            message: userText, 
            type: 'user',
            timestamp: new Date().toLocaleTimeString()
        });
        
        dom.userInput.value = '';
        setLoading(true);
        showAIThinking();

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
                    workers: state.workers, // ✨ 작업자 배열 전송
                    history: state.history, 
                    message: userText 
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'API 호출에 실패했습니다.');
            }

            const data = await response.json();
            
            removeAIThinking();
            
            // ✨ [수정된 부분] 다중 작업자 응답 처리
            if (data.worker_responses && data.worker_responses.length > 0) {
                data.worker_responses.forEach((res, index) => {
                    // 1. 채팅창에 작업자 메시지 추가
                    addMessage('ai', res.speaker_name, res.text);
                    
                    // 2. 대화 기록(history) 업데이트
                    state.history += `\n- ${res.speaker_name}: "${res.text}"`;

                    // 3. 리플레이용 상세 로그(dialogueLog) 기록
                    // 코칭 피드백, 점수 등은 마지막 응답에만 연결합니다.
                    const isLastResponse = index === data.worker_responses.length - 1;
                    state.dialogueLog.push({
                        speaker: res.speaker_name,
                        message: res.text,
                        type: 'ai',
                        scoreChange: isLastResponse ? data.safety_score_change : 0,
                        feedback: isLastResponse ? data.coach_feedback.text : null,
                        suddenEvent: isLastResponse ? data.sudden_event : null,
                        timestamp: new Date().toLocaleTimeString()
                    });
                    
                    // ✨ [신규] 숨겨진 결정적 정보 발견 여부 확인
                    if (state.hiddenCriticalInfo && !state.criticalInfoUncovered) {
                        // 작업자 응답에서 숨겨진 정보가 포함되었는지 확인
                        const responseText = res.text.toLowerCase();
                        const hiddenInfo = state.hiddenCriticalInfo.toLowerCase();
                        
                        // 간단한 키워드 매칭 (더 정교한 로직으로 개선 가능)
                        const keywords = hiddenInfo.split(' ').filter(word => word.length > 3);
                        const foundKeywords = keywords.filter(keyword => responseText.includes(keyword));
                        
                        if (foundKeywords.length >= Math.ceil(keywords.length * 0.5)) {
                            state.criticalInfoUncovered = true;
                            console.log('🎯 숨겨진 결정적 정보 발견!:', state.hiddenCriticalInfo);
                        }
                    }
                });
            }
            
            // 돌발 상황 및 코칭 피드백은 한 번만 표시합니다.
            // ✨ [수정] sudden_event가 객체 형태로 변경됨에 따라 처리 방식 수정
            if (data.sudden_event && (data.sudden_event.text || data.sudden_event.image_key)) {
                showSuddenEvent(data.sudden_event);
            }
            addCoachFeedback(data.coach_feedback.type, data.coach_feedback.text);

            state.safetyScore = Math.max(0, Math.min(100, state.safetyScore + data.safety_score_change));
            // ✨ [수정] 시뮬레이션 중에는 점수 업데이트를 하지 않음 (숨김 상태 유지)

            // ✨ 턴 수 차감 및 시간 증가
            updateTurnAndTime();

        } catch (error) {
            console.error("API Error:", error);
            removeAIThinking();
            addCoachFeedback('suggestion', `오류가 발생했습니다: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }

    function setLoading(isLoading, message = "") {
        state.isAwaitingResponse = isLoading;
        dom.userInput.disabled = isLoading;
        dom.sendBtn.disabled = isLoading;
        dom.newScenarioBtn.disabled = isLoading;
        dom.sendBtn.innerHTML = isLoading ? '<i class="fas fa-spinner fa-spin"></i>' : '<i class="fas fa-paper-plane"></i>';
        
        if (isLoading && message) {
            // ✨ [수정] 기존 대화 내용을 덮어쓰지 않고 아래에 로딩 메시지 추가
            const loadingBubble = document.createElement('div');
            loadingBubble.className = 'chat-bubble p-3 rounded-lg flex flex-col chat-bubble-ai self-start bg-gray-800/50 border border-gray-600';
            loadingBubble.id = 'loading-message';
            loadingBubble.innerHTML = `
                <span class="text-xs font-bold mb-1 text-gray-400">시스템</span>
                <div class="flex items-center gap-2">
                    <i class="fas fa-spinner fa-spin text-amber-400"></i>
                    <p class="text-gray-300">${message}</p>
                </div>
            `;
            dom.chatLog.appendChild(loadingBubble);
            setTimeout(() => { dom.chatLog.scrollTop = dom.chatLog.scrollHeight; }, 100);
        } else if (!isLoading) {
            // 로딩 메시지 제거
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                loadingMessage.remove();
            }
        }
    }

    // ✨ [신규] 로딩 메시지 업데이트 함수
    function updateLoadingMessage(message) {
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            const messageText = loadingMessage.querySelector('p');
            if (messageText) {
                messageText.textContent = message;
            }
        }
    }

    function showAIThinking() {
        if (!state.workers.length) return;
        const thinkingBubble = document.createElement('div');
        thinkingBubble.className = 'chat-bubble chat-bubble-ai self-start p-3 rounded-lg flex flex-col';
        thinkingBubble.id = 'ai-thinking';
        const randomMessage = `작업자들이 답변을 준비하고 있습니다...`;
        thinkingBubble.innerHTML = `
            <span class="text-xs font-bold mb-1">작업자들</span>
            <div class="flex items-center gap-2">
                <i class="fas fa-spinner fa-spin text-amber-400"></i>
                <p class="text-gray-300">${randomMessage}</p>
            </div>`;
        dom.chatLog.appendChild(thinkingBubble);
        setTimeout(() => { dom.chatLog.scrollTo({ top: dom.chatLog.scrollHeight, behavior: 'smooth' }); }, 100);
    }

    function removeAIThinking() {
        const thinkingBubble = document.getElementById('ai-thinking');
        if (thinkingBubble) thinkingBubble.remove();
    }

    // ✨ [신규] 결과 및 리플레이 표시 함수
    async function showResultAndReplay() {
        // ✨ [신규] TBM 종료 버튼 비활성화 (중복 클릭 방지)
        dom.showResultBtn.disabled = true;
        dom.showResultBtn.classList.add('opacity-50', 'cursor-not-allowed');
        dom.showResultBtn.classList.remove('hover:bg-blue-700');
        
        setLoading(true, "작업 결과를 집계 중입니다...");
        
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
                    conversationHistory: state.history, // ✨ [신규] 대화 기록 전달
                    // ✨ [신규] 숨겨진 결정적 정보 발견 여부 전달
                    criticalInfoUncovered: state.criticalInfoUncovered
                })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || '작업 결과 생성에 실패했습니다.');
            }
            const result = await response.json();
            
            // ✨ [신규] 집계 완료 메시지로 변경
            updateLoadingMessage("집계가 완료되었습니다.");
            
            // 1. AI가 생성한 작업 결과 시나리오 표시
            dom.finalResultTitle.textContent = getResultTitle(result.result_type);
            dom.finalResultNarrative.textContent = result.narrative;
            
            // ✨ [신규] 재해 수치 파싱 및 표시
            const casualtyStats = parseCasualtyStats(result.casualties);
            dom.majorCasualtyCount.textContent = casualtyStats.majorCount;
            dom.minorCasualtyCount.textContent = casualtyStats.minorCount;
            dom.safetyScoreDisplay.textContent = state.safetyScore;
            
            // ✨ [신규] 최종 안전도 점수 공개
            showFinalSafetyScore();

            // ✨ [신규] 결과 이미지 표시 로직
            if (result.result_image_key) {
                const imageUrl = `./images/sites/${result.result_image_key}.png?v=${new Date().getTime()}`;
                dom.resultImage.src = imageUrl;
                dom.resultImage.classList.remove('hidden');  // 이미지 자체의 hidden 클래스 제거
                dom.resultImageContainer.classList.remove('hidden');
            } else {
                dom.resultImage.classList.add('hidden');
                dom.resultImageContainer.classList.add('hidden');
            }

            // 2. dialogueLog를 바탕으로 리플레이 로그 생성
            dom.replayLog.innerHTML = ''; // 초기화
            
            state.dialogueLog.forEach((log, index) => {
                const logEntry = document.createElement('div');
                logEntry.className = 'mb-3 p-3 rounded-lg border border-gray-600';
                
                let entryHTML = `<div class="flex justify-between items-start mb-2">`;
                entryHTML += `<span class="font-bold text-sm ${log.type === 'user' ? 'text-blue-400' : 'text-amber-400'}">${log.speaker}</span>`;
                entryHTML += `<span class="text-xs text-gray-500">${log.timestamp}</span></div>`;
                entryHTML += `<p class="text-gray-300 mb-2">${log.message}</p>`;
                
                // ✨ [수정] 점수 변화는 숨기고 피드백만 표시 (AI 응답인 경우)
                if (log.type === 'ai' && log.feedback) {
                    entryHTML += `<div class="text-xs text-gray-400 bg-gray-800 p-2 rounded">`;
                    entryHTML += `<i class="fas fa-lightbulb text-yellow-400 mr-1"></i>`;
                    entryHTML += `<span>${log.feedback}</span></div>`;
                }
                
                // 돌발 상황 표시
                if (log.suddenEvent) {
                    const eventText = typeof log.suddenEvent === 'string' ? log.suddenEvent : log.suddenEvent.text;
                    if (eventText) {
                        entryHTML += `<div class="text-xs text-red-400 bg-red-900/20 p-2 rounded mt-2 border border-red-500">`;
                        entryHTML += `<i class="fas fa-exclamation-triangle mr-1"></i>`;
                        entryHTML += `<span>돌발 상황: ${eventText}</span></div>`;
                    }
                }
                
                entryHTML += `</div>`;
                logEntry.innerHTML = entryHTML;
                dom.replayLog.appendChild(logEntry);
            });
            
            // 모달 표시
            dom.replayModal.classList.remove('hidden');
            dom.replayModal.classList.add('flex');
            setTimeout(() => {
                dom.replayCard.classList.remove('scale-95', 'opacity-0');
                dom.replayCard.classList.add('scale-100', 'opacity-100');
            }, 50);

        } catch (error) {
            console.error("작업 결과 API 오류:", error);
            addCoachFeedback('suggestion', `오류: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }
    
    // ✨ [신규] 재해 수치 파싱 함수
    function parseCasualtyStats(casualtiesText) {
        let majorCount = 0;
        let minorCount = 0;
        
        // "중대재해 0명, 일반재해 1명" 형태의 텍스트에서 숫자 추출
        const majorMatch = casualtiesText.match(/중대재해\s*(\d+)명/);
        const minorMatch = casualtiesText.match(/일반재해\s*(\d+)명/);
        
        if (majorMatch) {
            majorCount = parseInt(majorMatch[1]);
        }
        if (minorMatch) {
            minorCount = parseInt(minorMatch[1]);
        }
        
        return { majorCount, minorCount };
    }

    // ✨ [신규] 결과 타입에 따른 제목 생성 함수
    function getResultTitle(resultType) {
        switch (resultType) {
            case 'success':
                return '🎉 작업 성공! 🎉';
            case 'minor_accident':
                return '⚠️ 아차사고 발생 ⚠️';
            case 'major_accident':
                return '🚨 중대재해 발생 🚨';
            default:
                return '📊 작업 결과';
        }
    }
    
    // ✨ [신규] 리플레이 모달 닫기 함수
    function closeReplayModal() {
        dom.replayCard.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            dom.replayModal.classList.add('hidden');
            dom.replayModal.classList.remove('flex');
            
            // ✨ [수정] 화면 초기화 대신 새로운 대화 시작 모드로 전환
            // 채팅창은 그대로 유지하되, 입력만 비활성화
            dom.userInput.disabled = true;
            dom.sendBtn.disabled = true;
            
            // 새로운 대화 시작 버튼으로 변경
            dom.newScenarioBtn.classList.remove('bg-gray-700', 'hover:bg-gray-600');
            dom.newScenarioBtn.classList.add('bg-amber-600', 'hover:bg-amber-700');
            document.getElementById('newScenarioBtnText').textContent = '새로운 대화 시작';
            
            // TBM 종료 버튼 숨기기
            dom.showResultBtn.classList.add('hidden');
            
            // 재해 수치 초기화
            dom.majorCasualtyCount.textContent = '0';
            dom.minorCasualtyCount.textContent = '0';
            dom.safetyScoreDisplay.textContent = '?';
            
            // ✨ [수정] 결과 확인 후에는 안전도를 그대로 표시하여 결과 확인 느낌 유지
            // updateSafetyScoreUI(); // 안전도를 ? 처리하지 않음
            
        }, 300);
    }

    // ✨ [신규] 새로운 대화 시작 함수
    function startNewConversation() {
        // 화면 완전 초기화
        dom.chatLog.innerHTML = '';
        dom.coachLog.innerHTML = '';
        dom.workAreaDiagram.textContent = '';
        dom.diagramLegend.innerHTML = '';
        dom.suddenEventArea.classList.add('hidden');
        
        // ✨ [신규] 현장 이미지 초기화
        updateSiteImageUI(null);
        
        // 상태 초기화
        state.scenario = null;
        state.workers = [];
        state.history = "";
        state.safetyScore = 50;
        state.dialogueLog = [];
        state.isAwaitingResponse = false;
        state.turnsLeft = 5;
        state.elapsedTime = 0;
        // ✨ [신규] 숨겨진 결정적 정보 초기화
        state.criticalInfoUncovered = false;
        state.hiddenCriticalInfo = null;
        
        // UI 초기화
        dom.scenarioContainer.innerHTML = '';
        dom.chatContainer.classList.add('hidden');
        dom.chatInputArea.classList.add('hidden');
        dom.startSimulationArea.classList.remove('hidden');
        // ✨ [추가] 새로운 상황 버튼 숨기기
        dom.newScenarioBtn.classList.add('hidden');
        
        // ✨ [수정] 턴 수와 시간 초기화 추가
        initializeTurnTime();
        
        // 버튼 원래 상태로 복원
        dom.newScenarioBtn.classList.remove('bg-amber-600', 'hover:bg-amber-700');
        dom.newScenarioBtn.classList.add('bg-gray-700', 'hover:bg-gray-600');
        document.getElementById('newScenarioBtnText').textContent = '새로운 상황';
        
        // ✨ [수정] TBM 종료 버튼 초기화 (숨기지 않고 원래 상태로)
        dom.showResultBtn.classList.remove('hidden');
        dom.showResultBtn.classList.remove('animate-pulse', 'bg-red-600');
        dom.showResultBtn.classList.add('bg-blue-600');
        dom.showResultBtn.innerHTML = '<i class="fas fa-flag-checkered mr-2"></i>TBM 종료 및 결과 보기';
        
        // ✨ [수정] 새로운 대화 시작 시에만 안전도를 완전히 초기화
        updateSafetyScoreUI();
    }

    function startSimulation() {
        dom.startSimulationArea.classList.add('hidden');
        dom.chatContainer.classList.remove('hidden');
        dom.chatInputArea.classList.remove('hidden');
        // ✨ [추가] 새로운 상황 버튼 보이기
        dom.newScenarioBtn.classList.remove('hidden');
        startNewScenario();
        // ✨ 시나리오 로드 완료 후 턴 수와 시간 초기화
        setTimeout(() => {
            initializeTurnTime();
        }, 1000);
    }

    // ✨ [신규] 가이드 모달 관련 함수들
    function showGuideModal() {
        dom.guideModal.classList.remove('hidden');
        dom.guideModal.classList.add('flex');
        dom.guideCard.classList.remove('scale-95', 'opacity-0');
        
        // 가이드 내용 설정
        dom.guideContent.innerHTML = `
            <div class="space-y-6">
                <div class="text-center mb-6">
                    <h3 class="text-2xl font-bold text-teal-400 mb-2">📖 AI TBM 코칭 시뮬레이터: 성공적인 리더를 위한 안내서</h3>
                    <p class="text-gray-300">환영합니다, 관리자님!</p>
                    <p class="text-gray-400 text-sm">이 시뮬레이션은 단순한 챗봇이 아닌, <strong>건설 현장 리더십 훈련을 위한 AI 코칭 시스템</strong>입니다. 정답을 맞히는 것보다, 동료들을 안전한 방향으로 이끄는 '과정'이 중요합니다.</p>
                </div>

                <div class="bg-gray-700/50 p-4 rounded-lg">
                    <h4 class="text-lg font-bold text-amber-400 mb-3">🎯 이 시뮬레이션의 핵심 목표</h4>
                    <blockquote class="border-l-4 border-teal-400 pl-4 italic text-gray-300">
                        TBM의 진짜 목표는 단순히 위험요소를 나열하는 것이 아니라, 모든 팀원이 작업의 위험성을 함께 인지하고 <strong>'안전한 작업 방식'에 대해 만장일치로 합의(Consensus)</strong>하는 것입니다.
                    </blockquote>
                    <p class="text-gray-300 mt-3">당신의 모든 발언은 <strong>'팀의 안전 합의'</strong>라는 목표 달성에 기여해야 합니다.</p>
                </div>

                <div class="bg-gray-700/50 p-4 rounded-lg">
                    <h4 class="text-lg font-bold text-green-400 mb-3">💡 성공을 위한 TBM 운영 팁</h4>
                    <div class="space-y-4">
                        <div>
                            <h5 class="font-bold text-green-300 mb-2">1. 심리적 안전감을 조성하세요. 👂</h5>
                            <p class="text-gray-300 text-sm">작업자들이 불만이나 걱정을 표출할 때, "틀렸다"고 말하기 전에 "네, 어제 야간작업 때문에 피곤하시죠.", "날씨가 더워서 힘든 점 이해합니다." 와 같이 먼저 인정하고 공감대를 형성하세요. <strong>팀원들이 편안하게 이야기할 수 있는 분위기</strong>가 중요합니다.</p>
                        </div>
                        <div>
                            <h5 class="font-bold text-green-300 mb-2">2. 논리적으로 상황을 분석하세요. 🔍</h5>
                            <p class="text-gray-300 text-sm">"조심하세요" 라는 추상적인 말은 효과가 없습니다. "이 케이블은 낡아서 절연 성능이 떨어져 있기 때문에, 맨손으로 만지면 감전될 수 있습니다." 처럼 <strong>위험의 원인과 결과를 명확하게 연결</strong>해서 설명해야 합니다. 때로는 <strong>구체적인 검증 절차</strong>를 제안하는 것이 도움이 됩니다.</p>
                        </div>
                        <div>
                            <h5 class="font-bold text-green-300 mb-2">3. 현장을 직접 확인하세요. 👀</h5>
                            <p class="text-gray-300 text-sm">"이렇게 하세요" 라고 지시하기보다, "작업 전에 다 같이 현장을 한 바퀴 둘러보며 위험요소를 찾아봅시다." 라고 제안하면, 작업자 스스로 문제점을 발견하게 만들고 <strong>현장 중심의 안전 관리</strong>를 실천할 수 있습니다.</p>
                        </div>
                        <div>
                            <h5 class="font-bold text-green-300 mb-2">4. 명확한 행동 계획으로 마무리하세요. 📝</h5>
                            <p class="text-gray-300 text-sm">"그럼 이렇게 하죠. 먼저 박기사님이 전원을 차단하고, 이주임님이 검전기로 재확인한 뒤 작업을 시작하겠습니다." 와 같이 <strong>누가, 무엇을, 어떻게 할지</strong> 명확하게 정해주어야 TBM이 의미를 갖습니다.</p>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-700/50 p-4 rounded-lg">
                    <h4 class="text-lg font-bold text-purple-400 mb-3">🕵️‍♂️ 시뮬레이션의 숨겨진 요소들</h4>
                    <p class="text-gray-300 mb-4">이 시뮬레이션은 보이는 것보다 깊은 메커니즘을 가지고 있습니다. 아래 요소들을 이해하면 더 즐겁게 훈련에 임할 수 있습니다.</p>
                    
                    <div class="space-y-4">
                        <div>
                            <h5 class="font-bold text-purple-300 mb-2">1. 매번 달라지는 'TBM 핵심 테마'</h5>
                            <p class="text-gray-300 text-sm mb-2">모든 시나리오에는 아래와 같은 <strong>'숨겨진 주제'</strong>가 있습니다. '경험 많은 반장 설득하기'는 수많은 테마 중 하나일 뿐입니다.</p>
                            <ul class="text-gray-300 text-sm space-y-1 ml-4">
                                <li><strong>관행 타파</strong>: 익숙함에 젖어 안전을 무시하는 팀의 인식을 바꾸는 과제.</li>
                                <li><strong>정보 발견</strong>: 모두가 모르고 있는 '숨겨진 정보'를 리더십 행동을 통해 찾아내는 과제.</li>
                                <li><strong>위험 탐색</strong>: 상황 설명에 없는 '제3의 위험'을 현장 관찰과 대화로 발견하는 과제.</li>
                                <li><strong>문제 해결</strong>: 부족한 자원이나 갑작스러운 계획 변경 등 '곤란한 상황'을 팀원들과 함께 풀어가는 과제.</li>
                            </ul>
                        </div>
                        <div>
                            <h5 class="font-bold text-purple-300 mb-2">2. '앵무새'는 이제 그만! '영향력 기반' 평가 시스템</h5>
                            <p class="text-gray-300 text-sm mb-2">이 AI 코치는 당신이 한 말의 '내용'이 아닌 <strong>'영향력'</strong>을 평가합니다.</p>
                            <div class="bg-red-900/30 p-3 rounded border-l-4 border-red-400 mb-2">
                                <p class="text-red-300 text-sm"><strong>❌ 점수 없음</strong>: 상황 설명에 나온 위험요소를 그대로 따라 읽는 행위 (예: "감전 위험이 있습니다.")</p>
                            </div>
                            <div class="bg-green-900/30 p-3 rounded border-l-4 border-green-400">
                                <p class="text-green-300 text-sm"><strong>✅ 점수 획득</strong>: 당신의 발언으로 인해, 비협조적이던 작업자가 <strong>"아, 그게 맞네요. 그럼 이렇게 하죠."</strong> 라며 <strong>태도나 행동에 긍정적인 변화</strong>를 보일 때.</p>
                            </div>
                        </div>
                        <div>
                            <h5 class="font-bold text-purple-300 mb-2">3. '정보 흔적'과 '리더십 행동'의 연결</h5>
                            <p class="text-gray-300 text-sm mb-2">시뮬레이션에서는 때때로 <strong>'숨겨진 정보'</strong>가 존재할 수 있습니다. 이 정보는 특정 키워드나 문서가 아닌, <strong>관리자의 리더십 행동</strong>에 의해서만 발견됩니다.</p>
                            <div class="bg-blue-900/30 p-3 rounded border-l-4 border-blue-400 mb-2">
                                <p class="text-blue-300 text-sm"><strong>💡 핵심</strong>: 팀원들이 편안하게 이야기할 수 있는 분위기를 만들고, 논리적으로 상황을 분석하며, 필요시 현장을 직접 확인하는 리더십이 중요합니다.</p>
                            </div>
                            <p class="text-gray-300 text-sm">정보는 여러 단계의 '흔적'으로 존재하며, 각 단계마다 적절한 리더십 행동이 필요합니다.</p>
                        </div>
                    </div>
                </div>

                <div class="text-center bg-gray-700/50 p-4 rounded-lg">
                    <p class="text-gray-300">이 모든 것은 관리자님이 현실에서 겪을 수 있는 복합적인 상황들입니다. 실수는 괜찮습니다. 이곳은 훈련을 위한 안전한 공간이니까요. 그럼, 행운을 빕니다!</p>
                </div>
            </div>
        `;
    }

    function closeGuideModal() {
        dom.guideCard.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            dom.guideModal.classList.add('hidden');
            dom.guideModal.classList.remove('flex');
        }, 300);
    }

    // --- 이벤트 리스너 ---
    dom.sendBtn.addEventListener('click', handleSend);
    dom.userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });
    dom.newScenarioBtn.addEventListener('click', () => {
        // ✨ [수정] 버튼 텍스트에 따라 다른 동작 수행
        const buttonText = document.getElementById('newScenarioBtnText').textContent;
        if (buttonText === '새로운 대화 시작') {
            startNewConversation();
        } else {
            startNewScenario();
        }
    });
    dom.startSimulationBtn.addEventListener('click', startSimulation);
    dom.showResultBtn.addEventListener('click', showResultAndReplay);
    dom.closeReplayBtn.addEventListener('click', closeReplayModal);
    dom.newSimulationBtn.addEventListener('click', () => {
        closeReplayModal();
        // ✨ [수정] 모달이 완전히 닫힌 후 완전한 초기화 수행
        setTimeout(() => {
            startNewConversation();
        }, 350);
    });
    // ✨ [신규] 가이드 모달 이벤트 리스너
    dom.showGuideBtn.addEventListener('click', showGuideModal);
    dom.closeGuideBtn.addEventListener('click', closeGuideModal);
}); 