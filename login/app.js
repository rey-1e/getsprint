const firebaseConfig = {
  apiKey: "AIzaSyAg1tPoejGGXcJMe9MwMWTWhnCjZOpRt7g",
  authDomain: "sprint-87863.firebaseapp.com",
  projectId: "sprint-87863",
  storageBucket: "sprint-87863.firebasestorage.app",
  messagingSenderId: "549425279249",
  appId: "1:549425279249:web:ce3d25457977bec5915cb0",
  measurementId: "G-PCKD965D95"
};

firebase.initializeApp(firebaseConfig);

const auth         = firebase.auth();
const loginBtn     = document.getElementById('login-btn');
const authLoading  = document.getElementById('auth-loading');
const authSuccess  = document.getElementById('auth-success');
const successMsg   = document.getElementById('success-message');

// --- State helpers ---
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
  successMsg.innerHTML = `Signed in as <strong style="color:var(--accent)">${email}</strong>`;
}

// --- Session sync helpers ---
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

// --- Auth state: starts showing button, not spinner ---
// Only show spinner if firebase already has a cached session
let resolved = false;
const sessionCheckTimeout = setTimeout(() => {
  // If Firebase hasn't resolved in 1.5s, just show the button
  if (!resolved) showButton();
}, 1500);

auth.onAuthStateChanged(async (user) => {
  resolved = true;
  clearTimeout(sessionCheckTimeout);

  if (user) {
    showLoading();
    try {
      await performSync(user);
      showSuccess(user.email);

      // Handle redirect
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      if (redirect === 'payments') {
        setTimeout(() => { window.location.href = '../payments/index.html'; }, 900);
      } else if (redirect === 'authorize') {
        setTimeout(() => { window.location.href = '../authorize/index.html'; }, 900);
      }
    } catch (err) {
      console.error('Sync error:', err);
      showButton();
    }
  } else {
    clearSession();
    showButton();
  }
});

// --- Login button ---
loginBtn.addEventListener('click', () => {
  showLoading();
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch((err) => {
    console.error('Sign-in failed:', err);
    showButton();
  });
});