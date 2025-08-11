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
    const profile = data.profile || {};
    const issues = data.key_issues || {};
    const summary = data.overall_summary || {};
    const dynamics = data.cultural_dynamics || '';
    const recommendations = data.actionable_recommendations || [];
    
    const cultureMap = {
        clan: { title: '관계지향 (Clan)', color: '#10B981' },
        adhocracy: { title: '혁신지향 (Adhocracy)', color: '#3B82F6' },
        market: { title: '과업지향 (Market)', color: '#EF4444' },
        hierarchy: { title: '위계지향 (Hierarchy)', color: '#8B5CF6' }
    };
    
    const issuesHTML = Object.entries(issues).map(([key, value]) => {
        const config = cultureMap[key];
        const percentage = profile[key] || 'N/A';
        return `
            <div style="background-color: #374151; border: 1px solid #4b5563; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                <h5 style="color: ${config.color}; font-weight: bold; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    <span>${key === 'clan' ? '❤️' : key === 'adhocracy' ? '💡' : key === 'market' ? '📈' : '👤'}</span>
                    ${config.title} (${percentage}%)
                </h5>
                <div style="margin-bottom: 8px;">
                    ${(value.positive_keywords || []).map(kw => `<span style="background-color: #10B98120; color: #10B981; padding: 2px 6px; border-radius: 8px; font-size: 11px; margin-right: 4px; margin-bottom: 4px; display: inline-block;">#${kw}</span>`).join('')}
                    ${(value.negative_keywords || []).map(kw => `<span style="background-color: #EF444420; color: #EF4444; padding: 2px 6px; border-radius: 8px; font-size: 11px; margin-right: 4px; margin-bottom: 4px; display: inline-block;">#${kw}</span>`).join('')}
                </div>
                <div style="font-size: 12px; color: #9ca3af;">
                    <div style="margin-bottom: 4px;">👍 "${value.positive_voice || '긍정적 의견 없음'}"</div>
                    <div>👎 "${value.negative_voice || '부정적 의견 없음'}"</div>
                </div>
            </div>
        `;
    }).join('');
    
    const recommendationsHTML = recommendations.map((rec, index) => `
        <div style="background-color: #374151; border: 1px solid #4b5563; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
                <div style="flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; background-color: #0EA5E9; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">
                    ${index + 1}
                </div>
                <div style="flex: 1;">
                    <h5 style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: #0EA5E9;">${rec.title}</h5>
                    <p style="font-size: 14px; color: #9ca3af; margin: 0;">${rec.description}</p>
                </div>
            </div>
        </div>
    `).join('');
    
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>조직문화 진단 보고서</title>
    <style>
        body { 
            font-family: 'Noto Sans KR', Arial, sans-serif; 
            line-height: 1.6; 
            color: #f3f4f6; 
            background-color: #111827;
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        .header { 
            text-align: center; 
            margin-bottom: 40px; 
            border-bottom: 2px solid #0EA5E9; 
            padding-bottom: 20px; 
        }
        .result-card { 
            background-color: #1f2937;
            border: 1px solid #374151;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 32px;
        }
        .section-title { 
            font-weight: bold; 
            font-size: 20px; 
            margin-bottom: 16px; 
            display: flex; 
            align-items: center; 
            gap: 8px;
            color: #0EA5E9;
        }
        .grid-layout {
            display: grid;
            grid-template-columns: 2fr 3fr;
            gap: 32px;
            margin-bottom: 32px;
        }
        .chart-container { 
            text-align: center; 
            height: 28rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .chart-container img { 
            max-width: 100%; 
            height: auto; 
        }
        .summary-list { 
            display: flex; 
            flex-direction: column; 
            gap: 12px; 
        }
        .summary-item { 
            display: flex; 
            align-items: flex-start; 
            gap: 12px; 
            padding: 12px; 
            background-color: #374151; 
            border-radius: 8px; 
        }
        .summary-item i { 
            margin-top: 2px; 
            font-size: 14px; 
        }
        .summary-item p { 
            margin: 0; 
            color: #d1d5db; 
            font-size: 14px;
        }
        .summary-item strong { 
            color: #f3f4f6; 
        }
        .sub-section {
            margin-bottom: 24px;
        }
        .sub-section-title {
            font-weight: 600;
            font-size: 18px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
            color: #0EA5E9;
        }
        .dynamics-box {
            background-color: #374151;
            padding: 16px;
            border-radius: 8px;
            color: #d1d5db;
            font-size: 14px;
        }
        .footer { 
            text-align: center; 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #374151; 
            color: #9ca3af; 
            font-size: 14px; 
        }
        @media (max-width: 768px) {
            .grid-layout {
                grid-template-columns: 1fr;
                gap: 16px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 style="color: #0EA5E9; font-size: 2.5em; margin-bottom: 10px;">AI 조직문화 진단 보고서</h1>
        <p style="color: #9ca3af; font-size: 1.2em;">경쟁가치모형(CVF) 기반 분석 결과</p>
        <p style="color: #6b7280; font-size: 0.9em;">생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
    </div>

    <!-- 1. 종합 진단 브리핑 -->
    <div class="result-card">
        <h3 class="section-title">
            📊 종합 진단 브리핑 (Executive Summary)
        </h3>
        <div class="summary-list">
            <div class="summary-item">
                <i style="color: #0EA5E9;">🏁</i>
                <p><strong>핵심 특징:</strong> ${summary.characteristics || '분석 중...'}</p>
            </div>
            <div class="summary-item">
                <i style="color: #10B981;">👍</i>
                <p><strong>긍정적 측면:</strong> ${summary.strengths || '분석 중...'}</p>
            </div>
            <div class="summary-item">
                <i style="color: #F59E0B;">⚠️</i>
                <p><strong>개선 필요 영역:</strong> ${summary.challenges || '분석 중...'}</p>
            </div>
        </div>
    </div>

    <!-- 2. 레이더 차트와 핵심 이슈 (그리드 레이아웃) -->
    <div class="grid-layout">
        <!-- 문화 프로파일 (차트) -->
        <div class="result-card">
            <h3 class="section-title">
                📈 조직문화 프로파일
            </h3>
            <div class="chart-container">
                <img src="${chartImage}" alt="조직문화 프로파일 차트">
            </div>
        </div>
        
        <!-- 핵심 이슈 요약 -->
        <div class="result-card">
            <h3 class="section-title">
                ⚠️ 문화 유형별 핵심 이슈
            </h3>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${issuesHTML}
            </div>
        </div>
    </div>

    <!-- 3. 상세 분석 및 제언 -->
    <div class="result-card">
        <h3 class="section-title">
            💡 상세 분석 및 제언
        </h3>
        <div style="display: flex; flex-direction: column; gap: 24px;">
            <div class="sub-section">
                <h4 class="sub-section-title">
                    🔍 문화적 역학 관계 분석
                </h4>
                <div class="dynamics-box">${dynamics}</div>
            </div>
            <div class="sub-section">
                <h4 class="sub-section-title">
                    📋 실행 가능한 제언 (Action Plan)
                </h4>
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    ${recommendationsHTML}
                </div>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>본 보고서는 AI가 직원 의견을 기반으로 생성한 참고 자료입니다.</p>
        <p>실제 조직문화 개선을 위해서는 전문가와의 상담을 권장합니다.</p>
        <p>© Seyoong Jang, https://dreamofenc.com</p>
    </div>
</body>
</html>
    `;
} 