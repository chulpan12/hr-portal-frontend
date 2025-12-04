/**
 * ============================================================
 * Dream of ENC - Copyright & License Module
 * ============================================================
 * Copyright (c) 2025 Dream of ENC, Seyoong Jang.
 * All Rights Reserved.
 * ============================================================
 */

// 콘솔 경고 표시
function showConsoleWarning() {
  console.log(
    "%c🛑 Stop!",
    "color: red; font-size: 30px; font-weight: bold;"
  );
  console.log(
    "%c이 코드는 Dream of ENC의 지적 재산입니다.\n무단 분석이나 로직 도용 시 법적 책임을 물을 수 있습니다.\n교육적 목적으로만 즐겨주세요.",
    "font-size: 14px; line-height: 1.6; color: #94a3b8;"
  );
}

// 저작권 시그니처
const _AUTHOR_DREAM_OF_ENC = true;
const _PROJECT_SIGNATURE = 'DREAM_OF_ENC_2025_POSCO';

// 라이선스 모달 HTML 생성
function createLicenseModal() {
  const modalHTML = `
  <div id="license-modal" class="hidden fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-modal-appear">
      <!-- 헤더 -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-800/50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
          </div>
          <div>
            <h2 class="text-lg font-bold text-white">Terms of Service</h2>
            <p class="text-xs text-gray-400">저작권 및 이용 안내</p>
          </div>
        </div>
        <button id="close-license-btn" class="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      
      <!-- 본문 -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-gray-300">
        <!-- 1. 저작권 귀속 -->
        <div class="space-y-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-cyan-400">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm0-10a1 1 0 011 1v3.586l2.207 2.207a1 1 0 01-1.414 1.414l-2.5-2.5A1 1 0 019 11V7a1 1 0 011-1z" clip-rule="evenodd"></path></svg>
            1. 저작권 귀속 (Copyright Ownership)
          </h3>
          <ul class="space-y-2 ml-6 list-disc text-gray-400">
            <li>본 웹사이트의 모든 소스 코드, UI/UX 디자인, 기획 아이디어는 <strong class="text-cyan-300">Dream of ENC, Seyoong Jang</strong>에 저작권이 있습니다.</li>
            <li>AI 기반 분석 도구들의 프롬프트 설계, 로직 구조, 사용자 인터페이스는 본 프로젝트의 고유 자산이므로 <span class="text-red-400 font-medium">무단 복제 및 도용을 엄격히 금지</span>합니다.</li>
          </ul>
        </div>
        
        <!-- 2. 이용 범위 -->
        <div class="space-y-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-green-400">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"></path></svg>
            2. 이용 범위 (Usage Scope)
          </h3>
          <ul class="space-y-2 ml-6 list-disc text-gray-400">
            <li>본 서비스는 <strong class="text-white">비영리적 교육 및 개인 학습 목적</strong>으로만 공개되었습니다.</li>
            <li>사전 승인 없는 영리 목적의 사용, 서비스의 복제(Cloning), 리버스 엔지니어링을 <span class="text-red-400">불허</span>합니다.</li>
            <li class="text-gray-500">(포스코이앤씨 임직원의 경우, 사내 학습용으로 자유롭게 이용 가능합니다.)</li>
          </ul>
        </div>
        
        <!-- 3. AI 면책 -->
        <div class="space-y-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-amber-400">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"></path></svg>
            3. AI 생성 콘텐츠에 대한 면책 (Disclaimer)
          </h3>
          <ul class="space-y-2 ml-6 list-disc text-gray-400">
            <li>본 서비스는 <strong class="text-cyan-300">Google Gemini API</strong>를 활용하여 실시간으로 분석 결과를 생성합니다.</li>
            <li>AI가 생성한 분석 결과의 정확성을 100% 보장하지 않으며, 이를 실무에 적용하여 발생한 문제에 대해 운영자는 책임을 지지 않습니다.</li>
          </ul>
        </div>
        
        <!-- 4. 연락처 -->
        <div class="space-y-3">
          <h3 class="flex items-center gap-2 text-base font-bold text-gray-300">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path></svg>
            4. 연락처 (Contact)
          </h3>
          <p class="ml-6 text-gray-400">
            제휴 및 기술 문의: <a href="mailto:dreamofenc@gmail.com" class="text-cyan-400 hover:underline">dreamofenc@gmail.com</a>
          </p>
        </div>
        
        <!-- 크레딧 배지 -->
        <div class="mt-8 pt-6 border-t border-gray-700">
          <div class="flex flex-wrap items-center justify-center gap-3">
            <span class="px-3 py-1.5 bg-gray-800 rounded-full text-xs flex items-center gap-2">
              <svg class="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Gemini API
            </span>
            <span class="px-3 py-1.5 bg-gray-800 rounded-full text-xs flex items-center gap-2">
              <svg class="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd"></path></svg>
              Tailwind CSS
            </span>
            <span class="px-3 py-1.5 bg-gray-800 rounded-full text-xs flex items-center gap-2">
              <svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
              Chart.js
            </span>
          </div>
        </div>
      </div>
      
      <!-- 푸터 -->
      <div class="px-6 py-4 border-t border-gray-700 bg-gray-800/50">
        <div class="flex items-center justify-between">
          <p class="text-xs text-gray-500">
            © 2025 Dream of ENC, Seyoong Jang. All Rights Reserved.
          </p>
          <button onclick="closeLicenseModal()" 
                  class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg transition-colors">
            확인
          </button>
        </div>
      </div>
    </div>
  </div>
  `;
  
  // body에 모달 추가
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 저작권 푸터 HTML 생성
function createCopyrightFooter(containerId) {
  const footerHTML = `
  <footer class="text-center text-xs py-4 mt-8 border-t" style="color: var(--text-secondary, #9ca3af); border-color: var(--border-color, #374151);">
    <p>
      © 2025 <strong style="color: var(--text-primary, #f3f4f6);">Dream of ENC</strong>, Seyoong Jang. All Rights Reserved.
      <span class="mx-2">|</span>
      Powered by <span class="text-cyan-500">Gemini API</span>
      <span class="mx-2">|</span>
      <a href="javascript:openLicenseModal()" class="hover:text-cyan-400 underline underline-offset-2">Terms of Service</a>
    </p>
  </footer>
  `;
  
  const container = document.getElementById(containerId) || document.querySelector('.container');
  if (container) {
    container.insertAdjacentHTML('beforeend', footerHTML);
  }
}

// 헤더에 저작권 배지 추가
function addCopyrightBadge(headerSelector) {
  const header = document.querySelector(headerSelector);
  if (!header) return;
  
  const badgeHTML = `
  <div class="copyright-badge hidden md:inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full mt-2" 
       style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color, #374151); color: var(--text-secondary, #9ca3af);">
    <span>© <strong style="color: var(--text-primary, #f3f4f6);">Dream of ENC</strong></span>
    <span style="color: var(--border-color, #374151);">|</span>
    <button onclick="openLicenseModal()" class="hover:text-cyan-400 underline underline-offset-2 transition-colors">License</button>
  </div>
  `;
  
  header.insertAdjacentHTML('beforeend', badgeHTML);
}

// 모달 열기/닫기 함수
function openLicenseModal() {
  const modal = document.getElementById('license-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function closeLicenseModal() {
  const modal = document.getElementById('license-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// 이벤트 리스너 설정
function setupLicenseModalEvents() {
  const modal = document.getElementById('license-modal');
  const closeBtn = document.getElementById('close-license-btn');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeLicenseModal);
  }
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'license-modal') {
        closeLicenseModal();
      }
    });
  }
  
  // ESC 키로 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      closeLicenseModal();
    }
  });
}

// 초기화 함수
function initCopyright(options = {}) {
  const {
    showConsole = true,
    showModal = true,
    showFooter = true,
    footerContainerId = null,
    headerSelector = 'header'
  } = options;
  
  if (showConsole) {
    showConsoleWarning();
  }
  
  if (showModal) {
    createLicenseModal();
    setupLicenseModalEvents();
  }
  
  if (showFooter) {
    createCopyrightFooter(footerContainerId);
  }
}

// 전역 함수 노출
window.openLicenseModal = openLicenseModal;
window.closeLicenseModal = closeLicenseModal;
window.initCopyright = initCopyright;

// DOM 로드 후 자동 초기화 (필요시)
// document.addEventListener('DOMContentLoaded', () => initCopyright());
