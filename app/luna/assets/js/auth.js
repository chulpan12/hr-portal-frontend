/**
 * ============================================================
 * AI Coding Tutor - Authentication Module
 * ============================================================
 * 로그인, 로그아웃, 인증 상태 확인 로직
 * ============================================================
 */

import { API_BASE, postJSON, getJSON } from './config.js';

// ========== 인증 상태 확인 ==========
/**
 * 현재 로그인 및 승인 상태를 확인합니다.
 * @returns {Promise<{authenticated: boolean, user?: Object}>}
 */
export async function checkAuth() {
  try {
    const data = await getJSON('/check_auth');
    return data;
  } catch (err) {
    console.error('[AUTH] 인증 상태 확인 실패:', err);
    return { authenticated: false };
  }
}

/**
 * 페이지 진입 시 인증 체크 및 리다이렉트
 * @param {Object} options - { requireAuth: boolean, requireAdmin: boolean, requireApproval: boolean }
 * @returns {Promise<Object|null>} - 인증된 사용자 정보 또는 null (리다이렉트됨)
 */
export async function requireAuth(options = {}) {
  const { requireAuth = true, requireAdmin = false, requireApproval = true } = options;
  
  const authData = await checkAuth();
  
  // 로그인 필요
  if (requireAuth && !authData.authenticated) {
    console.log('[AUTH] 로그인 필요 - 로그인 페이지로 이동');
    window.location.href = 'login.html';
    return null;
  }
  
  // 승인 필요
  if (requireApproval && authData.authenticated && !authData.user?.is_approved) {
    console.log('[AUTH] 승인 대기 중');
    return { ...authData, pendingApproval: true };
  }
  
  // 관리자 권한 필요
  if (requireAdmin && (!authData.authenticated || !authData.user?.is_admin)) {
    console.log('[AUTH] 관리자 권한 필요 - 메인 페이지로 이동');
    window.location.href = 'index.html';
    return null;
  }
  
  return authData;
}

// ========== 로그인 ==========
/**
 * 로그인 요청
 * @param {string} username - 사용자명
 * @param {string} password - 비밀번호
 * @returns {Promise<Object>} - 로그인 결과
 */
export async function login(username, password) {
  return postJSON('/login', { username, password });
}

// ========== 회원가입 ==========
/**
 * 회원가입 요청
 * @param {string} username - 사용자명
 * @param {string} password - 비밀번호
 * @returns {Promise<Object>} - 회원가입 결과
 */
export async function register(username, password) {
  return postJSON('/register', { username, password });
}

// ========== 로그아웃 ==========
/**
 * 로그아웃 요청
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    await postJSON('/logout', {});
  } catch (err) {
    console.warn('[AUTH] 로그아웃 요청 실패:', err);
  }
  
  // localStorage 정리 (게스트 모드로 전환)
  localStorage.removeItem('coding_tutor_user_id');
  console.log('[AUTH] localStorage 정리 완료');
  
  // 로그아웃 후 로그인 페이지로 이동
  window.location.href = 'login.html';
}

// ========== 비밀번호 변경 ==========
/**
 * 비밀번호 변경 요청
 * @param {string} currentPassword - 현재 비밀번호
 * @param {string} newPassword - 새 비밀번호
 * @param {string} confirmPassword - 새 비밀번호 확인
 * @returns {Promise<Object>} - 변경 결과
 */
export async function changePassword(currentPassword, newPassword, confirmPassword) {
  return postJSON('/change_password', {
    current_password: currentPassword,
    new_password: newPassword,
    confirm_password: confirmPassword
  });
}

/**
 * 비밀번호 변경 모달을 표시합니다.
 */
export function showChangePasswordModal() {
  // 기존 모달이 있으면 제거
  const existingModal = document.getElementById('change-password-modal');
  if (existingModal) existingModal.remove();

  const modal = document.createElement('div');
  modal.id = 'change-password-modal';
  modal.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl border border-slate-700">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-white">
          <i class="fas fa-key text-cyan-400 mr-2"></i>비밀번호 변경
        </h2>
        <button id="close-password-modal" class="text-slate-400 hover:text-white transition-colors">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <form id="change-password-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1">현재 비밀번호</label>
          <input type="password" id="current-password" required
            class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            placeholder="현재 비밀번호 입력">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1">새 비밀번호</label>
          <input type="password" id="new-password" required minlength="4"
            class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            placeholder="새 비밀번호 입력 (4자 이상)">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-300 mb-1">새 비밀번호 확인</label>
          <input type="password" id="confirm-password" required minlength="4"
            class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            placeholder="새 비밀번호 다시 입력">
        </div>
        
        <div id="password-error" class="text-red-400 text-sm hidden"></div>
        <div id="password-success" class="text-emerald-400 text-sm hidden"></div>
        
        <div class="flex gap-3 pt-2">
          <button type="button" id="cancel-password-btn"
            class="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
            취소
          </button>
          <button type="submit" id="submit-password-btn"
            class="flex-1 py-2 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors font-semibold">
            변경하기
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // 이벤트 바인딩
  const closeBtn = document.getElementById('close-password-modal');
  const cancelBtn = document.getElementById('cancel-password-btn');
  const form = document.getElementById('change-password-form');
  const errorEl = document.getElementById('password-error');
  const successEl = document.getElementById('password-success');

  const closeModal = () => modal.remove();

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // 클라이언트 검증
    if (newPassword !== confirmPassword) {
      errorEl.textContent = '새 비밀번호와 확인이 일치하지 않습니다.';
      errorEl.classList.remove('hidden');
      successEl.classList.add('hidden');
      return;
    }

    if (newPassword.length < 4) {
      errorEl.textContent = '새 비밀번호는 4자 이상이어야 합니다.';
      errorEl.classList.remove('hidden');
      successEl.classList.add('hidden');
      return;
    }

    try {
      const result = await changePassword(currentPassword, newPassword, confirmPassword);
      
      if (result.status === 'success') {
        successEl.textContent = result.message || '비밀번호가 변경되었습니다.';
        successEl.classList.remove('hidden');
        errorEl.classList.add('hidden');
        
        // 2초 후 모달 닫기
        setTimeout(closeModal, 2000);
      } else {
        errorEl.textContent = result.error || '비밀번호 변경에 실패했습니다.';
        errorEl.classList.remove('hidden');
        successEl.classList.add('hidden');
      }
    } catch (err) {
      errorEl.textContent = err.message || '서버 오류가 발생했습니다.';
      errorEl.classList.remove('hidden');
      successEl.classList.add('hidden');
    }
  });
}

// ========== 승인 대기 화면 표시 ==========
/**
 * 승인 대기 중 화면을 표시합니다.
 * @param {string} username - 사용자명
 */
export function showPendingApprovalScreen(username) {
  document.body.innerHTML = `
    <div class="flex flex-col items-center justify-center h-screen bg-[#0B0E14] text-slate-200">
      <div class="text-center p-8 max-w-md">
        <div class="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
          <i class="fas fa-clock text-yellow-400 text-4xl"></i>
        </div>
        <h1 class="text-2xl font-bold mb-4">승인 대기 중</h1>
        <p class="text-slate-400 mb-6">
          <strong class="text-white">${username}</strong>님, 회원가입이 완료되었습니다.<br>
          관리자 승인 후 서비스를 이용하실 수 있습니다.
        </p>
        <p class="text-sm text-slate-500 mb-8">
          승인이 완료되면 이 페이지를 새로고침해주세요.
        </p>
        <div class="flex gap-4 justify-center">
          <button onclick="location.reload()" class="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white transition-colors">
            <i class="fas fa-sync-alt mr-2"></i>새로고침
          </button>
          <button id="logout-btn" class="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors">
            <i class="fas fa-sign-out-alt mr-2"></i>로그아웃
          </button>
        </div>
      </div>
    </div>
  `;
  
  // 로그아웃 버튼 이벤트
  document.getElementById('logout-btn')?.addEventListener('click', logout);
}

// ========== 사용자 메뉴 설정 (게스트 모드 지원) ==========
/**
 * 헤더의 사용자 메뉴를 설정합니다.
 * @param {Object|null} user - 사용자 정보 (null이면 게스트 모드)
 */
export function setupUserMenu(user) {
  const usernameEl = document.getElementById('current-username');
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userDropdown = document.getElementById('user-dropdown');
  
  // 드롭다운 내부 아이템들
  const changePasswordBtn = document.getElementById('change-password-btn');
  const adminLink = document.getElementById('admin-link');
  const adminDivider = document.getElementById('admin-divider');
  const logoutBtn = document.getElementById('logout-btn');
  const dashboardLink = document.getElementById('dashboard-link');

  if (!usernameEl || !userMenuBtn || !userDropdown) return;

  // [신규] 로그인 유도 버튼 (없으면 동적 생성)
  let loginBtn = document.getElementById('login-link-btn');
  if (!loginBtn) {
    loginBtn = document.createElement('a');
    loginBtn.id = 'login-link-btn';
    loginBtn.href = 'login.html';
    loginBtn.className = 'hidden w-full flex items-center gap-2 px-4 py-2.5 text-sm text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all font-bold rounded-lg mb-2 shadow-lg';
    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt w-4"></i>로그인하여 저장하기';
    // 드롭다운의 맨 위에 추가
    userDropdown.insertBefore(loginBtn, userDropdown.firstChild);
  }

  // 1. 로그인 상태 (User 정보 있음)
  if (user && user.username) {
    usernameEl.textContent = user.username;
    usernameEl.classList.remove('text-amber-400');
    usernameEl.classList.add('text-slate-300');
    
    // 아이콘 원래대로
    const icon = userMenuBtn.querySelector('i');
    if (icon) {
      icon.className = 'fas fa-user-circle text-cyan-400';
    }

    // 메뉴 표시 제어
    loginBtn.classList.add('hidden');
    changePasswordBtn?.classList.remove('hidden');
    dashboardLink?.classList.remove('hidden');
    logoutBtn?.classList.remove('hidden');

    if (user.is_admin) {
      adminLink?.classList.remove('hidden');
      adminDivider?.classList.remove('hidden');
    }
  } 
  // 2. 비로그인 상태 (게스트)
  else {
    // 로컬스토리지의 랜덤 ID 가져오기 (없으면 표시용 임시값)
    const randomId = localStorage.getItem('coding_tutor_user_id') || 'GUEST';
    const shortId = randomId.startsWith('user_') ? randomId.substring(0, 9) + '...' : randomId;

    // 게스트용 UI 표시
    usernameEl.innerHTML = `${shortId} <span class="text-[10px] bg-amber-600/80 px-1.5 py-0.5 rounded ml-1">임시</span>`;
    usernameEl.classList.remove('text-slate-300');
    usernameEl.classList.add('text-amber-400'); // 경고색

    // 아이콘 변경 (경고 느낌)
    const icon = userMenuBtn.querySelector('i');
    if (icon) {
      icon.className = 'fas fa-user-clock text-amber-400';
    }

    // 메뉴 표시 제어
    loginBtn.classList.remove('hidden');              // 로그인 버튼 보이기
    changePasswordBtn?.classList.add('hidden');       // 비번 변경 숨기기
    dashboardLink?.classList.add('hidden');           // 대시보드 숨기기 (로그인 필요)
    adminLink?.classList.add('hidden');               // 관리자 숨기기
    adminDivider?.classList.add('hidden');
    logoutBtn?.classList.add('hidden');               // 로그아웃 숨기기
  }

  // 드롭다운 토글 (중복 방지)
  const newBtn = userMenuBtn.cloneNode(true);
  userMenuBtn.parentNode.replaceChild(newBtn, userMenuBtn);
  
  newBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('hidden');
  });

  // 외부 클릭 시 닫기
  document.addEventListener('click', () => {
    userDropdown.classList.add('hidden');
  });

  // 비밀번호 변경 버튼 처리
  const newChangePasswordBtn = document.getElementById('change-password-btn');
  if (newChangePasswordBtn) {
    newChangePasswordBtn.onclick = () => {
      userDropdown.classList.add('hidden');
      showChangePasswordModal();
    };
  }

  // 로그아웃 처리
  const newLogoutBtn = document.getElementById('logout-btn');
  if (newLogoutBtn) {
    newLogoutBtn.onclick = () => {
      logout();
    };
  }
}
