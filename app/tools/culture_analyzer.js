const API_BASE_URL = 'https://api.dreamofenc.com';
let cultureChartInstance = null;
let lastAnalysisData = null;

let dom = {}; // ✨ [수정] DOM 참조를 나중에 초기화

document.addEventListener('DOMContentLoaded', () => {
    // ✨ [수정] DOM 요소 참조 초기화
    dom = {
        mainContent: document.getElementById('main-content'),
        loginModal: document.getElementById('login-modal'),
        loginForm: document.getElementById('login-form'),
        loginSubmitBtn: document.getElementById('login-submit-btn'),
        textInput: document.getElementById('textInput'),
        analyzeBtn: document.getElementById('analyzeBtn'),
        controlPanel: document.getElementById('control-panel'),
        loader: document.getElementById('loader'),
        loaderText: document.getElementById('loader-text'),
        resultDashboard: document.getElementById('resultDashboard'),
        disclaimer: document.getElementById('disclaimer'),
        // ✨ [강화] 신규 컨테이너 DOM 요소 추가
        overallSummaryContainer: document.getElementById('overallSummaryContainer'),
        cultureProfileChart: document.getElementById('cultureProfileChart'),
        keyIssuesContainer: document.getElementById('keyIssuesContainer'),
        culturalDynamicsContainer: document.getElementById('culturalDynamicsContainer'),
        recommendationsContainer: document.getElementById('recommendationsContainer'),
        // ✨ [추가] 새로운 버튼들
        backBtn: document.getElementById('backBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        themeToggle: document.getElementById('themeToggle'),
        themeIconMoon: document.getElementById('themeIconMoon'),
        themeIconSun: document.getElementById('themeIconSun'),
    };

    // 인증 상태 확인
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

    // 이벤트 리스너 등록
    dom.analyzeBtn.addEventListener('click', handleAnalysis);
    dom.backBtn.addEventListener('click', handleBackToInput);
    dom.downloadBtn.addEventListener('click', handleDownloadReport);
    dom.themeToggle.addEventListener('click', toggleTheme);
    dom.loginForm.addEventListener('submit', handleLogin);
});

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

async function handleAnalysis() {
    // ✨ [추가] DOM 요소 존재 여부 확인
    if (!dom.controlPanel || !dom.loader || !dom.resultDashboard || !dom.disclaimer) {
        console.error('DOM 요소를 찾을 수 없습니다:', {
            controlPanel: !!dom.controlPanel,
            loader: !!dom.loader,
            resultDashboard: !!dom.resultDashboard,
            disclaimer: !!dom.disclaimer
        });
        alert('페이지 로딩 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        return;
    }

    const textData = dom.textInput.value.trim();
    if (!textData) {
        alert('분석할 데이터를 입력해주세요.');
        return;
    }

    // UI 초기화
    dom.resultDashboard.classList.add('hidden');
    dom.disclaimer.classList.add('hidden');
    dom.loader.classList.remove('hidden');
    dom.loader.classList.add('flex');
    dom.analyzeBtn.disabled = true;
    dom.analyzeBtn.innerHTML = '<span>분석 중...</span><i class="fas fa-spinner fa-spin"></i>';

    try {
        const token = sessionStorage.getItem('ai-tool-token');
        if (!token) {
            alert('세션이 만료되었습니다. 다시 로그인해주세요.');
            sessionStorage.removeItem('ai-tool-token');
            window.location.reload();
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/culture/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text_data: textData })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '분석 중 오류가 발생했습니다.');
        }

        const result = await response.json();
        lastAnalysisData = result;
        renderDashboard(result);
        dom.resultDashboard.classList.remove('hidden');
        dom.disclaimer.classList.remove('hidden');

    } catch (error) {
        console.error("분석 오류:", error);
        alert(`오류가 발생했습니다: ${error.message}`);
    } finally {
        dom.loader.classList.add('hidden');
        dom.loader.classList.remove('flex');
        dom.analyzeBtn.disabled = false;
        dom.analyzeBtn.innerHTML = '<span>진단 시작</span><i class="fas fa-rocket"></i>';
    }
}

function renderDashboard(data) {
    lastAnalysisData = data;
    
    // ✨ [강화] 새로운 대시보드 구조로 렌더링
    renderOverallSummary(data.overall_summary);
    renderProfileChart(data.profile);
    renderKeyIssues(data.key_issues, data.profile);
    renderCulturalDynamics(data.cultural_dynamics);
    renderRecommendations(data.actionable_recommendations);
    
    // ✨ [추가] 버튼 상태 업데이트
    dom.backBtn.classList.remove('hidden');
    dom.downloadBtn.classList.remove('hidden');
}

function renderProfileChart(profileData) {
    // ✨ [추가] Chart.js 로드 확인
    if (typeof Chart === 'undefined') {
        console.error('Chart.js가 로드되지 않았습니다.');
        return;
    }
    
    // ✨ [추가] canvas 요소 확인
    if (!dom.cultureProfileChart) {
        console.error('차트 canvas 요소를 찾을 수 없습니다.');
        return;
    }
    
    if (cultureChartInstance) {
        cultureChartInstance.destroy();
    }
    
    // profileData가 없거나 빈 객체인 경우 기본 데이터 사용
    const safeProfileData = profileData || {};
    
    const labels = ['관계지향 (Clan)', '혁신지향 (Adhocracy)', '과업지향 (Market)', '위계지향 (Hierarchy)'];
    const data = [
        safeProfileData.clan || 0,
        safeProfileData.adhocracy || 0,
        safeProfileData.market || 0,
        safeProfileData.hierarchy || 0
    ];

    const isLight = document.documentElement.classList.contains('light');
    const textColor = isLight ? '#1f2937' : '#f3f4f6';
    const gridColor = isLight ? '#e5e7eb' : '#374151';

    // 데이터가 모두 0인 경우 기본값 설정
    const maxValue = Math.max(...data, 25); // 최소 25%로 설정

    try {
        cultureChartInstance = new Chart(dom.cultureProfileChart, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: '조직문화 유형 분포 (%)',
                    data: data,
                    backgroundColor: 'rgba(14, 165, 233, 0.2)',
                    borderColor: 'rgba(14, 165, 233, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(14, 165, 233, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(14, 165, 233, 1)'
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    r: {
                        angleLines: { color: gridColor },
                        grid: { color: gridColor },
                        pointLabels: { 
                            color: textColor, 
                            font: { size: 14 },
                            padding: 35,
                            callback: function(value) {
                                // ✨ [추가] 라벨 줄바꿈 처리
                                if (value === '관계지향 (Clan)') return ['관계지향', '(Clan)'];
                                if (value === '혁신지향 (Adhocracy)') return ['혁신지향', '(Adhocracy)'];
                                if (value === '과업지향 (Market)') return ['과업지향', '(Market)'];
                                if (value === '위계지향 (Hierarchy)') return ['위계지향', '(Hierarchy)'];
                                return value;
                            }
                        },
                        ticks: { 
                            backdropColor: 'transparent', 
                            color: textColor, 
                            stepSize: 10,
                            padding: 20,
                            font: { size: 12 },
                            callback: function(value) {
                                return value + '%';
                            }
                        },
                        suggestedMin: 0,
                        suggestedMax: maxValue + 10,
                        center: {
                            x: 0.5,
                            y: 0.5
                        }
                    }
                },
                layout: {  // ✨ [수정] 레이아웃 패딩 감소로 차트 크기 10% 증가
                    padding: {
                        top: 25,
                        bottom: 25,
                        left: 25,
                        right: 25
                    }
                }
            }
        });
        console.log('✅ 차트 렌더링 완료');
    } catch (error) {
        console.error('차트 렌더링 오류:', error);
    }
}

function renderOverallSummary(summary) {
    if (!dom.overallSummaryContainer) {
        console.error('종합 진단 컨테이너를 찾을 수 없습니다.');
        return;
    }
    
    if (!summary || typeof summary !== 'object') {
        console.error('종합 진단 데이터가 유효하지 않습니다:', summary);
        dom.overallSummaryContainer.innerHTML = '<p class="text-red-500">종합 진단 데이터를 불러올 수 없습니다.</p>';
        return;
    }
    
    dom.overallSummaryContainer.innerHTML = `
        <div class="flex items-start gap-3">
            <i class="fas fa-flag text-sky-400 mt-1"></i>
            <p><strong>핵심 특징:</strong> ${summary.characteristics || '분석 중...'}</p>
        </div>
        <div class="flex items-start gap-3">
            <i class="fas fa-thumbs-up text-green-400 mt-1"></i>
            <p><strong>긍정적 측면:</strong> ${summary.strengths || '분석 중...'}</p>
        </div>
        <div class="flex items-start gap-3">
            <i class="fas fa-exclamation-triangle text-yellow-400 mt-1"></i>
            <p><strong>개선 필요 영역:</strong> ${summary.challenges || '분석 중...'}</p>
        </div>
    `;
}

function renderKeyIssues(issuesData, profileData) {
    // ✨ [추가] DOM 요소 확인
    if (!dom.keyIssuesContainer) {
        console.error('키 이슈 컨테이너를 찾을 수 없습니다.');
        return;
    }
    
    // ✨ [추가] 데이터 유효성 검사
    if (!issuesData || typeof issuesData !== 'object') {
        console.error('키 이슈 데이터가 유효하지 않습니다:', issuesData);
        dom.keyIssuesContainer.innerHTML = '<p class="text-red-500">키 이슈 데이터를 불러올 수 없습니다.</p>';
        return;
    }
    
    const cultureMap = {
        clan: { title: '관계지향 (Clan)', color: 'green', icon: 'fas fa-heart' },
        adhocracy: { title: '혁신지향 (Adhocracy)', color: 'blue', icon: 'fas fa-lightbulb' },
        market: { title: '과업지향 (Market)', color: 'red', icon: 'fas fa-chart-line' },
        hierarchy: { title: '위계지향 (Hierarchy)', color: 'purple', icon: 'fas fa-sitemap' }
    };

    dom.keyIssuesContainer.innerHTML = '';
    
    for (const [key, value] of Object.entries(issuesData)) {
        const config = cultureMap[key];
        if (!config) continue;
        
        // ✨ [추가] 퍼센트 정보 가져오기
        const percentage = profileData && profileData[key] ? profileData[key] : 'N/A';
        
        const keywordsHtml = (keywords, type) => {
            if (!keywords || !Array.isArray(keywords) || keywords.length === 0) return '';
            const color = type === 'positive' ? 'green' : 'red';
            return keywords.map(kw => 
                `<span class="inline-block bg-${color}-500/20 text-${color}-300 rounded-full px-2 py-1 text-xs font-semibold mr-1 mb-1">#${kw}</span>`
            ).join('');
        };
        
        const cardHtml = `
            <div class="p-3 rounded-lg" style="background-color: var(--input-bg);">
                <h5 class="font-bold text-md text-${config.color}-400 mb-2 flex items-center gap-2">
                    <i class="${config.icon}"></i>
                    ${config.title} (${percentage}%)
                </h5>
                <div class="mb-3">
                    ${keywordsHtml(value.positive_keywords, 'positive')} 
                    ${keywordsHtml(value.negative_keywords, 'negative')}
                </div>
                <div class="space-y-2">
                    <div class="flex items-start gap-2">
                        <i class="fas fa-thumbs-up text-green-400 mt-1 text-xs"></i>
                        <p class="text-xs italic" style="color: var(--text-secondary);">
                            "${value.positive_voice || '긍정적 의견 없음'}"
                        </p>
                    </div>
                    <div class="flex items-start gap-2">
                        <i class="fas fa-thumbs-down text-red-400 mt-1 text-xs"></i>
                        <p class="text-xs italic" style="color: var(--text-secondary);">
                            "${value.negative_voice || '부정적 의견 없음'}"
                        </p>
                    </div>
                </div>
            </div>`;
        dom.keyIssuesContainer.innerHTML += cardHtml;
    }
}

function renderCulturalDynamics(dynamics) {
    dom.culturalDynamicsContainer.innerHTML = `
        <div class="p-4 rounded-lg" style="background-color: var(--input-bg);">
            <p class="text-sm">${dynamics}</p>
        </div>
    `;
}

function renderRecommendations(recommendations) {
    dom.recommendationsContainer.innerHTML = recommendations.map((rec, index) => `
        <div class="p-4 rounded-lg border" style="border-color: var(--input-border);">
            <div class="flex items-start gap-3">
                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold text-sm">
                    ${index + 1}
                </div>
                <div class="flex-1">
                    <h5 class="font-semibold text-lg mb-2 text-sky-400">${rec.title}</h5>
                    <p class="text-sm" style="color: var(--text-secondary);">${rec.description}</p>
                </div>
            </div>
        </div>
    `).join('');
}

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

function updateThemeIcon() {
    const isLight = document.documentElement.classList.contains('light');
    dom.themeIconSun.classList.toggle('hidden', !isLight);
    dom.themeIconMoon.classList.toggle('hidden', isLight);
}

function handleBackToInput() {
    dom.resultDashboard.classList.add('hidden');
    dom.disclaimer.classList.add('hidden');
    dom.backBtn.classList.add('hidden');
    dom.downloadBtn.classList.add('hidden');
    dom.controlPanel.classList.remove('hidden');
}

function handleDownloadReport() {
    if (!lastAnalysisData) {
        alert('다운로드할 분석 결과가 없습니다.');
        return;
    }

    // 차트 이미지 생성
    const canvas = dom.cultureProfileChart;
    const chartImage = canvas.toDataURL('image/png');

    // HTML 리포트 생성
    const reportHTML = generateReportHTML(lastAnalysisData, chartImage);
    
    // 다운로드
    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `조직문화진단보고서_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function generateReportHTML(data, chartImage) {
    // script.js 방식 참고: 현재 페이지의 head 내용을 가져오기
    const pageHead = document.head.innerHTML;
    
    // 현재 결과 대시보드의 내용을 복제
    const reportContainer = document.getElementById('resultDashboard').cloneNode(true);
    
    // 다운로드 버튼 제거 (다운로드된 HTML에서는 불필요)
    const downloadBtnInReport = reportContainer.querySelector('#downloadBtn');
    if (downloadBtnInReport) {
        downloadBtnInReport.remove();
    }
    
    const reportBody = reportContainer.innerHTML;
    
    // 날짜 포맷
    const today = new Date();
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // 헤더 HTML
    const reportHeader = `
        <header class="text-center mb-10 relative">
            <h1 class="text-4xl md:text-5xl font-extrabold" style="color: var(--text-primary);">AI 조직문화 진단 보고서</h1>
            <p class="text-lg mt-3" style="color: var(--text-secondary);">경쟁가치모형(CVF) 기반 분석 결과</p>
            <p class="text-sm mt-2" style="color: var(--text-secondary);">생성일: ${dateString}</p>
        </header>`;
    
    // 푸터 HTML
    const footerHtml = `
        <footer class="text-center mt-10 pt-6 border-t" style="border-color: var(--input-border); color: var(--text-secondary); font-size: 14px;">
            <p>본 보고서는 AI가 직원 의견을 기반으로 생성한 참고 자료입니다.</p>
            <p>실제 조직문화 개선을 위해서는 전문가와의 상담을 권장합니다.</p>
            <p>Copyright &copy; Seyoong Jang, <a href="https://dreamofenc.com" target="_blank" class="hover:underline text-indigo-400">https://dreamofenc.com</a> All right reserved.</p>
            <p class="mt-1">문의/건의사항 : 노무후생그룹 장세융 차장</p>
        </footer>`;

    // 본문 구조 (script.js 방식과 동일)
    const bodyStructure = `
        <div class="container mx-auto p-4 md:p-8" style="max-width: 1584px;">
            ${reportHeader}
            <main id="resultDashboard" class="space-y-8">${reportBody}</main>
            ${footerHtml}
        </div>`;

    // 필수 함수들 (script.js에서 가져온 방식)
    const essentialFunctions = [
        renderDashboard, renderProfileChart, renderOverallSummary, renderKeyIssues, 
        renderCulturalDynamics, renderRecommendations, toggleTheme, updateThemeIcon
    ].map(fn => fn.toString()).join('\n\n');

    // 최종 HTML 생성 (script.js 방식과 동일)
    const finalHtml = `
        <!DOCTYPE html>
        <html lang="ko" class="${document.documentElement.className}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI 조직문화 진단 보고서 - ${dateString}</title>
            ${pageHead}
        </head>
        <body>
            ${bodyStructure}
            <script>
                // <![CDATA[
                let lastAnalysisData = ${JSON.stringify(lastAnalysisData)};
                let cultureChartInstance = null;

                const dom = {
                    resultDashboard: document.getElementById('resultDashboard'),
                    cultureProfileChart: document.getElementById('radarChart'),
                    themeIconSun: document.getElementById('themeIconSun'),
                    themeIconMoon: document.getElementById('themeIconMoon')
                };
                
                ${essentialFunctions}
                
                document.addEventListener('DOMContentLoaded', () => {
                    updateThemeIcon();
                    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
                    
                    // Chart.js가 로드될 때까지 대기
                    const waitForChartJS = () => {
                        if (typeof Chart !== 'undefined') {
                            console.log('Chart.js 로드됨, 차트 렌더링 시작');
                            renderDashboard(lastAnalysisData);
                        } else {
                            console.log('Chart.js 로드 대기 중...');
                            setTimeout(waitForChartJS, 50);
                        }
                    };
                    
                    waitForChartJS();
                });
                // ]]>
            <\/script>
        </body>
        </html>`;
    
    return finalHtml;
} 