const API_BASE_URL = 'https://api.dreamofenc.com'; // ✨ [수정] 운영 서버 API 주소로 변경
const COMPANIES = ["삼성물산", "현대건설", "DL이앤씨", "GS건설", "대우건설", "현대엔지니어링", "포스코이앤씨", "롯데건설", "SK에코플랜트", "HDC현대산업개발"];
let dynamicRadarChartInstance = null;
let keywordBarChartInstance = null;
let lastAnalysisData = null;

const dom = {
    mainContent: document.getElementById('main-content'),
    loginModal: document.getElementById('login-modal'),
    loginForm: document.getElementById('login-form'),
    loginSubmitBtn: document.getElementById('login-submit-btn'),
    selectAll: document.getElementById('selectAll'),
    companySelector: document.getElementById('company-selector'),
    keywordInput: document.getElementById('keywordInput'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    loader: document.getElementById('loader'),
    loaderText: document.getElementById('loader-text'),
    resultDashboard: document.getElementById('resultDashboard'),
    disclaimer: document.getElementById('disclaimer'),
    marketSummary: document.getElementById('marketSummary'),
    keywordBarChart: document.getElementById('keywordBarChart'),
    competitiveLandscape: document.getElementById('competitiveLandscape'),
    competitiveContent: document.getElementById('competitive-content'),
    companyTabs: document.getElementById('companyTabs'),
    companyContent: document.getElementById('companyContent'),
    themeToggle: document.getElementById('themeToggle'),
    themeIconMoon: document.getElementById('themeIconMoon'), // ✨ [아이콘 복원]
    themeIconSun: document.getElementById('themeIconSun'),   // ✨ [아이콘 복원]
    downloadBtn: document.getElementById('downloadBtn'),
    downloadBtnText: document.getElementById('downloadBtnText'),
    archiveBtn: document.getElementById('archive-btn'),
    archiveModal: document.getElementById('archive-modal'),
    closeArchiveModalBtn: document.getElementById('close-archive-modal'),
    archiveList: document.getElementById('archive-list'),
};

document.addEventListener('DOMContentLoaded', () => {
    const token = sessionStorage.getItem('ai-tool-token'); // ✨ [수정] 토큰 키 통일
    if (!token) {
        dom.mainContent.classList.add('hidden');
        dom.loginModal.classList.remove('hidden');
        dom.loginModal.classList.add('flex');
    } else {
        dom.mainContent.classList.remove('hidden');
        dom.loginModal.classList.add('hidden');
    }
    
    COMPANIES.forEach(company => {
        dom.companySelector.innerHTML += `
            <div class="flex items-center">
                <input id="${company}" type="checkbox" value="${company}" class="custom-checkbox h-4 w-4 rounded text-indigo-500 focus:ring-indigo-500" style="background-color: var(--input-bg); border-color: var(--input-border);">
                <label for="${company}" class="ml-2 text-sm">${company}</label>
            </div>
        `;
    });
    updateThemeIcon();

    dom.analyzeBtn.addEventListener('click', handleAnalysis);
    dom.themeToggle.addEventListener('click', toggleTheme);
    dom.downloadBtn.addEventListener('click', handleDownloadHtml);
    dom.loginForm.addEventListener('submit', handleLogin); // ✨ [추가] 로그인 이벤트 리스너
    dom.selectAll.addEventListener('click', () => {
        const isChecked = dom.selectAll.checked;
        dom.companySelector.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = isChecked);
    });

    // ✨ [추가] 아카이브 모달 이벤트 리스너
    dom.archiveBtn.addEventListener('click', showArchiveModal);
    dom.closeArchiveModalBtn.addEventListener('click', () => dom.archiveModal.classList.add('hidden'));
});

// ✨ [추가] handleLogin 함수 전체 복원
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
        sessionStorage.setItem('ai-tool-token', data.token); // ✨ [수정] 토큰 키 통일
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
    const selectedCompanies = Array.from(dom.companySelector.querySelectorAll('input:checked')).map(cb => cb.value);
    if (selectedCompanies.length === 0) {
        alert('분석할 회사를 하나 이상 선택해주세요.'); return;
    }
    const keyword = dom.keywordInput.value.trim();

    dom.loader.classList.remove('hidden');
    dom.loader.classList.add('flex');
    dom.resultDashboard.classList.add('hidden');
    dom.disclaimer.classList.add('hidden');
    dom.analyzeBtn.disabled = true;
    dom.analyzeBtn.innerHTML = '<span>분석 중...</span>';

    const companyAnalyses = {};
    try {
        for (const [index, company] of selectedCompanies.entries()) {
            dom.loaderText.textContent = `AI가 ${company} 관련 데이터를 분석 중입니다... (${index + 1}/${selectedCompanies.length})`;
            const result = await callCompanyAnalysisAPI(company, keyword);
            if (result) companyAnalyses[company] = result;
        }

        dom.loaderText.textContent = `종합 분석 보고서를 생성 중입니다...`;
        const overallData = await callOverallAnalysisAPI(companyAnalyses);

        const finalData = {
            overall: overallData,
            companies: companyAnalyses,
            keyword: keyword
        };
        lastAnalysisData = finalData;
        renderDashboard(finalData);

        // ✨ [추가] 분석 성공 시 자동으로 아카이브에 저장
        await saveResultToArchive();

    } catch (error) {
        console.error("분석 오류:", error);
        alert(`분석 중 오류가 발생했습니다: ${error.message}`);
    } finally {
        dom.loader.classList.add('hidden');
        dom.loader.classList.remove('flex');
        dom.resultDashboard.classList.remove('hidden');
        dom.disclaimer.classList.remove('hidden');
        dom.analyzeBtn.disabled = false;
        dom.analyzeBtn.innerHTML = `<span>분석 실행</span><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>`;
    }
}

async function callCompanyAnalysisAPI(company, keyword) {
     const apiUrl = `${API_BASE_URL}/api/market/analyze-company`;
     const token = sessionStorage.getItem('ai-tool-token'); // ✨ [수정] 토큰 키 통일
     if (!token) { // ✨ [추가] 토큰 부재 시 에러 처리
         alert('세션이 만료되었습니다. 다시 로그인해주세요.');
         sessionStorage.removeItem('ai-tool-token');
         window.location.reload();
         throw new Error('로그인 토큰이 없습니다.');
     }
     const response = await fetch(apiUrl, {
         method: 'POST',
         headers: { 
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${token}` // ✨ [수정] 헤더에 토큰 추가
         },
         body: JSON.stringify({ company, keyword })
     });
     if (!response.ok) {
         const errorText = await response.text();
         try {
             const errorData = JSON.parse(errorText);
             throw new Error(errorData.error || `[${company}] 분석 중 서버 응답 오류: ${response.status}`);
         } catch {
             throw new Error(`[${company}] 분석 중 서버 응답 오류: ${response.status} - ${errorText}`);
         }
     }
     return await response.json();
}

async function callOverallAnalysisAPI(analyses) {
    const apiUrl = `${API_BASE_URL}/api/market/analyze-overall`;
    const token = sessionStorage.getItem('ai-tool-token'); // ✨ [수정] 토큰 키 통일
     if (!token) { // ✨ [추가] 토큰 부재 시 에러 처리
         alert('세션이 만료되었습니다. 다시 로그인해주세요.');
         sessionStorage.removeItem('ai-tool-token');
         window.location.reload();
         throw new Error('로그인 토큰이 없습니다.');
     }
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // ✨ [수정] 헤더에 토큰 추가
        },
        body: JSON.stringify({ analyses })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({error: `종합 분석 중 서버 응답 오류: ${response.status}`}));
        throw new Error(errorData.error);
    }
    return await response.json();
}

function renderDashboard(data) {
    const isLight = document.documentElement.classList.contains('light');
    const textColor = isLight ? '#1f2937' : '#f3f4f6';
    dom.marketSummary.textContent = data.overall.market_summary || "종합 분석 요약이 없습니다.";

    const keywordsData = data.overall.keywords || [];
    renderKeywordBarChart(keywordsData, textColor, isLight);
    
    const landscapeData = data.overall.competitive_landscape;
    const competitiveContentEl = dom.competitiveContent;
    if (landscapeData && competitiveContentEl) {
        let landscapeHtml = '<div class="space-y-4">';
        if(landscapeData.leader_follower && landscapeData.leader_follower.length > 0){
            landscapeHtml += '<div><h5 class="font-semibold mb-2 text-indigo-400">키워드별 경쟁 현황</h5><ul class="list-disc list-inside space-y-2">';
            landscapeData.leader_follower.forEach(item => {
                landscapeHtml += `<li><strong class="font-medium" style="color:var(--text-primary);">${item.keyword}:</strong> <span style="color:var(--text-secondary);">${item.analysis}</span></li>`;
            });
            landscapeHtml += '</ul></div>';
        }
        if(landscapeData.new_trends && landscapeData.new_trends.length > 0){
            landscapeHtml += '<div><h5 class="font-semibold mb-2 text-indigo-400">주목할 만한 신규 트렌드</h5><ul class="list-disc list-inside space-y-2">';
            landscapeData.new_trends.forEach(item => {
                landscapeHtml += `<li><strong class="font-medium" style="color:var(--text-primary);">${item.trend}:</strong> <span style="color:var(--text-secondary);">${item.analysis}</span></li>`;
            });
            landscapeHtml += '</ul></div>';
        }
        landscapeHtml += '</div>';
        competitiveContentEl.innerHTML = landscapeHtml;
    } else if (competitiveContentEl) {
        competitiveContentEl.innerHTML = '<p style="color:var(--text-secondary);">경쟁 구도 분석 데이터가 없습니다.</p>';
    }
    
    const companyKeys = Object.keys(data.companies);
    if(companyKeys.length === 0) return;
    
    dom.companyTabs.innerHTML = '';
    dom.companyContent.innerHTML = '';
    companyKeys.forEach((company, index) => {
        const tab = document.createElement('button');
        tab.className = `py-2 px-4 text-sm font-medium border-b-2 tab-btn ${index === 0 ? 'active' : 'border-transparent'}`;
        tab.textContent = company;
        tab.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderCompanyContent(data.companies[company]);
        };
        dom.companyTabs.appendChild(tab);
    });
    const firstCompany = companyKeys[0];
    if (firstCompany) {
        renderCompanyContent(data.companies[firstCompany]);
        dom.companyTabs.querySelector('.tab-btn').classList.add('active');
    }
}

function renderCompanyContent(analysis) {
    const swot = analysis.swot || {strengths:[], weaknesses:[], opportunities:[], threats:[]};
    const overallAssessment = analysis.overall_assessment || "종합 평가 정보가 없습니다.";
    const dynamicAssessment = analysis.dynamic_assessment || {dimensions: {}, summary: "동적 평가 정보가 없습니다."};
    const keywordAnalysis = analysis.keyword_analysis;
    const keyArticles = analysis.key_articles || [];
    const sourceArticles = analysis.source_articles || [];
    const financialInfo = analysis.financial_info || {};
    const hrInfo = analysis.hr_info || {};
    const financialTrends = analysis.financial_trends || {};
    const disclosures = analysis.disclosures || [];

    // ✨ [추가] 직원수 증감 렌더링 함수
    const renderYoYEmployeeChange = (change) => {
        if (change === 'N/A' || change === undefined) {
            return renderDataRow('전년 대비 직원 수', 'N/A');
        }
        const changeValue = parseInt(change, 10);
        const color = changeValue > 0 ? 'text-blue-400' : (changeValue < 0 ? 'text-red-400' : 'text-gray-400');
        const icon = changeValue > 0 ? '▲' : (changeValue < 0 ? '▼' : '▬');
        const formattedChange = `${icon} ${new Intl.NumberFormat().format(Math.abs(changeValue))}명`;
        
        // ✨ [수정] 다른 항목과 자연스럽게 어울리도록 스타일 변경
        return renderDataRow('전년 대비 직원 수', formattedChange, null, color);
    };

    const finHrTrendHtml = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            <div class="result-card p-6 rounded-xl flex flex-col">
                <h4 class="font-bold text-lg mb-4">주요 재무 지표 (전년도 기준)</h4>
                <div class="space-y-3 flex-grow">
                    ${renderDataRow('매출액', formatNumber(financialInfo['매출액'], '억'))}
                    ${renderDataRow('영업이익', formatNumber(financialInfo['영업이익'], '억'))}
                    ${renderDataRow('당기순이익', formatNumber(financialInfo['당기순이익'], '억'))}
                    ${renderDataRow('영업이익률', financialInfo['영업이익률'] || 'N/A')}
                    ${renderDataRow('자산총계', formatNumber(financialInfo['자산총계'], '억'))}
                    ${renderDataRow('부채비율', formatNumber(financialInfo['부채비율'], '%'))}
                </div>
            </div>
            <div class="result-card p-6 rounded-xl flex flex-col">
                <h4 class="font-bold text-lg mb-4">임직원 현황 (전년도 기준)</h4>
                <div class="space-y-4 flex-grow">
                    ${renderDataRow('총 임직원 수', formatNumber(hrInfo['총 임직원 수'], '명'))}
                    ${renderEmployeeRatio(hrInfo)}
                    ${renderDataRow('평균 근속 연수', formatNumber(hrInfo['평균 근속 연수'], '년'))}
                    ${renderDataRow('1인 평균 급여액', formatNumber(hrInfo['1인 평균 급여액'], '백만원'), hrInfo['급여정보_부분공개'] ? '급여 비공개 부문 제외' : null)}
                    ${renderYoYEmployeeChange(hrInfo['직원 수 증감'])}
                </div>
            </div>
            <div class="result-card p-6 rounded-xl">
                <h4 class="font-bold text-lg mb-4">3개년 재무 추이</h4>
                 <div class="h-64"><canvas id="financialTrendChart"></canvas></div>
            </div>
        </div>
    `;

    const keyArticleLinks = new Set(keyArticles.map(a => a.link));
    const otherArticles = sourceArticles.filter(a => !keyArticleLinks.has(a.link));

    let articlesHtml = '';
    if (keyArticles.length > 0) {
        articlesHtml += `<h5 class="font-semibold mb-3 text-indigo-400">AI가 선별한 핵심 기사/공시</h5>`;
        articlesHtml += `<div class="space-y-4">${keyArticles.map(a => createArticleHtml(a, true)).join('')}</div>`;
    }

    if (otherArticles.length > 0) {
        articlesHtml += `<div id="other-articles" class="hidden mt-4 space-y-4">${otherArticles.map(a => createArticleHtml(a, false)).join('')}</div>`;
        articlesHtml += `<div class="mt-4 text-center"><button id="show-more-btn" class="show-more-btn w-full py-2 px-4 rounded-lg text-sm font-medium">참고 기사 더보기 (${otherArticles.length}건)</button></div>`;
    } else if (keyArticles.length === 0 && disclosures.length === 0) {
        articlesHtml = `<p style="color: var(--text-secondary);">참고 자료를 찾을 수 없습니다.</p>`
    }
    
    let disclosuresHtml = '';
    if (disclosures && disclosures.length > 0) {
        disclosuresHtml = `
            <div class="result-card p-6 rounded-xl">
                <h4 class="font-bold text-lg mb-2">최근 주요 공시</h4>
                <div class="space-y-3">
                    ${disclosures.map(d => `
                        <div class="border-l-2 pl-3" style="border-color: var(--input-border);">
                             <a href="${d.url}" target="_blank" class="font-semibold text-sm text-indigo-400 hover:underline">${d.title}</a>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    let keywordAnalysisHtml = '';
    if (keywordAnalysis && keywordAnalysis.summary !== 'N/A') {
        const analysisKeyword = (lastAnalysisData && lastAnalysisData.keyword) ? lastAnalysisData.keyword : '';
        keywordAnalysisHtml = `
            <div class="result-card p-6 rounded-xl">
                <h4 class="font-bold text-lg mb-4">심층 키워드 분석: "${analysisKeyword}"</h4>
                <p class="text-sm mb-4" style="color: var(--text-secondary);">${keywordAnalysis.summary}</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h5 class="font-semibold mb-2 text-green-400">기회 요인</h5>
                        <ul class="list-disc list-inside text-sm space-y-1" style="color: var(--text-secondary);">${(keywordAnalysis.opportunities || []).map(i => `<li>${i}</li>`).join('')}</ul>
                    </div>
                    <div>
                        <h5 class="font-semibold mb-2 text-red-400">위협 요인</h5>
                        <ul class="list-disc list-inside text-sm space-y-1" style="color: var(--text-secondary);">${(keywordAnalysis.threats || []).map(i => `<li>${i}</li>`).join('')}</ul>
                    </div>
                </div>
            </div>`;
    }

    dom.companyContent.innerHTML = `
        <div class="space-y-8">
            <div class="result-card p-6 rounded-xl">
                <h4 class="font-bold text-lg mb-2">AI 종합 평가</h4>
                <p class="text-sm" style="color: var(--text-secondary);">${overallAssessment}</p>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                <div class="result-card p-6 rounded-xl dynamic-assessment-container">
                    <h4 class="font-bold text-lg mb-2">동적 역량 평가</h4>
                    <div class="h-80"><canvas id="dynamicRadarChart"></canvas></div>
                     <p class="text-xs text-center mt-2" style="color: var(--text-secondary);">${dynamicAssessment.summary}</p>
                </div>
                <div class="swot-grid-container">
                    ${renderSwotCard('강점', swot.strengths, 'bg-green-500/20')}
                    ${renderSwotCard('약점', swot.weaknesses, 'bg-red-500/20')}
                    ${renderSwotCard('기회', swot.opportunities, 'bg-blue-500/20')}
                    ${renderSwotCard('위협', swot.threats, 'bg-yellow-500/20')}
                </div>
            </div>
            ${finHrTrendHtml}
            ${keywordAnalysisHtml}
            <div class="result-card p-6 rounded-xl">
                <h4 class="font-bold text-lg mb-2">분석 근거 자료 (뉴스)</h4>
                ${articlesHtml}
            </div>
            ${disclosuresHtml}
        </div>`;
    
    renderDynamicChart(dynamicAssessment.dimensions);
    renderFinancialTrendChart(financialTrends); // ✨ [2단계] 재무 추이 차트 렌더링 함수 호출

    const showMoreBtn = document.getElementById('show-more-btn');
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', () => {
            document.getElementById('other-articles').classList.remove('hidden');
            showMoreBtn.style.display = 'none';
        });
    }
}

function renderDynamicChart(dimensions) {
    if (dynamicRadarChartInstance) {
        dynamicRadarChartInstance.destroy();
    }
    const chartCanvas = document.getElementById('dynamicRadarChart');
    if (!chartCanvas) return;

    const labels = Object.keys(dimensions);
    const data = Object.values(dimensions);
    const isLight = document.documentElement.classList.contains('light');
    const textColor = isLight ? '#1f2937' : '#f3f4f6';
    const gridColor = isLight ? '#e5e7eb' : '#374151';

    dynamicRadarChartInstance = new Chart(chartCanvas, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(99, 102, 241, 1)'
            }]
        },
        options: {
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                r: {
                    angleLines: { color: gridColor },
                    grid: { color: gridColor },
                    pointLabels: { color: textColor, font: { size: 12 } },
                    ticks: { backdropColor: 'transparent', color: textColor, stepSize: 1 },
                    min: 0, max: 5
                }
            }
        }
    });
}

let financialTrendChartInstance = null;
// ✨ [추가] 범례와 차트 영역 사이에 여백을 추가하는 커스텀 플러그인
const legendMarginPlugin = {
    id: 'legendMargin',
    beforeInit: function (chart) {
        if (chart.legend.options.display === false) {
            return;
        }
        const originalFit = chart.legend.fit;
        chart.legend.fit = function () {
            originalFit.bind(chart.legend)();
            this.height += 20; // 범례 아래에 20px의 여백을 추가합니다.
        }
    }
};

function renderFinancialTrendChart(trends) {
    if (financialTrendChartInstance) {
        financialTrendChartInstance.destroy();
    }
    const chartCanvas = document.getElementById('financialTrendChart');
    if (!chartCanvas || !trends || Object.keys(trends).length === 0) return;

    const sortedYears = Object.keys(trends).sort();
    const isLight = document.documentElement.classList.contains('light');
    const textColor = isLight ? '#1f2937' : '#f3f4f6';
    const gridColor = isLight ? '#e5e7eb' : '#374151';

    const revenueData = sortedYears.map(year => Math.round(trends[year]['매출액'] / 100000000));
    const operatingProfitData = sortedYears.map(year => Math.round(trends[year]['영업이익'] / 100000000));
    const profitMarginData = sortedYears.map(year => {
        const revenue = trends[year]['매출액'];
        const op = trends[year]['영업이익'];
        const margin = revenue > 0 ? ((op / revenue) * 100) : 0;
        return parseFloat(margin.toFixed(2)); // ✨ [수정] 숫자로 변환
    });

    // ✨ [추가] yLine 축 범위 동적 계산
    const maxMargin = Math.max(...profitMarginData, 0);
    const minMargin = Math.min(...profitMarginData, 0);

    const suggestedMax = Math.max(Math.ceil(maxMargin * 1.8), 5); // 최소 5%는 보이도록, 1.8배로 여유분 확보
    const suggestedMin = minMargin < 0 ? Math.floor(minMargin * 1.2) : 0; // 음수일 경우 아래 여유분 확보

    financialTrendChartInstance = new Chart(chartCanvas, {
        type: 'bar',
        plugins: [ChartDataLabels, legendMarginPlugin], // ✨ [수정] 커스텀 플러그인 추가
        data: {
            labels: sortedYears,
            datasets: [
                {
                    label: '매출액 (억 원)',
                    data: revenueData,
                    backgroundColor: 'rgba(99, 102, 241, 0.6)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    yAxisID: 'yBar',
                    order: 1 // ✨ [수정] 렌더링 순서 지정
                },
                {
                    label: '영업이익 (억 원)',
                    data: operatingProfitData,
                    backgroundColor: 'rgba(239, 68, 68, 0.6)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    yAxisID: 'yBar',
                    order: 2 // ✨ [수정] 렌더링 순서 지정
                },
                {
                    label: '영업이익률 (%)',
                    data: profitMarginData,
                    type: 'line',
                    borderColor: 'rgba(251, 191, 36, 1)',
                    backgroundColor: 'rgba(251, 191, 36, 0.2)',
                    fill: false,
                    yAxisID: 'yLine',
                    tension: 0.1,
                    order: 0 // ✨ [수정] 렌더링 순서 지정 (가장 위)
                }
            ]
        },
        options: {
            maintainAspectRatio: false,
            // ✨ [수정] layout padding 제거, 플러그인으로 간격 제어
            plugins: {
                legend: { 
                    position: 'top',
                    align: 'end',
                    labels: { 
                        color: textColor,
                        usePointStyle: true,
                    } 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                if (context.dataset.yAxisID === 'yLine') {
                                    label += context.parsed.y + ' %';
                                } else {
                                    label += new Intl.NumberFormat('ko-KR').format(context.parsed.y) + ' 억';
                                }
                            }
                            return label;
                        }
                    }
                },
                datalabels: {
                    color: textColor,
                    anchor: 'end',
                    align: 'end',
                    formatter: function(value, context) {
                        const datasetLabel = context.dataset.label;
                        if (datasetLabel.includes('%')) {
                            // ✨ [수정] 꺾은선 그래프 레이블 스타일링
                            return value + '%';
                        }
                        // 억 단위로 포맷팅
                        return new Intl.NumberFormat('ko-KR').format(value);
                    },
                    font: function(context) {
                        if (context.dataset.type === 'line') return { weight: 'bold', size: 12 };
                        // ✨ [수정] 막대그래프 레이블 폰트 크기 증가
                        return { size: 11, weight: '500' };
                    },
                    color: function(context) {
                         return context.dataset.type === 'line' ? 'rgba(251, 191, 36, 1)' : textColor;
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor },
                    grid: { color: 'transparent' }
                },
                yBar: {
                    type: 'linear',
                    position: 'left',
                    ticks: { color: textColor, callback: (value) => `${value / 10000}조` },
                    grid: { color: gridColor },
                    title: { display: true, text: '금액 (조 원)', color: textColor },
                },
                yLine: {
                    position: 'right',
                    ticks: { color: textColor, callback: (value) => `${value}%` },
                    grid: { display: false },
                    title: { display: true, text: '영업이익률 (%)', color: textColor },
                    suggestedMax: suggestedMax, // ✨ [추가] 계산된 최대값 제안
                    suggestedMin: suggestedMin, // ✨ [추가] 계산된 최소값 제안
                }
            }
        }
    });
}


function renderSwotCard(title, items, bgColor) { return `<div class="result-card p-4 rounded-lg ${bgColor}"><h5 class="font-bold mb-2">${title}</h5><ul class="list-disc list-inside text-xs space-y-1" style="color: var(--text-secondary);">${(items || []).map(i => `<li>${i}</li>`).join('')}</ul></div>`; }

function renderDataRow(label, value, note = null, valueColor = null) {
    const noteHtml = note ? `<span class="text-xs text-yellow-400/80 ml-2">(${note})</span>` : '';
    const valueClass = valueColor ? `class="${valueColor}"` : ''; // ✨ [추가] 값에 색상 적용
    return `
        <div class="flex justify-between items-baseline">
            <span class="text-sm font-medium" style="color: var(--text-secondary);">${label}${noteHtml}</span>
            <span class="text-lg font-bold" ${valueClass}>${value}</span>
        </div>
    `;
}

function renderEmployeeRatio(hrInfo) {
    const permanent = hrInfo['정규직 수'] || 0;
    const contract = hrInfo['계약직 수'] || 0;
    const total = permanent + contract;

    if (total === 0) return '';

    const permanentPercent = Math.round((permanent / total) * 100);
    const contractPercent = 100 - permanentPercent;

    return `
        <div>
            <div class="flex justify-between text-xs font-medium mb-1">
                <span style="color: var(--text-secondary);">정규직 (${permanent.toLocaleString()}명)</span>
                <span style="color: var(--text-secondary);">계약직 (${contract.toLocaleString()}명)</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div class="bg-indigo-500 h-2.5 rounded-l-full" style="width: ${permanentPercent}%"></div>
            </div>
             <div class="flex justify-between text-xs font-medium mt-1">
                <span class="text-indigo-400">${permanentPercent}%</span>
                <span class="text-gray-400">${contractPercent}%</span>
            </div>
        </div>
    `;
}


// ✨ [추가] 아카이브 관련 함수들
async function saveResultToArchive() {
    if (!lastAnalysisData) return;

    console.log("분석 결과 자동 저장을 시작합니다...");
    try {
        const htmlContent = await generateReportHtml(); // handleDownloadHtml 로직 재활용
        
        const today = new Date();
        const dateString = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        const companiesString = Object.keys(lastAnalysisData.companies).join('_');
        const keywordString = lastAnalysisData.keyword ? `_${lastAnalysisData.keyword}` : '';
        const filename = `${dateString}-${companiesString}${keywordString}.html`;

        const token = sessionStorage.getItem('ai-tool-token');
        const response = await fetch(`${API_BASE_URL}/api/market/archives`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ filename, html_content: htmlContent })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '아카이브 저장에 실패했습니다.');
        }
        console.log("분석 결과가 성공적으로 서버에 저장되었습니다.");

    } catch (error) {
        console.error("아카이브 저장 중 오류:", error);
        // 사용자에게 오류를 알리지 않고 콘솔에만 기록 (백그라운드 작업이므로)
    }
}

async function showArchiveModal() {
    dom.archiveModal.classList.remove('hidden');
    dom.archiveList.innerHTML = '<p>목록을 불러오는 중...</p>';

    try {
        const token = sessionStorage.getItem('ai-tool-token');
        const response = await fetch(`${API_BASE_URL}/api/market/archives`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '목록 로딩에 실패했습니다.');
        }

        const files = await response.json();
        if (files.length === 0) {
            dom.archiveList.innerHTML = '<p>저장된 분석 기록이 없습니다.</p>';
            return;
        }

        const listHtml = files.map(file => {
            const parts = file.replace('.html', '').split('-');
            const date = parts[0];
            const companyAndKeyword = parts.slice(1).join('-');
            const formattedDate = `${date.substring(0,4)}-${date.substring(4,6)}-${date.substring(6,8)}`;

            // ✨ [수정] 보기/다운로드 버튼을 포함한 레이아웃으로 변경
            return `
                <div class="flex justify-between items-center p-3 rounded-lg hover:bg-gray-700/50 transition-colors duration-200">
                    <a href="${API_BASE_URL}/api/market/archives/${file}" target="_blank" class="flex-grow">
                        <p class="font-semibold text-indigo-400">${companyAndKeyword}</p>
                        <p class="text-sm text-gray-400">${formattedDate} 분석</p>
                    </a>
                    <a href="${API_BASE_URL}/api/market/archives/${file}" download="${file}" class="ml-4 p-2 text-gray-400 hover:text-white transition-colors duration-200" title="HTML 파일 다운로드" onclick="event.stopPropagation();">
                        <i class="fas fa-download"></i>
                    </a>
                </div>
            `;
        }).join('');

        dom.archiveList.innerHTML = `<div class="space-y-2">${listHtml}</div>`;

    } catch (error) {
        dom.archiveList.innerHTML = `<p class="text-red-400">오류: ${error.message}</p>`;
    }
}

// `handleDownloadHtml` 함수를 `generateReportHtml` 헬퍼 함수로 분리하여 재활용
async function generateReportHtml() {
    // 기존 handleDownloadHtml 함수의 HTML 생성 로직을 그대로 가져옵니다.
    const pageHead = document.head.innerHTML;
    const today = new Date();
    const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // 1. 보고서 본문 구성: 현재 대시보드를 복제한 후 다운로드 버튼만 제거
    const reportContainer = document.getElementById('resultDashboard').cloneNode(true);
    const downloadBtnInReport = reportContainer.querySelector('#downloadBtn');
    if (downloadBtnInReport) {
        downloadBtnInReport.remove();
    }
    const reportBody = reportContainer.innerHTML;


    // 2. 보고서 전체 구조 생성
    // ✨ [수정] 보고서 헤더에 테마 토글 버튼 추가
    const reportHeader = `
        <header class="text-center mb-10 relative">
            <h1 class="text-4xl md:text-5xl font-extrabold" style="color: var(--text-primary);">경쟁사 동향 분석 보고서</h1>
            <p class="text-lg mt-3" style="color: var(--text-secondary);">${dateString}</p>
            <div class="absolute top-0 right-0">
                <button id="themeToggle" class="p-2 rounded-full transition" style="background-color: var(--input-bg);">
                    <svg id="themeIconSun" class="w-6 h-6 hidden" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 16.464A1 1 0 106.465 15.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm-1.414-2.12a1 1 0 010-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z"></path></svg>
                    <svg id="themeIconMoon" class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
                </button>
            </div>
        </header>`;
    
    const footerHtml = document.querySelector('footer').outerHTML;

    const bodyStructure = `
        <div class="container mx-auto p-4 md:p-8">
            ${reportHeader}
            <main id="resultDashboard" class="space-y-8">${reportBody}</main>
            ${footerHtml}
        </div>`;

    // 3. 실행에 필요한 모든 JS 함수와 플러그인을 문자열로 추출
    const legendMarginPluginString = legendMarginPlugin.toString();

    const essentialFunctions = [
        renderDashboard, renderCompanyContent, renderKeywordBarChart, renderDynamicChart, 
        renderFinancialTrendChart, renderSwotCard, createArticleHtml, formatNumber,
        renderEmployeeRatio, renderDataRow, toggleTheme, updateThemeIcon // ✨ [추가] 테마 변경 함수
    ].map(fn => fn.toString()).join('\n\n');

    const finalHtml = `
        <!DOCTYPE html>
        <html lang="ko" class="${document.documentElement.className}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>경쟁사 동향 분석 보고서 - ${dateString}</title>
            ${pageHead}
        </head>
        <body>
            ${bodyStructure}
            <script>
                // <![CDATA[
                let lastAnalysisData = ${JSON.stringify(lastAnalysisData)};
                let dynamicRadarChartInstance = null;
                let keywordBarChartInstance = null;
                let financialTrendChartInstance = null;

                // ✨ [수정] 다운로드된 파일에 legendMarginPlugin 정의 추가
                const legendMarginPlugin = {
                    id: 'legendMargin',
                    beforeInit: function (chart) {
                        if (chart.legend.options.display === false) { return; }
                        const originalFit = chart.legend.fit;
                        chart.legend.fit = function () {
                            originalFit.bind(chart.legend)();
                            this.height += 20;
                        }
                    }
                };

                // ✨ [수정] 보고서 내에서 사용할 dom 객체 확장
                const dom = {
                    marketSummary: document.getElementById('marketSummary'),
                    keywordBarChart: document.getElementById('keywordBarChart'),
                    competitiveContent: document.getElementById('competitive-content'),
                    companyTabs: document.getElementById('companyTabs'),
                    companyContent: document.getElementById('companyContent'),
                    resultDashboard: document.getElementById('resultDashboard'),
                    themeIconSun: document.getElementById('themeIconSun'),
                    themeIconMoon: document.getElementById('themeIconMoon')
                };
                
                ${essentialFunctions}
                
                document.addEventListener('DOMContentLoaded', () => {
                    // 테마 설정 및 아이콘 초기화
                    updateThemeIcon();
                    
                    // 테마 토글 버튼 이벤트 연결
                    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

                    // 대시보드 렌더링
                    renderDashboard(lastAnalysisData);
                    
                    // 탭 클릭 이벤트 재연결
                    document.querySelectorAll('.tab-btn').forEach(tab => {
                        tab.addEventListener('click', () => {
                            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
                            tab.classList.add('active');
                            const companyName = tab.textContent;
                            renderCompanyContent(lastAnalysisData.companies[companyName]);
                        });
                    });
                });
                // ]]>
            <\/script>
        </body>
        </html>`;
    return finalHtml;
}

async function handleDownloadHtml() {
    if (!lastAnalysisData) {
        alert('먼저 분석을 실행해주세요.');
        return;
    }
    const btn = dom.downloadBtn;
    const btnText = dom.downloadBtnText;
    btn.disabled = true;
    btnText.textContent = '생성 중...';

    try {
        const htmlContent = await generateReportHtml();
        const today = new Date();
        const downloadDateString = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
        const filename = `경쟁사_동향_분석_보고서_${downloadDateString}.html`;

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
        btnText.textContent = 'HTML로 저장';
    }
}

function renderKeywordBarChart(keywords, textColor, isLight) {
    if (keywordBarChartInstance) {
        keywordBarChartInstance.destroy();
    }
    const chartCanvas = dom.keywordBarChart;
    if (!chartCanvas || !keywords || keywords.length === 0) {
        // 차트가 없을 경우 캔버스를 숨길 수 있습니다.
        chartCanvas.style.display = 'none';
        return;
    }
    chartCanvas.style.display = 'block';

    const labels = keywords.map(k => k.keyword);
    const data = keywords.map(k => k.weight);
    const gridColor = isLight ? '#e5e7eb' : '#374151';

    keywordBarChartInstance = new Chart(chartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '중요도',
                data: data,
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: textColor // 범례 텍스트 색상
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor } // X축 눈금 색상
                },
                y: {
                    grid: { color: 'transparent' },
                    ticks: { color: textColor } // Y축 레이블(키워드) 색상
                }
            }
        }
    });
}

function toggleTheme() { 
    document.documentElement.classList.toggle('dark');
    document.documentElement.classList.toggle('light');
    updateThemeIcon();
    if (lastAnalysisData && !dom.resultDashboard.classList.contains('hidden')) {
        renderDashboard(lastAnalysisData);
    }
}

function updateThemeIcon() {
    const isDarkMode = document.documentElement.classList.contains('dark');
    dom.themeIconSun.style.display = isDarkMode ? 'block' : 'none';
    dom.themeIconMoon.style.display = isDarkMode ? 'none' : 'block';
}

function formatNumber(num, unit) {
    if (num === null || num === undefined || num === "N/A" || isNaN(Number(num))) {
        return `<span class="text-gray-500">N/A</span>`;
    }
    let value;
    let finalUnit = unit;
    if (unit === '억') {
        value = Math.round(num / 100000000);
    } else if (unit === '백만원') {
        value = Math.round(num / 1000000);
    } else {
        value = num;
    }
    
    let formattedValue = new Intl.NumberFormat('ko-KR').format(value);
    return `${formattedValue} <span class="text-xs" style="color: var(--text-secondary);">${finalUnit}</span>`;
}

function createArticleHtml(article, isKeyArticle) {
    const content = isKeyArticle ? article.summary : article.content;
    
    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString; 
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}.${month}.${day}`;
        } catch (e) {
            return dateString;
        }
    };

    const formattedDate = formatDate(article.pubDate);
    const dateHtml = formattedDate ? `<span class="text-xs ml-2" style="color: var(--text-secondary);">(${formattedDate})</span>` : '';

    return `
        <div class="border-l-2 pl-3" style="border-color: var(--input-border);">
            <div class="flex items-center">
                <a href="${article.link}" target="_blank" class="font-semibold text-sm text-indigo-400 hover:underline">${article.title}</a>
                ${dateHtml}
            </div>
            <p class="text-xs mt-1" style="color: var(--text-secondary);">${content}</p>
        </div>`;
} 