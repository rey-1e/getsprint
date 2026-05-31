const auth         = firebase.auth();
const loginBtn     = document.getElementById('login-btn');
const authLoading  = document.getElementById('auth-loading');
const authSuccess  = document.getElementById('auth-success');
const successMsg   = document.getElementById('success-message');

function showLoading() {
  loginBtn.classList.add('hidden');
  authLoading.classList.remove('hidden');
  authSuccess.classList.add('hidden');
}
function showButton() {
  loginBtn.classList.remove('hidden');
  authLoading.classList.add('hidden');
  authSuccess.classList.add('hidden');
}
function showSuccess(email) {
  loginBtn.classList.add('hidden');
  authLoading.classList.add('hidden');
  authSuccess.classList.remove('hidden');
  successMsg.innerHTML = `Signed in as <strong style="color:var(--text-primary)">${email}</strong>`;
}

function syncSessionToken(token, isPremium) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('isPremium', isPremium ? 'true' : 'false');
  document.documentElement.setAttribute('data-sprint-auth', token);
  document.documentElement.setAttribute('data-sprint-premium', isPremium ? 'true' : 'false');
}
function clearSession() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('isPremium');
  document.documentElement.setAttribute('data-sprint-auth', 'logout');
  document.documentElement.setAttribute('data-sprint-premium', 'false');
}

async function performSync(user) {
  const idToken = await user.getIdToken(true);
  const res = await fetch('https://syncuser-i6ptizncma-uc.a.run.app', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
      'X-Client-Version': '3.0'
    }
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.success && data.sessionToken) {
    syncSessionToken(data.sessionToken, data.isPremium);
    return data;
  }
  throw new Error(data.detail || data.error || `HTTP ${res.status}`);
}

let resolved = false;
const sessionCheckTimeout = setTimeout(() => {
  if (!resolved) showButton();
}, 1200);

auth.onAuthStateChanged(async (user) => {
  resolved = true;
  clearTimeout(sessionCheckTimeout);

  if (user) {
    showLoading();
    try {
      await performSync(user);
      showSuccess(user.email);

      // Automated redirect to the new dedicated dashboard path
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      let targetUrl = '../dashboard/index.html';
      if (redirect === 'payments') {
        targetUrl = '../payments/index.html';
      } else if (redirect === 'dashboard') {
        targetUrl = '../dashboard/index.html';
      }
      setTimeout(() => { window.location.href = targetUrl; }, 600);
    } catch (err) {
      console.error('Session configuration interrupted:', err);
      showButton();
    }
  } else {
    clearSession();
    showButton();
  }
});

loginBtn.addEventListener('click', () => {
  showLoading();
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch((err) => {
    console.error('Sign-in cancelled:', err);
    showButton();
  });
});