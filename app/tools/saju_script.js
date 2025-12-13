// SAJU 분석기 JavaScript

const API_BASE_URL = 'https://api.dreamofenc.com'; // ✨ [수정] 운영 서버 API 주소로 변경
let fiveElementsChartInstance = null;
let coreCompetenciesChartInstance = null;
let lastAnalysisData = null;

const dom = {
    analyzeBtn: document.getElementById('analyzeBtn'),
    btnText: document.getElementById('btnText'),
    loader: document.getElementById('loader'),
    resultDashboard: document.getElementById('resultDashboard'),
    
    // 결과 표시 DOM 요소
    overallAssessment: document.getElementById('overallAssessment'),
    sajuTableBody: document.getElementById('sajuTableBody'),
    sajuStructureSummary: document.getElementById('sajuStructureSummary'),
    yongsinAnalysis: document.getElementById('yongsinAnalysis'),
    fiveElementsChart: document.getElementById('fiveElementsChart'),
    coreCompetenciesChart: document.getElementById('coreCompetenciesChart'),
    topTalents: document.getElementById('topTalents'),
    lifePathTimeline: document.getElementById('lifePathTimeline'),
    nextYearTitle: document.getElementById('nextYearTitle'),
    newYearSummary: document.getElementById('newYearSummary'),
    monthlyFortuneContainer: document.getElementById('monthlyFortuneContainer'),
    careerSummary: document.getElementById('careerSummary'),
    suitableJobs: document.getElementById('suitableJobs'),
    financeSummary: document.getElementById('financeSummary'),
    healthSummary: document.getElementById('healthSummary'),
    educationSummary: document.getElementById('educationSummary'),
    nameAnalysis: document.getElementById('nameAnalysis'),
    // 올해 운세
    currentYearTitle: document.getElementById('currentYearTitle'),
    currentYearSummary: document.getElementById('currentYearSummary'),
    currentMonthlyFortuneContainer: document.getElementById('currentMonthlyFortuneContainer'),
    // 내년 운세
    nextYearTitle: document.getElementById('nextYearTitle'),
    nextYearSummary: document.getElementById('nextYearSummary'),
    nextMonthlyFortuneContainer: document.getElementById('nextMonthlyFortuneContainer'),
    // ✨ [추가] 테마 및 다운로드 관련 DOM 요소
    themeToggle: document.getElementById('themeToggle'),
    themeIconSun: document.getElementById('themeIconSun'),
    themeIconMoon: document.getElementById('themeIconMoon'),
    downloadBtn: document.getElementById('downloadBtn'),
    // ✨ [추가] 로그인 관련 DOM 요소
    loginModal: document.getElementById('login-modal'),
    loginForm: document.getElementById('login-form'),
    loginSubmitBtn: document.getElementById('login-submit-btn'),
    
    // ✨ [추가] 달력 타입 관련 DOM 요소
    solarRadio: document.getElementById('solar'),
    lunarRadio: document.getElementById('lunar'),
    leapMonthContainer: document.getElementById('leapMonthContainer'),
    isLeapMonth: document.getElementById('isLeapMonth')
};

document.addEventListener('DOMContentLoaded', function() {
    // ✨ [추가] 로그인 상태 확인 및 모달 표시
    const token = sessionStorage.getItem('ai-tool-token');
    if (!token) {
        dom.loginModal.classList.remove('hidden');
        dom.loginModal.classList.add('flex');
    } else {
        dom.loginModal.classList.add('hidden');
    }
    
    // ✨ [추가] 음력/양력 선택에 따른 윤달 옵션 표시/숨김 및 스타일링
    if (dom.lunarRadio && dom.solarRadio && dom.leapMonthContainer) {
        // 초기 스타일링 적용
        updateRadioStyles();
        
        dom.lunarRadio.addEventListener('change', function() {
            if (this.checked) {
                dom.leapMonthContainer.style.display = 'flex';
                updateRadioStyles();
            }
        });
        
        dom.solarRadio.addEventListener('change', function() {
            if (this.checked) {
                dom.leapMonthContainer.style.display = 'none';
                dom.isLeapMonth.checked = false;
                updateRadioStyles();
            }
        });
    }
    
    // 라디오 버튼 스타일 업데이트 함수
    function updateRadioStyles() {
        const radioOptions = document.querySelectorAll('.radio-option');
        radioOptions.forEach(option => {
            const input = option.querySelector('input[type="radio"]');
            const label = option.querySelector('label');
            
            if (input && input.checked) {
                label.style.background = 'rgba(99, 102, 241, 0.8)';
                label.style.color = 'white';
                label.style.fontWeight = '600';
            } else {
                label.style.background = 'transparent';
                label.style.color = '';
                label.style.fontWeight = '500';
            }
        });
    }
    
    // Chart.js 기본 설정 - 라이트/다크 테마에 따라 동적 변경
    function updateChartDefaults() {
        const isLightTheme = document.documentElement.classList.contains('light');
        if (isLightTheme) {
            Chart.defaults.color = '#1f2937'; // 라이트 테마: 진한 회색
            Chart.defaults.borderColor = '#d1d5db'; // 라이트 테마: 연한 회색 테두리
        } else {
            Chart.defaults.color = '#9CA3AF'; // 다크 테마: 기존 색상
            Chart.defaults.borderColor = '#374151'; // 다크 테마: 기존 색상
        }
    }
    
    // 초기 차트 기본값 설정
    updateChartDefaults();

    // DOM 요소 검증 함수
    function validateDOMElements() {
        const requiredIds = [
            'analyzeBtn', 'btnText', 'loader', 'resultDashboard',
            'overallAssessment', 'nameAnalysis', 'sajuTableBody',
            'sajuStructureSummary', 'yongsinAnalysis', 'fiveElementsChart',
            'coreCompetenciesChart', 'topTalents', 'lifePathTimeline',
            'currentYearTitle', 'currentYearSummary', 'currentMonthlyFortuneContainer',
            'nextYearTitle', 'nextYearSummary', 'nextMonthlyFortuneContainer',
            'careerSummary', 'suitableJobs', 'financeSummary',
            'healthSummary', 'educationSummary'
        ];
        const missingElements = [];
        requiredIds.forEach(id => {
            if (!document.getElementById(id)) missingElements.push(id);
        });
        if (missingElements.length > 0) {
            console.error('❌ 다음 DOM 요소들을 찾을 수 없습니다:', missingElements);
            return false;
        } else {
            console.log('✅ 모든 DOM 요소가 정상적으로 로드되었습니다.');
            return true;
        }
    }

    if (!validateDOMElements()) return;

    // 차트 생성 함수들 - 2025 Cyber-Mystic 스타일
    function createFiveElementsChart(fiveElements) {
        const ctx = document.getElementById('fiveElementsChart');
        if (!ctx) return null;
        
        const isLightTheme = document.documentElement.classList.contains('light');
        
        return new Chart(ctx, {
            type: 'doughnut', // ✨ Bar에서 Doughnut으로 변경
            data: {
                labels: ['木 (성장)', '火 (열정)', '土 (중용)', '金 (결실)', '水 (지혜)'],
                datasets: [{
                    label: '오행 분포',
                    data: [
                        fiveElements['木'] || 0,
                        fiveElements['火'] || 0,
                        fiveElements['土'] || 0,
                        fiveElements['金'] || 0,
                        fiveElements['水'] || 0
                    ],
                    backgroundColor: [
                        'rgba(34, 197, 94, 0.7)',   // 木 - Green
                        'rgba(239, 68, 68, 0.7)',   // 火 - Red
                        'rgba(245, 158, 11, 0.7)',  // 土 - Yellow
                        'rgba(203, 213, 225, 0.9)', // 金 - Silver/White
                        'rgba(59, 130, 246, 0.7)'   // 水 - Blue
                    ],
                    borderColor: [
                        'rgba(34, 197, 94, 1)',
                        'rgba(239, 68, 68, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(203, 213, 225, 1)',
                        'rgba(59, 130, 246, 1)'
                    ],
                    borderWidth: 2,
                    hoverOffset: 15, // ✨ 호버 시 돌출 효과
                    spacing: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%', // ✨ 도넛 두께 조절
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: isLightTheme ? '#1f2937' : '#cbd5e1',
                            font: {
                                family: 'Pretendard, Noto Sans KR',
                                size: 13,
                                weight: '500'
                            },
                            padding: 15,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: isLightTheme ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)',
                        titleColor: isLightTheme ? '#1f2937' : '#f8fafc',
                        bodyColor: isLightTheme ? '#374151' : '#cbd5e1',
                        borderColor: isLightTheme ? '#e5e7eb' : 'rgba(99, 102, 241, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value}개 (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    function createCoreCompetenciesChart(competencies) {
        const ctx = document.getElementById('coreCompetenciesChart');
        if (!ctx) return null;
        
        const isLightTheme = document.documentElement.classList.contains('light');
        
        return new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['리더십', '창의성', '소통', '분석력', '실행력'],
                datasets: [{
                    label: '역량 점수',
                    data: [
                        competencies.leadership || 0,
                        competencies.creativity || 0,
                        competencies.communication || 0,
                        competencies.analytical || 0,
                        competencies.execution || 0
                    ],
                    backgroundColor: isLightTheme ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.25)',
                    borderColor: '#6366f1',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#6366f1',
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: isLightTheme ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.95)',
                        titleColor: isLightTheme ? '#1f2937' : '#f8fafc',
                        bodyColor: isLightTheme ? '#374151' : '#cbd5e1',
                        borderColor: isLightTheme ? '#e5e7eb' : 'rgba(99, 102, 241, 0.3)',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed.r}/10`;
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 10,
                        min: 0,
                        ticks: {
                            stepSize: 2,
                            color: isLightTheme ? '#6b7280' : '#9CA3AF',
                            font: {
                                size: 11,
                                family: 'Pretendard, Noto Sans KR'
                            },
                            backdropColor: 'transparent',
                            showLabelBackdrop: false
                        },
                        grid: {
                            color: isLightTheme ? '#e5e7eb' : '#374151',
                            circular: true
                        },
                        angleLines: {
                            color: isLightTheme ? '#e5e7eb' : '#374151'
                        },
                        pointLabels: {
                            color: isLightTheme ? '#1f2937' : '#E5E7EB',
                            font: {
                                size: 13,
                                weight: '600',
                                family: 'Pretendard, Noto Sans KR'
                            },
                            padding: 15
                        }
                    }
                }
            }
        });
    }

    // ==========================================================
    // 페이지 로드 시 빈 차트를 미리 생성
    function initializeCharts() {
        console.log('차트 초기화를 시작합니다...');
        // 초기 데이터 (빈 값 또는 기본값)
        const initialFiveElementsData = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
        const initialCompetenciesData = { leadership: 0, creativity: 0, communication: 0, analytical: 0, execution: 0 };
        
        fiveElementsChartInstance = createFiveElementsChart(initialFiveElementsData);
        coreCompetenciesChartInstance = createCoreCompetenciesChart(initialCompetenciesData);
        console.log('차트 초기화 완료.');
    }
    initializeCharts();
    
    // ✨ [추가] 사주 테이블만 먼저 렌더링하는 함수 (4행 완전 표시)
    function renderSajuTableOnly(sajuData) {
        console.log("🔮 사주 테이블 즉시 렌더링 시작:", sajuData);
        
        if (sajuData.saju_pillars && dom.sajuTableBody) {
            try {
                const pillars = sajuData.saju_pillars;
                
                // 기존 테이블 구조를 활용하여 4행 모두 표시
                // 천간 행
                const hourStem = dom.sajuTableBody.querySelector('[data-saju="hour_stem"]');
                const dayStem = dom.sajuTableBody.querySelector('[data-saju="day_stem"]');
                const monthStem = dom.sajuTableBody.querySelector('[data-saju="month_stem"]');
                const yearStem = dom.sajuTableBody.querySelector('[data-saju="year_stem"]');
                
                if (hourStem) hourStem.textContent = pillars.hour?.[0] || '계산중';
                if (dayStem) dayStem.textContent = pillars.day?.[0] || '계산중';
                if (monthStem) monthStem.textContent = pillars.month?.[0] || '계산중';
                if (yearStem) yearStem.textContent = pillars.year?.[0] || '계산중';
                
                // 지지 행
                const hourBranch = dom.sajuTableBody.querySelector('[data-saju="hour_branch"]');
                const dayBranch = dom.sajuTableBody.querySelector('[data-saju="day_branch"]');
                const monthBranch = dom.sajuTableBody.querySelector('[data-saju="month_branch"]');
                const yearBranch = dom.sajuTableBody.querySelector('[data-saju="year_branch"]');
                
                if (hourBranch) hourBranch.textContent = pillars.hour?.[1] || '계산중';
                if (dayBranch) dayBranch.textContent = pillars.day?.[1] || '계산중';
                if (monthBranch) monthBranch.textContent = pillars.month?.[1] || '계산중';
                if (yearBranch) yearBranch.textContent = pillars.year?.[1] || '계산중';
                
                // 십신과 지장간은 AI 해석 후에 채워질 예정이므로 임시 메시지
                const sipsinElements = dom.sajuTableBody.querySelectorAll('[data-saju*="sipsin"]');
                const jijangganElements = dom.sajuTableBody.querySelectorAll('[data-saju*="jijanggan"]');
                
                sipsinElements.forEach(el => {
                    el.textContent = '분석중...';
                    el.classList.add('text-gray-400', 'text-xs');
                });
                
                jijangganElements.forEach(el => {
                    el.textContent = '분석중...';
                    el.classList.add('text-gray-400', 'text-xs');
                });
                
                // 사주 구조 분석 영역에 임시 메시지 표시
                if (dom.sajuStructureSummary) {
                    dom.sajuStructureSummary.innerHTML = '<p class="text-gray-400">🤖 AI가 사주 구조를 분석하고 있습니다...</p>';
                }
                if (dom.yongsinAnalysis) {
                    dom.yongsinAnalysis.innerHTML = '<p class="text-gray-400">🔮 용신 분석 중입니다...</p>';
                }
                
                console.log("✅ 사주 테이블 즉시 렌더링 완료! (4행 구조 유지)");
                
            } catch (e) {
                console.error("❌ 사주 테이블 렌더링 오류:", e);
            }
        } else {
            console.warn("사주 데이터 또는 테이블 DOM 요소 누락");
        }
    }
    // ==========================================================

    dom.analyzeBtn.addEventListener('click', async () => {
        // ✨ [수정] 두 개의 입력 필드에서 값을 가져옵니다.
        const koreanName = document.getElementById('koreanName').value;
        const chineseName = document.getElementById('chineseName').value;
        
        // 한글 이름은 필수, 한자 이름은 선택
        if (!koreanName) {
            alert("한글 이름을 입력해주세요.");
            return;
        }
        
        // ✨ [수정] API에 보낼 name 변수를 생성합니다. (기존 로직과 호환)
        // 한자가 있으면 "한글 한자" 형식으로, 없으면 "한글"만 포함합니다.
        const name = chineseName ? `${koreanName} ${chineseName}` : koreanName;
        
        const birthDate = document.getElementById('birthDate').value;
        const birthTime = document.getElementById('birthTime').value;
        const gender = document.getElementById('gender').value;
        
        // ✨ [추가] 달력 타입과 윤달 여부 가져오기
        const calendarType = document.querySelector('input[name="calendarType"]:checked')?.value || 'solar';
        const isLeapMonth = document.getElementById('isLeapMonth')?.checked || false;

        if (!birthDate || !birthTime) {
            alert("생년월일과 시간을 모두 입력해주세요.");
            return;
        }

        dom.btnText.classList.add('hidden');
        dom.loader.classList.remove('hidden');
        dom.analyzeBtn.disabled = true;

        // 결과 표시 영역 초기화
        dom.resultDashboard.classList.add('hidden');
        dom.downloadBtn.classList.add('hidden');
        
        // 스트리밍 결과를 표시할 임시 영역 생성 (개선된 디자인)
        const streamingResult = document.createElement('div');
        streamingResult.id = 'streaming-result';
        streamingResult.className = 'bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-6 shadow-lg mb-6 text-white';
        streamingResult.innerHTML = `
            <div class="flex items-center mb-4">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                <h3 class="text-lg font-semibold">AI 인생 분석 진행 중</h3>
            </div>
            <div class="space-y-2">
                <p class="text-sm opacity-90" id="streaming-text">🤖 AI가 상세한 인생 분석을 작성하고 있습니다...</p>
                <div class="w-full bg-white bg-opacity-20 rounded-full h-2">
                    <div class="bg-white h-2 rounded-full animate-pulse" style="width: 60%"></div>
                </div>
            </div>
        `;
        
        // 기존 결과 영역 앞에 삽입 (main 태그를 찾아서 사용)
        const resultContainer = document.querySelector('main');
        if (resultContainer) {
            resultContainer.insertBefore(streamingResult, resultContainer.firstChild);
            streamingResult.classList.remove('hidden');
        } else {
            // main 태그가 없으면 body에 추가
            document.body.insertBefore(streamingResult, document.body.firstChild);
            streamingResult.classList.remove('hidden');
        }

        // ✨ [수정 1] 최종 결과를 담을 변수 선언
        let finalAnalysisData = null;

        try {
            const token = sessionStorage.getItem('ai-tool-token');
            if (!token) {
                throw new Error('로그인이 필요합니다.');
            }

            // ✨ [1단계] 계산 API 호출 - 즉시 반환
            console.log("🔮 1단계: 사주 계산 API 호출 시작...");
            dom.btnText.innerHTML = '🧮 사주 계산 중...';
            
            const calcResponse = await fetch(`${API_BASE_URL}/api/saju/calculate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ birthDate, birthTime, gender, calendarType, isLeapMonth })
            });

            if (!calcResponse.ok) {
                const errorData = await calcResponse.json();
                throw new Error(errorData.error || '사주 계산에 실패했습니다.');
            }

            const sajuData = await calcResponse.json();
            console.log("✅ 1단계 완료! 계산된 사주 데이터:", sajuData);

            // ✨ [즉시 피드백] 계산 결과를 바로 사주 테이블로 렌더링
            renderSajuTableOnly(sajuData);
            dom.resultDashboard.classList.remove('hidden'); // 결과 대시보드를 미리 보여줌
            
            // 스트리밍 메시지 업데이트
            streamingResult.innerHTML = '<h3 class="text-lg font-semibold mb-4">🤖 AI가 상세 해석을 작성하고 있습니다...</h3><pre class="whitespace-pre-wrap text-sm" id="streaming-text"></pre>';
            
            // ✨ [임시] 2단계 해석 API는 나중에 구현하고 1단계만 완료
            console.log("📊 2단계: 사주 해석 API는 준비 중입니다...");
            dom.btnText.innerHTML = '✅ 계산 완료';
            
            // 성공 메시지 제거 - 분석이 완료되었으므로 더 이상 필요하지 않음
            
            // ✨ [2단계] 해석 API 호출 - 스트리밍
            console.log("📊 2단계: 사주 해석 API 호출 시작...");
            dom.btnText.innerHTML = '🔮 AI 해석 중...';
            
            // 버튼 텍스트를 원래 상태로 복원
            setTimeout(() => {
                dom.btnText.innerHTML = '<span class="text-xl">🔮</span><span>내 인생 보고서 분석하기</span>';
            }, 1000);

            const response = await fetch(`${API_BASE_URL}/api/saju/interpret`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    gender: sajuData.gender,
                    birth_time: sajuData.birth_time,
                    solar_birth_date: sajuData.solar_birth_date,
                    saju_pillars: sajuData.saju_pillars,
                    sipsin: sajuData.sipsin,
                    jijanggan: sajuData.jijanggan,
                    daewoon_flow: sajuData.daewoon_flow
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '분석에 실패했습니다.');
            }

            // ✨ [스트리밍 처리] - 오류 처리 개선
            try {
                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let accumulatedText = '';
                const streamingTextElement = document.getElementById('streaming-text');
                let buffer = '';
                let finalAnalysisData = null;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    while (true) {
                        const eolIndex = buffer.indexOf('\n\n');
                        if (eolIndex < 0) break;

                        const message = buffer.substring(0, eolIndex);
                        buffer = buffer.substring(eolIndex + 2);

                        if (message.startsWith('data:')) {
                            const jsonData = message.substring(5).trim();
                            try {
                                const parsedData = JSON.parse(jsonData);

                                if (parsedData.event === 'done') {
                                    console.log("스트리밍 완료 신호 수신!");
                                    break;
                                }
                                
                                if (parsedData.final_json) {
                                    console.log("최종 정리된 JSON 데이터 수신!");
                                    finalAnalysisData = JSON.parse(parsedData.final_json);
                                    // 사용자에게는 친화적인 메시지만 표시
                                    accumulatedText = "🎉 AI 분석 완료! 결과를 정리하고 있습니다...";
                                }
                                else if (parsedData.chunk) {
                                    // chunk 데이터는 스트리밍 중에 표시하지 않음
                                    // 대신 진행 상황을 표시
                                    if (!accumulatedText.includes("분석 중")) {
                                        accumulatedText = "🤖 AI가 상세한 인생 분석을 작성하고 있습니다...";
                                    }
                                }

                                if (streamingTextElement) {
                                    // 사용자 친화적인 메시지만 표시
                                    streamingTextElement.textContent = accumulatedText;
                                }
                            } catch (e) {
                                console.error('스트리밍 중 JSON 파싱 오류:', jsonData, e);
                            }
                        }
                    }
                }
                
                // 최종 렌더링
                console.log('최종 데이터로 렌더링 시작:', finalAnalysisData);
                if (finalAnalysisData) {
                    lastAnalysisData = finalAnalysisData;
                    renderDashboard(finalAnalysisData);
                    dom.resultDashboard.classList.remove('hidden');
                    dom.downloadBtn.classList.remove('hidden');
                } else {
                    throw new Error("최종 분석 데이터를 받지 못했습니다.");
                }
                
            } catch (streamingError) {
                console.error('스트리밍 처리 중 오류:', streamingError);
                throw new Error(`스트리밍 처리 실패: ${streamingError.message}`);
            }
            
        } catch (error) {
            console.error('API 호출 또는 데이터 처리 오류:', error);
            
            // 로그인 오류인 경우 모달 표시
            if (error.message === '로그인이 필요합니다.') {
                dom.loginModal.classList.remove('hidden');
                dom.loginModal.classList.add('flex');
            }
            
            // 스트리밍 결과 영역에 오류 메시지 표시
            const streamingTextElement = document.getElementById('streaming-text');
            if (streamingTextElement) {
                streamingTextElement.textContent = `오류가 발생했습니다: ${error.message}`;
            }
        } finally {
            // 로딩 상태 복구
            dom.btnText.classList.remove('hidden');
            dom.loader.classList.add('hidden');
            dom.analyzeBtn.disabled = false;
            
            // 버튼 텍스트를 원래 상태로 복원
            dom.btnText.innerHTML = '<span class="text-xl">🔮</span><span>내 인생 보고서 분석하기</span>';
            
            // 임시 스트리밍 결과 영역 제거
            const streamingResult = document.getElementById('streaming-result');
            if (streamingResult) {
                streamingResult.remove();
            }
        }
    });

    // ✨ [추가] 테마 토글 이벤트 리스너
    dom.themeToggle.addEventListener('click', toggleTheme);
    
    // ✨ [추가] 다운로드 버튼 이벤트 리스너
    dom.downloadBtn.addEventListener('click', handleDownloadHtml);
    
    // ✨ [추가] 로그인 폼 이벤트 리스너
    dom.loginForm.addEventListener('submit', handleLogin);
    
    // ✨ [추가] 초기 테마 설정
    updateThemeIcon();

    function renderDashboard(data) {
        console.log('렌더링 시작:', data); // 디버깅용
        
        try {
            // 1. 종합 평가
            console.log('1. 종합 평가 렌더링 시도...');
            if (data.overall_assessment && dom.overallAssessment) {
                try {
                    dom.overallAssessment.innerHTML = `<p>${data.overall_assessment.summary || '분석 중...'}</p>`;
                    dom.overallAssessment.innerHTML += `<p class="mt-4 p-4 bg-indigo-900/50 rounded-lg"><strong>핵심 조언:</strong> ${data.overall_assessment.advice || '분석 중...'}</p>`;
                    console.log('✅ 종합 평가 렌더링 완료');
                } catch (e) {
                    console.error('❌ 종합 평가 렌더링 오류:', e);
                }
            } else {
                console.warn('종합 평가 데이터 또는 DOM 요소 누락:', { data: data.overall_assessment, dom: dom.overallAssessment });
            }
            
            // 이름 분석 결과 렌더링
            console.log('2. 이름 분석 렌더링 시도...');
            if (data.name_analysis && dom.nameAnalysis) {
                try {
                    // ✨ [수정] 분리된 입력 필드에서 이름 가져오기
                    const koreanName = document.getElementById('koreanName')?.value || '';
                    const chineseName = document.getElementById('chineseName')?.value || '';
                    
                    let nameTableHtml = `
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div class="card p-4 text-center">
                                <p class="text-sm text-gray-400">한글 이름</p>
                                <p class="text-xl font-bold">${koreanName}</p>
                            </div>
                            <div class="card p-4 text-center">
                                <p class="text-sm text-gray-400">한자 이름</p>
                                <p class="text-xl font-bold">${chineseName || '없음'}</p>
                            </div>
                            <div class="card p-4 text-center">
                                <p class="text-sm text-gray-400">글자 수</p>
                                <p class="text-xl font-bold">${koreanName.length}자</p>
                            </div>
                        </div>
                    `;
                    
                    // 하드코딩된 getChineseMeaning 대신 API 응답(hanja_details)을 사용
                    if (data.hanja_details && data.hanja_details.length > 0) {
                        nameTableHtml += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">';
                        data.hanja_details.forEach(hanja => {
                            nameTableHtml += `
                                <div class="card p-4 text-center">
                                    <p class="text-2xl font-bold mb-2">${hanja.hanja || '글자 없음'}</p>
                                    <p class="text-sm text-gray-400">${hanja.meaning}</p>
                                    <p class="text-xs mt-1 text-gray-500">(${hanja.element} 오행)</p>
                                </div>
                            `;
                        });
                        nameTableHtml += '</div>';
                    }

                    dom.nameAnalysis.innerHTML = nameTableHtml + `<p class="mt-4 text-gray-300">${data.name_analysis.summary}</p>`;
                    console.log('✅ 이름 분석 렌더링 완료');
                } catch (e) {
                    console.error('❌ 이름 분석 렌더링 오류:', e);
                }
            } else {
                console.warn('이름 분석 데이터 또는 DOM 요소 누락');
            }
            
            // 3. 사주 데이터 및 분석 (Saju Table)
            console.log('3. 사주 테이블 렌더링 시도...');
            if (data.saju_data && dom.sajuTableBody) {
                try {
                    const { pillars, sipsin, jijanggan } = data.saju_data;
                    // Populate table cells using data-saju attributes
                    // pillars now contain arrays [stem, branch] instead of strings
                    dom.sajuTableBody.querySelector('[data-saju="year_stem"]').textContent = pillars.year[0];
                    dom.sajuTableBody.querySelector('[data-saju="month_stem"]').textContent = pillars.month[0];
                    dom.sajuTableBody.querySelector('[data-saju="day_stem"]').textContent = pillars.day[0];
                    dom.sajuTableBody.querySelector('[data-saju="hour_stem"]').textContent = pillars.hour[0];
                    dom.sajuTableBody.querySelector('[data-saju="year_sipsin"]').textContent = sipsin.year;
                    dom.sajuTableBody.querySelector('[data-saju="month_sipsin"]').textContent = sipsin.month;
                    dom.sajuTableBody.querySelector('[data-saju="day_sipsin"]').textContent = sipsin.day;
                    dom.sajuTableBody.querySelector('[data-saju="hour_sipsin"]').textContent = sipsin.hour;
                    dom.sajuTableBody.querySelector('[data-saju="year_branch"]').textContent = pillars.year[1];
                    dom.sajuTableBody.querySelector('[data-saju="month_branch"]').textContent = pillars.month[1];
                    dom.sajuTableBody.querySelector('[data-saju="day_branch"]').textContent = pillars.day[1];
                    dom.sajuTableBody.querySelector('[data-saju="hour_branch"]').textContent = pillars.hour[1];
                    dom.sajuTableBody.querySelector('[data-saju="year_jijanggan"]').textContent = jijanggan.year;
                    dom.sajuTableBody.querySelector('[data-saju="month_jijanggan"]').textContent = jijanggan.month;
                    dom.sajuTableBody.querySelector('[data-saju="day_jijanggan"]').textContent = jijanggan.day;
                    dom.sajuTableBody.querySelector('[data-saju="hour_jijanggan"]').textContent = jijanggan.hour;
                    
                    // ✨ [추가] 사주 테이블 헤더에 클래스 추가
                    const headerCells = dom.sajuTableBody.querySelectorAll('td:first-child');
                    headerCells.forEach(cell => {
                        cell.classList.add('saju-table-header');
                    });
                    
                    console.log('✅ 사주 테이블 렌더링 완료');
                } catch (e) { console.error('❌ 사주 테이블 렌더링 오류:', e); }
            } else { console.warn('사주 데이터 또는 sajuTableBody DOM 요소 누락'); }
            
            console.log('4. 사주 구조 분석 렌더링 시도...');
            if (data.saju_structure && dom.sajuStructureSummary && dom.yongsinAnalysis) {
                try {
                    // ✨ [수정] 용신 데이터를 직접 사용
                    const yongsinData = data.yongsin || data.saju_structure.yongsin || '용신 분석 중...';
                    const sajuStrengthData = data.saju_strength || '사주 강약 분석 중...';
                    
                    dom.sajuStructureSummary.innerHTML = `<p><strong>사주 구조 해석:</strong> ${data.saju_structure.summary || '분석 중...'}</p>`;
                    dom.yongsinAnalysis.innerHTML = `<p><strong>용신 분석:</strong> ${data.saju_structure.yongsin}</p>`;
                    console.log('✅ 사주 구조 분석 렌더링 완료');
                    console.log('용신 데이터:', yongsinData);
                    console.log('사주 강약 데이터:', sajuStrengthData);
                } catch (e) {
                    console.error('❌ 사주 구조 분석 렌더링 오류:', e);
                }
            } else {
                console.warn('사주 구조 데이터 또는 관련 DOM 요소 누락');
            }

            // 5. 잠재력 대시보드 (Charts)
            console.log('5. 잠재력 대시보드 렌더링 시도...');
            console.log('차트 인스턴스 확인:', { fiveElementsChartInstance, coreCompetenciesChartInstance });
            console.log('데이터 구조 확인:', { 
                saju_data: data.saju_data, 
                potential_dashboard: data.potential_dashboard,
                oheng_counts: data.oheng_counts 
            });
            
            if (data.saju_data && data.potential_dashboard) {
                try {
                    // 오행 분포 차트 데이터 업데이트 (데이터 순서 보장)
                    let fiveElementsData = null; 
                    if (data.saju_data.five_elements && data.saju_data.five_elements.counts) { 
                        fiveElementsData = data.saju_data.five_elements.counts; 
                        console.log('five_elements.counts에서 데이터 가져옴:', fiveElementsData);
                        
                        // ✨ [수정] 영어 키를 한자 키로 변환
                        if (fiveElementsData.wood !== undefined) {
                            fiveElementsData = {
                                '木': fiveElementsData.wood || 0,
                                '火': fiveElementsData.fire || 0,
                                '土': fiveElementsData.earth || 0,
                                '金': fiveElementsData.metal || 0,
                                '水': fiveElementsData.water || 0
                            };
                            console.log('영어 키를 한자 키로 변환:', fiveElementsData);
                        }
                    } else if (data.oheng_counts) { 
                        fiveElementsData = data.oheng_counts; 
                        console.log('oheng_counts에서 데이터 가져옴:', fiveElementsData);
                    }
                    
                    console.log('최종 fiveElementsData:', fiveElementsData);
                    console.log('fiveElementsChartInstance 존재 여부:', !!fiveElementsChartInstance);
                    
                    if (fiveElementsData && fiveElementsChartInstance) {
                        const orderedFiveElements = [
                            fiveElementsData['木'] || 0,
                            fiveElementsData['火'] || 0,
                            fiveElementsData['土'] || 0,
                            fiveElementsData['金'] || 0,
                            fiveElementsData['水'] || 0
                        ];
                        console.log('정렬된 오행 데이터:', orderedFiveElements);
                        fiveElementsChartInstance.data.datasets[0].data = orderedFiveElements;
                        // ✨ [추가] 차트 색상 설정 업데이트
                        updateChartDefaults();
                        fiveElementsChartInstance.update();
                        console.log('✅ 오행 차트 업데이트 완료:', orderedFiveElements);
                    } else {
                        console.warn('오행 데이터 누락:', fiveElementsData);
                        console.warn('차트 인스턴스 누락:', !fiveElementsChartInstance);
                    }
                    
                    // 핵심 역량 차트 데이터 업데이트
                    const competenciesData = data.potential_dashboard?.core_competencies;
                    if (competenciesData && coreCompetenciesChartInstance) {
                        const competenciesValues = [
                            parseInt(competenciesData.leadership) || 0,
                            parseInt(competenciesData.creativity) || 0,
                            parseInt(competenciesData.communication) || 0,
                            parseInt(competenciesData.analytical) || 0,
                            parseInt(competenciesData.execution) || 0
                        ];
                        coreCompetenciesChartInstance.data.datasets[0].data = competenciesValues;
                        // ✨ [추가] 차트 색상 설정 업데이트
                        updateChartDefaults();
                        coreCompetenciesChartInstance.update();
                        console.log('✅ 역량 차트 업데이트 완료:', competenciesValues);
                    } else {
                        // 기본값으로 차트 업데이트
                        const defaultValues = [5, 5, 5, 5, 5];
                        if (coreCompetenciesChartInstance) {
                            coreCompetenciesChartInstance.data.datasets[0].data = defaultValues;
                            coreCompetenciesChartInstance.update();
                        }
                        console.warn('역량 데이터 누락, 기본값 사용:', competenciesData);
                    }
                    console.log('✅ 차트 렌더링 완료');
                } catch (e) { 
                    console.error('❌ 차트 렌더링 오류:', e);
                }
            } else { 
                console.warn('차트 데이터 누락:', {
                    'saju_data': data.saju_data,
                    'potential_dashboard': data.potential_dashboard
                }); 
            }

            // 6. 최고 재능
            console.log('6. 최고 재능 렌더링 시도...');
            if (data.potential_dashboard && data.potential_dashboard.top_talents && Array.isArray(data.potential_dashboard.top_talents) && data.potential_dashboard.top_talents.length > 0 && dom.topTalents) {
                try {
                    const talentsHtml = data.potential_dashboard.top_talents.map((talent, index) => {
                        const talentName = talent.talent || '분석 중...';
                        const description = talent.description || '상세 설명을 불러오는 중입니다.';
                        
                        const colors = [
                            'from-purple-500/20 to-purple-900/20 text-purple-300 talent-card-purple',
                            'from-blue-500/20 to-blue-900/20 text-blue-300 talent-card-blue',
                            'from-green-500/20 to-green-900/20 text-green-300 talent-card-green'
                        ];
                        const colorClass = colors[index % colors.length];
                        
                        return `
                            <div class="mb-4 p-4 rounded-lg bg-gradient-to-br ${colorClass}">
                                <h4 class="font-bold text-lg talent-title">${talentName}</h4>
                                <p class="mt-2 text-gray-300 talent-description">${description}</p>
                            </div>
                        `;
                    }).join('');
                    
                    dom.topTalents.innerHTML = `
                        <div class="space-y-2">
                            ${talentsHtml}
                        </div>
                    `;
                    console.log('✅ 최고 재능 렌더링 완료');
                } catch (e) {
                    console.error('❌ 최고 재능 렌더링 오류:', e);
                }
            }

            // ✨ [신규] 6-1. 신살 분석 렌더링
            console.log('6-1. 신살 분석 렌더링 시도...');
            if (data.shinsal_analysis) {
                try {
                    const shinsalSection = document.getElementById('shinsalSection');
                    const shinsalSummary = document.getElementById('shinsalSummary');
                    const shinsalDetails = document.getElementById('shinsalDetails');
                    
                    if (shinsalSection && shinsalSummary && shinsalDetails) {
                        // 섹션 표시
                        shinsalSection.style.display = 'block';
                        
                        // 요약 렌더링
                        if (data.shinsal_analysis.summary) {
                            shinsalSummary.querySelector('p').textContent = data.shinsal_analysis.summary;
                        }
                        
                        // 상세 신살 카드 렌더링
                        if (data.shinsal_analysis.details && Array.isArray(data.shinsal_analysis.details)) {
                            const shinsalIcons = {
                                '도화살': '🌸',
                                '역마살': '🐎',
                                '화개살': '🎭',
                                '천을귀인': '👼',
                                '천덕귀인': '✨',
                                '문창귀인': '📚',
                                '학당귀인': '🎓',
                                '공망': '🌑',
                                '원진': '⚔️',
                                '육해': '🌊'
                            };
                            
                            const shinsalHtml = data.shinsal_analysis.details.map(item => {
                                const icon = shinsalIcons[item.name] || '⭐';
                                return `
                                    <div class="talent-card talent-card-purple p-5 rounded-xl">
                                        <div class="flex items-center gap-3 mb-3">
                                            <span class="text-3xl">${icon}</span>
                                            <h4 class="font-bold text-lg text-purple-300">${item.name}</h4>
                                        </div>
                                        <p class="text-gray-300 text-sm leading-relaxed">${item.effect}</p>
                                    </div>
                                `;
                            }).join('');
                            
                            shinsalDetails.innerHTML = shinsalHtml;
                        }
                        
                        console.log('✅ 신살 분석 렌더링 완료');
                    }
                } catch (e) {
                    console.error('❌ 신살 분석 렌더링 오류:', e);
                }
            }

            // 7. 인생 경로 타임라인
            console.log('7. 인생 경로 타임라인 렌더링 시도...');
            if (data.life_path_timeline && Array.isArray(data.life_path_timeline) && data.life_path_timeline.length > 0 && dom.lifePathTimeline) {
                try {
                    const timelineHtml = data.life_path_timeline.map(item => {
                        const age = item.age || '시기 미상';
                        const summary = item.summary || '분석 정보가 없습니다.';
                        const opportunity = item.opportunity || '분석 정보가 없습니다.';
                        const risk = item.risk || '분석 정보가 없습니다.';
                        
                        return `
                            <div class="border-l-4 border-indigo-500/80 pl-3 py-2 mb-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-all timeline-card">
                                <h4 class="font-bold text-lg text-purple-400 mb-2">${age}</h4>
                                <p class="mt-2 text-gray-300 timeline-content">${summary}</p>
                                <div class="space-y-1">
                                    <p class="text-sm"><strong class="text-green-400 timeline-opportunity">기회:</strong> <span class="text-gray-400 timeline-content">${opportunity}</span></p>
                                    <p class="text-sm"><strong class="text-red-400 timeline-risk">주의:</strong> <span class="text-gray-400 timeline-content">${risk}</span></p>
                                </div>
                            </div>
                        `;
                    }).join('');
                    
                    dom.lifePathTimeline.innerHTML = timelineHtml;
                    console.log('✅ 인생 경로 타임라인 렌더링 완료');
                } catch (e) {
                    console.error('❌ 인생 경로 타임라인 렌더링 오류:', e);
                }
            }

            // 8. 신년 운세
            console.log('8. 신년 운세 렌더링 시도...');
            const currentYear = new Date().getFullYear();
            const nextYear = currentYear + 1;

            // 올해 운세
            const currentFortuneData = data[`new_year_fortune_${currentYear}`];
            if (currentFortuneData && dom.currentYearTitle && dom.currentYearSummary && dom.currentMonthlyFortuneContainer) {
                try {
                    dom.currentYearTitle.textContent = `${currentYear}년 올해의 운세`;
                    dom.currentYearSummary.innerHTML = `<p>${currentFortuneData.summary || '분석 중...'}</p>`;
                    
                    // monthly_fortune 배열 안전 처리
                    const monthlyFortune = currentFortuneData.monthly_fortune || [];
                    if (Array.isArray(monthlyFortune) && monthlyFortune.length > 0) {
                        dom.currentMonthlyFortuneContainer.innerHTML = monthlyFortune.map(m => `
                            <div class="p-3 bg-gray-800 rounded-lg text-center monthly-fortune-card">
                                <p class="font-bold text-sm monthly-fortune-month">${m.month}월</p>
                                <p class="text-xs mt-1 text-gray-400 monthly-fortune-text">${m.fortune}</p>
                            </div>
                        `).join('');
                    } else {
                        // 기본 월별 운세 생성
                        const defaultMonthlyFortune = Array.from({length: 12}, (_, i) => ({
                            month: i + 1,
                            fortune: `${i + 1}월 운세 분석 중...`
                        }));
                        dom.currentMonthlyFortuneContainer.innerHTML = defaultMonthlyFortune.map(m => `
                            <div class="p-3 bg-gray-800 rounded-lg text-center monthly-fortune-card">
                                <p class="font-bold text-sm monthly-fortune-month">${m.month}월</p>
                                <p class="text-xs mt-1 text-gray-400 monthly-fortune-text">${m.fortune}</p>
                            </div>
                        `).join('');
                    }
                    console.log(`✅ ${currentYear}년 운세 렌더링 완료`);
                } catch (e) {
                    console.error(`❌ ${currentYear}년 운세 렌더링 오류:`, e);
                }
            }

            // 내년 운세
            const nextFortuneData = data[`new_year_fortune_${nextYear}`];
            if (nextFortuneData && dom.nextYearTitle && dom.nextYearSummary && dom.nextMonthlyFortuneContainer) {
                try {
                    dom.nextYearTitle.textContent = `${nextYear}년 내년 운세`;
                    dom.nextYearSummary.innerHTML = `<p>${nextFortuneData.summary || '분석 중...'}</p>`;
                    
                    // monthly_fortune 배열 안전 처리
                    const monthlyFortune = nextFortuneData.monthly_fortune || [];
                    if (Array.isArray(monthlyFortune) && monthlyFortune.length > 0) {
                        dom.nextMonthlyFortuneContainer.innerHTML = monthlyFortune.map(m => `
                            <div class="p-3 bg-gray-800 rounded-lg text-center monthly-fortune-card">
                                <p class="font-bold text-sm monthly-fortune-month">${m.month}월</p>
                                <p class="text-xs mt-1 text-gray-400 monthly-fortune-text">${m.fortune}</p>
                            </div>
                        `).join('');
                    } else {
                        // 기본 월별 운세 생성
                        const defaultMonthlyFortune = Array.from({length: 12}, (_, i) => ({
                            month: i + 1,
                            fortune: `${i + 1}월 운세 분석 중...`
                        }));
                        dom.nextMonthlyFortuneContainer.innerHTML = defaultMonthlyFortune.map(m => `
                            <div class="p-3 bg-gray-800 rounded-lg text-center monthly-fortune-card">
                                <p class="font-bold text-sm monthly-fortune-month">${m.month}월</p>
                                <p class="text-xs mt-1 text-gray-400 monthly-fortune-text">${m.fortune}</p>
                            </div>
                        `).join('');
                    }
                    console.log(`✅ ${nextYear}년 운세 렌더링 완료`);
                } catch (e) {
                    console.error(`❌ ${nextYear}년 운세 렌더링 오류:`, e);
                }
            }

            // 9. 직업운 & 재물운
            console.log('9. 직업운 & 재물운 렌더링 시도...');
            if (data.career_finance_analysis && dom.careerSummary && dom.suitableJobs && dom.financeSummary) {
                try {
                    dom.careerSummary.innerHTML = `<p>${data.career_finance_analysis.career_summary || ''}</p>`;
                    dom.suitableJobs.innerHTML = (data.career_finance_analysis.suitable_jobs || []).map(j => `<span class="bg-green-800/50 text-green-300 text-sm font-medium px-3 py-1 rounded-full">${j}</span>`).join('');
                    dom.financeSummary.innerHTML = `<p>${data.career_finance_analysis.finance_summary || ''}</p>`;
                    console.log('✅ 직업운 & 재물운 렌더링 완료');
                } catch (e) {
                    console.error('❌ 직업운 & 재물운 렌더링 오류:', e);
                }
            }
            
            // 10. 건강운 & 학업운
            console.log('10. 건강운 & 학업운 렌더링 시도...');
            if (data.health_education_analysis && dom.healthSummary && dom.educationSummary) {
                try {
                    dom.healthSummary.innerHTML = `<p>${data.health_education_analysis.health_summary || ''}</p>`;
                    dom.educationSummary.innerHTML = `<p>${data.health_education_analysis.education_summary || ''}</p>`;
                    console.log('✅ 건강운 & 학업운 렌더링 완료');
                } catch (e) {
                    console.error('❌ 건강운 & 학업운 렌더링 오류:', e);
                }
            }
            
            console.log('🎉 전체 렌더링 완료!');
            
        } catch (error) {
            console.error('💥 전체 렌더링 중 치명적 오류 발생:', error);
        }
    }

    // ✨ [추가] 로그인 처리 함수
    async function handleLogin(e) {
        e.preventDefault();
        const username = dom.loginForm.username.value;
        const password = dom.loginForm.password.value;
        dom.loginSubmitBtn.disabled = true;
        dom.loginSubmitBtn.textContent = '로그인 중...';
        
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
            dom.loginModal.classList.add('hidden');
            dom.loginForm.reset();
        } catch (error) {
            alert(error.message);
        } finally {
            dom.loginSubmitBtn.disabled = false;
            dom.loginSubmitBtn.textContent = '로그인';
        }
    }

    // ✨ [추가] 테마 변경 함수
    function toggleTheme() {
        document.documentElement.classList.toggle('light');
        document.documentElement.classList.toggle('dark');
        updateThemeIcon();
        
        // 차트가 있다면 테마에 맞게 다시 렌더링
        if (fiveElementsChartInstance) {
            const isLight = document.documentElement.classList.contains('light');
            const textColor = isLight ? '#1f2937' : '#f3f4f6';
            const gridColor = isLight ? '#e5e7eb' : '#374151';
            
            fiveElementsChartInstance.options.scales.y.ticks.color = textColor;
            fiveElementsChartInstance.options.scales.x.ticks.color = textColor;
            fiveElementsChartInstance.options.scales.y.grid.color = gridColor;
            fiveElementsChartInstance.options.scales.x.grid.color = gridColor;
            fiveElementsChartInstance.update();
        }
        
        if (coreCompetenciesChartInstance) {
            const isLight = document.documentElement.classList.contains('light');
            const textColor = isLight ? '#1f2937' : '#f3f4f6';
            const gridColor = isLight ? '#e5e7eb' : '#374151';
            
            coreCompetenciesChartInstance.options.scales.r.ticks.color = textColor;
            coreCompetenciesChartInstance.options.scales.r.grid.color = gridColor;
            coreCompetenciesChartInstance.options.scales.r.pointLabels.color = textColor;
            coreCompetenciesChartInstance.update();
        }
    }

    // ✨ [추가] 테마 아이콘 업데이트 함수
    function updateThemeIcon() {
        const isDarkMode = !document.documentElement.classList.contains('light');
        dom.themeIconSun.style.display = isDarkMode ? 'none' : 'block';
        dom.themeIconMoon.style.display = isDarkMode ? 'block' : 'none';
    }

    // ✨ [추가] HTML 다운로드 함수
    async function handleDownloadHtml() {
        if (!lastAnalysisData) {
            alert('먼저 분석을 실행해주세요.');
            return;
        }

        const btn = dom.downloadBtn;
        btn.disabled = true;
        
        try {
            const htmlContent = await generateReportHtml();
            const today = new Date();
            const downloadDateString = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
            const koreanNameForFile = document.getElementById('koreanName').value; // 한글 이름만 추출
            const filename = `사주분석_${koreanNameForFile}_${downloadDateString}.html`;

            const blob = new Blob([htmlContent], { type: 'text/html' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        } catch (error) {
            console.error("HTML 생성 중 오류 발생:", error);
            alert("HTML 파일을 생성하는 데 실패했습니다.");
        } finally {
            btn.disabled = false;
        }
    }

    // ✨ [추가] 보고서 HTML 생성 함수
    async function generateReportHtml() {
        const pageHead = document.head.innerHTML;
        const today = new Date();
        const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const koreanNameForTitle = document.getElementById('koreanName').value;
        const chineseNameForTitle = document.getElementById('chineseName').value;
        const fullNameForTitle = chineseNameForTitle ? `${koreanNameForTitle} ${chineseNameForTitle}` : koreanNameForTitle;

        // 보고서 본문 구성
        const reportContainer = document.getElementById('resultDashboard').cloneNode(true);
        const downloadBtnInReport = reportContainer.querySelector('#downloadBtn');
        if (downloadBtnInReport) {
            downloadBtnInReport.remove();
        }
        const reportBody = reportContainer.innerHTML;

        // 보고서 전체 구조 생성
        const reportHeader = `
            <header class="text-center mb-10 relative">
                <h1 class="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">AI 명리학 인생 분석 보고서</h1>
                <p class="text-lg mt-3 text-gray-400">${fullNameForTitle}님의 인생 분석 결과</p>
                <p class="text-sm mt-2 text-gray-500">${dateString}</p>
            </header>`;

        const bodyStructure = `
            <div class="container mx-auto p-4 md:p-8">
                ${reportHeader}
                <main id="resultDashboard" class="space-y-8">${reportBody}</main>
            </div>`;

        const finalHtml = `
            <!DOCTYPE html>
            <html lang="ko" class="${document.documentElement.className}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AI 명리학 인생 분석 보고서 - ${fullNameForTitle}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap" rel="stylesheet">
                <style>
                    :root {
                        --bg-primary: #111827; --bg-secondary: #1f2937; --bg-panel: #1f293780;
                        --border-color: #37415180; --text-primary: #f3f4f6; --text-secondary: #9ca3af;
                        --input-bg: #374151; --input-border: #4b5563;
                    }
                    html.light {
                        --bg-primary: #f9fafb; --bg-secondary: #ffffff; --bg-panel: #ffffffcc;
                        --border-color: #e5e7eb; --text-primary: #1f2937; --text-secondary: #374151;
                        --input-bg: #f3f4f6; --input-border: #d1d5db;
                    }
                    body { font-family: 'Noto Sans KR', sans-serif; background-color: var(--bg-primary); color: var(--text-primary); }
                    .card { background-color: var(--bg-secondary); border: 1px solid var(--border-color); }
                    .input-field { background-color: var(--input-bg); border-color: var(--input-border); color: var(--text-primary); }
                    .btn-primary { background-color: #4f46e5; color: white !important; }
                    .btn-primary:hover { background-color: #4338ca; }
                    
                    /* 라이트 테마 가독성 개선 */
                    html.light .text-gray-300 { color: #1f2937 !important; }
                    html.light .text-gray-400 { color: #374151 !important; }
                    html.light .text-gray-500 { color: #6b7280 !important; }
                    html.light .text-gray-600 { color: #374151 !important; }
                    
                    /* 사주 테이블 헤더 셀 색상 - 라이트 테마에서 흰색 */
                    html.light .saju-table-header { color: white !important; font-weight: 600; }
                    
                    /* 사주 테이블 전체 텍스트 색상 - 라이트 테마에서 검은색 */
                    html.light .saju-table { color: #1f2937 !important; }
                    html.light .saju-table th { color: #1f2937 !important; font-weight: 600; }
                    html.light .saju-table td { color: #374151 !important; }
                    
                    /* 사주 테이블 헤더 배경색과 텍스트 색상 - 라이트 테마에서 명확하게 보이도록 */
                    html.light .saju-table thead th { 
                        background-color: #374151 !important; 
                        color: white !important; 
                        font-weight: 600; 
                    }
                    
                    /* 월별 운세 카드 배경색과 텍스트 색상 */
                    html.light .monthly-fortune-card { background-color: white !important; }
                    html.light .monthly-fortune-month { color: #1f2937 !important; font-weight: 600; }
                    html.light .monthly-fortune-text { color: #374151 !important; }
                    
                    /* 인생 경로 타임라인 배경색과 텍스트 색상 */
                    html.light .timeline-card { background-color: white !important; }
                    html.light .timeline-content { color: #1f2937 !important; }
                    html.light .timeline-opportunity { color: #059669 !important; }
                    html.light .timeline-risk { color: #dc2626 !important; }
                    
                    /* 재능 섹션 배경색 개선 */
                    html.light .talent-card-purple { background: linear-gradient(135deg, rgba(147, 51, 234, 0.1), rgba(147, 51, 234, 0.05)); }
                    html.light .talent-card-blue { background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05)); }
                    html.light .talent-card-green { background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05)); }
                </style>
            </head>
            <body>
                ${bodyStructure}
                <script>
                    // 분석 데이터를 전역 변수로 설정
                    window.lastAnalysisData = ${JSON.stringify(lastAnalysisData)};
                    
                    // 다운로드된 파일에서 차트를 생성하는 함수
                    document.addEventListener('DOMContentLoaded', function() {
                        if (window.lastAnalysisData) {
                            createChartsInDownloadedFile(window.lastAnalysisData);
                        }
                    });
                    
                    function createChartsInDownloadedFile(data) {
                        // 오행 분포 차트 생성
                        const fiveElementsCanvas = document.getElementById('fiveElementsChart');
                        if (fiveElementsCanvas && data.saju_data) {
                            let fiveElementsData = null; if (data.saju_data.five_elements && data.saju_data.five_elements.counts) { fiveElementsData = data.saju_data.five_elements.counts; } else if (data.oheng_counts) { fiveElementsData = data.oheng_counts; }
                            const fiveElementsValues = [
                                parseInt(fiveElementsData['木']) || 0,
                                parseInt(fiveElementsData['火']) || 0,
                                parseInt(fiveElementsData['土']) || 0,
                                parseInt(fiveElementsData['金']) || 0,
                                parseInt(fiveElementsData['水']) || 0
                            ];
                            
                            new Chart(fiveElementsCanvas, {
                                type: 'bar',
                                data: {
                                    labels: ['木 (목)', '火 (화)', '土 (토)', '金 (금)', '水 (수)'],
                                    datasets: [{
                                        label: '오행 분포',
                                        data: fiveElementsValues,
                                        backgroundColor: [
                                            'rgba(34, 197, 94, 0.8)',
                                            'rgba(239, 68, 68, 0.8)',
                                            'rgba(245, 158, 11, 0.8)',
                                            'rgba(59, 130, 246, 0.8)',
                                            'rgba(147, 51, 234, 0.8)'
                                        ],
                                        borderColor: [
                                            'rgba(34, 197, 94, 1)',
                                            'rgba(239, 68, 68, 1)',
                                            'rgba(245, 158, 11, 1)',
                                            'rgba(59, 130, 246, 1)',
                                            'rgba(147, 51, 234, 1)'
                                        ],
                                        borderWidth: 2
                                    }]
                                },
                                options: {
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            display: false
                                        }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: {
                                                color: '#9CA3AF'
                                            },
                                            grid: {
                                                color: '#374151'
                                            }
                                        },
                                        x: {
                                            ticks: {
                                                color: '#9CA3AF'
                                            },
                                            grid: {
                                                color: '#374151'
                                            }
                                        }
                                    }
                                }
                            });
                        }
                        
                        // 핵심 역량 차트 생성
                        const competenciesCanvas = document.getElementById('coreCompetenciesChart');
                        if (competenciesCanvas && data.potential_dashboard && data.potential_dashboard.core_competencies) {
                            const competenciesData = data.potential_dashboard.core_competencies;
                            const competenciesValues = [
                                parseInt(competenciesData.leadership) || 0,
                                parseInt(competenciesData.creativity) || 0,
                                parseInt(competenciesData.communication) || 0,
                                parseInt(competenciesData.analytical) || 0,
                                parseInt(competenciesData.execution) || 0
                            ];
                            
                            new Chart(competenciesCanvas, {
                                type: 'radar',
                                data: {
                                    labels: ['리더십', '창의성', '소통력', '분석력', '실행력'],
                                    datasets: [{
                                        label: '핵심 역량',
                                        data: competenciesValues,
                                        backgroundColor: 'rgba(99, 102, 241, 0.2)',
                                        borderColor: 'rgb(99, 102, 241)',
                                        borderWidth: 2,
                                        pointBackgroundColor: 'rgb(99, 102, 241)',
                                        pointBorderColor: '#fff',
                                        pointHoverBackgroundColor: '#fff',
                                        pointHoverBorderColor: 'rgb(99, 102, 241)'
                                    }]
                                },
                                options: {
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            labels: {
                                                color: '#E5E7EB',
                                                font: { size: 12 }
                                            }
                                        }
                                    },
                                    scales: {
                                        r: {
                                            min: 0,
                                            max: 10,
                                            ticks: {
                                                color: '#9CA3AF',
                                                font: { size: 12 },
                                                backdropColor: 'transparent'
                                            },
                                            grid: {
                                                color: '#374151'
                                            },
                                            pointLabels: {
                                                color: '#E5E7EB',
                                                font: { size: 14, weight: 'bold' },
                                                padding: 15
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    }
                </script>
            </body>
            </html>`;
        
        return finalHtml;
    }
}); 