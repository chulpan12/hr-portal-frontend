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
    if (cultureChartInstance) {
        cultureChartInstance.destroy();
    }
    
    const labels = ['관계지향 (Clan)', '혁신지향 (Adhocracy)', '과업지향 (Market)', '위계지향 (Hierarchy)'];
    const data = [
        profileData.clan,
        profileData.adhocracy,
        profileData.market,
        profileData.hierarchy
    ];

    const isLight = document.documentElement.classList.contains('light');
    const textColor = isLight ? '#1f2937' : '#f3f4f6';
    const gridColor = isLight ? '#e5e7eb' : '#374151';

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
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                r: {
                    angleLines: { color: gridColor },
                    grid: { color: gridColor },
                    pointLabels: { color: textColor, font: { size: 14 } },
                    ticks: { 
                        backdropColor: 'transparent', 
                        color: textColor, 
                        stepSize: 10,
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    suggestedMin: 0,
                    suggestedMax: Math.max(...data, 40) + 10
                }
            }
        }
    });
}

function renderOverallSummary(summary) {
    dom.overallSummaryContainer.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-4 rounded-lg" style="background-color: var(--input-bg);">
                <h4 class="font-semibold text-sky-400 mb-2">문화적 특징</h4>
                <p class="text-sm">${summary.characteristics}</p>
            </div>
            <div class="p-4 rounded-lg" style="background-color: var(--input-bg);">
                <h4 class="font-semibold text-green-400 mb-2">문화적 강점</h4>
                <p class="text-sm">${summary.strengths}</p>
            </div>
            <div class="p-4 rounded-lg" style="background-color: var(--input-bg);">
                <h4 class="font-semibold text-orange-400 mb-2">개선 과제</h4>
                <p class="text-sm">${summary.challenges}</p>
            </div>
        </div>
    `;
}

function renderKeyIssues(issuesData, profileData) {
    const cultureMap = {
        clan: { title: '관계지향 (Clan)', color: 'green', icon: 'fas fa-heart' },
        adhocracy: { title: '혁신지향 (Adhocracy)', color: 'blue', icon: 'fas fa-lightbulb' },
        market: { title: '과업지향 (Market)', color: 'orange', icon: 'fas fa-chart-line' },
        hierarchy: { title: '위계지향 (Hierarchy)', color: 'gray', icon: 'fas fa-sitemap' }
    };

    dom.keyIssuesContainer.innerHTML = '';

    for (const [key, value] of Object.entries(issuesData)) {
        const config = cultureMap[key];
        const percentage = profileData ? profileData[key] || 0 : 0;
        
        const keywordsHtml = (keywords, type) => {
            if (!keywords || keywords.length === 0) return '';
            const colorClass = type === 'positive' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300';
            return keywords.map(kw => `<span class="inline-block rounded-full px-2 py-1 text-xs font-semibold mr-2 mb-2 ${colorClass}">#${kw}</span>`).join('');
        };

        const cardHtml = `
            <div class="p-4 rounded-lg border" style="border-color: var(--input-border);">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                        <i class="${config.icon} text-${config.color}-400 mr-2"></i>
                        <h4 class="font-bold text-lg text-${config.color}-400">${config.title}</h4>
                    </div>
                    <div class="text-sm font-semibold text-sky-400">${percentage}%</div>
                </div>
                <div class="mb-3">
                    ${keywordsHtml(value.positive_keywords, 'positive')}
                    ${keywordsHtml(value.negative_keywords, 'negative')}
                </div>
                <div class="space-y-2">
                    ${value.positive_voice ? `
                        <div class="p-2 rounded" style="background-color: var(--input-bg);">
                            <p class="text-sm italic text-green-400">"${value.positive_voice}"</p>
                        </div>
                    ` : ''}
                    ${value.negative_voice ? `
                        <div class="p-2 rounded" style="background-color: var(--input-bg);">
                            <p class="text-sm italic text-red-400">"${value.negative_voice}"</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
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
    const cultureNames = {
        clan: '관계지향 (Clan)',
        adhocracy: '혁신지향 (Adhocracy)',
        market: '과업지향 (Market)',
        hierarchy: '위계지향 (Hierarchy)'
    };

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 조직문화 진단 보고서</title>
    <style>
        body { font-family: 'Noto Sans KR', sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #0ea5e9; padding-bottom: 20px; }
        .header h1 { color: #0ea5e9; font-size: 2.5em; margin: 0; }
        .header p { color: #6b7280; font-size: 1.1em; margin: 10px 0 0 0; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #1f2937; border-left: 4px solid #0ea5e9; padding-left: 15px; margin-bottom: 20px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #0ea5e9; }
        .summary-card h3 { color: #0ea5e9; margin: 0 0 10px 0; }
        .chart-container { text-align: center; margin: 30px 0; }
        .chart-container img { max-width: 100%; height: auto; }
        .profile-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
        .profile-item { text-align: center; padding: 15px; background: #f8fafc; border-radius: 8px; }
        .profile-value { font-size: 2em; font-weight: bold; color: #0ea5e9; }
        .profile-label { color: #6b7280; font-size: 0.9em; }
        .recommendation { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0ea5e9; }
        .recommendation h4 { color: #0ea5e9; margin: 0 0 10px 0; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AI 조직문화 진단 보고서</h1>
            <p>경쟁가치모형(CVF) 기반 분석 결과</p>
            <p>생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
        </div>

        <div class="section">
            <h2>종합 진단 브리핑</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>문화적 특징</h3>
                    <p>${data.overall_summary.characteristics}</p>
                </div>
                <div class="summary-card">
                    <h3>문화적 강점</h3>
                    <p>${data.overall_summary.strengths}</p>
                </div>
                <div class="summary-card">
                    <h3>개선 과제</h3>
                    <p>${data.overall_summary.challenges}</p>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>조직문화 프로파일</h2>
            <div class="chart-container">
                <img src="${chartImage}" alt="조직문화 프로파일 차트">
            </div>
            <div class="profile-grid">
                ${Object.entries(data.profile).map(([key, value]) => `
                    <div class="profile-item">
                        <div class="profile-value">${value}%</div>
                        <div class="profile-label">${cultureNames[key]}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="section">
            <h2>문화적 역학 관계 분석</h2>
            <p>${data.cultural_dynamics}</p>
        </div>

        <div class="section">
            <h2>실행 가능한 제언</h2>
            ${data.actionable_recommendations.map((rec, index) => `
                <div class="recommendation">
                    <h4>${index + 1}. ${rec.title}</h4>
                    <p>${rec.description}</p>
                </div>
            `).join('')}
        </div>

        <div class="footer">
            <p>본 보고서는 AI가 직원 의견을 기반으로 생성한 참고 자료입니다.</p>
            <p>실제 조직문화 개선을 위해서는 전문가와의 상담을 권장합니다.</p>
            <p>© 2024 Seyoong Jang. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
} 