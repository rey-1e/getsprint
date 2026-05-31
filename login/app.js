// Firebase App configuration block
const firebaseConfig = {
  apiKey: "AIzaSyAg1tPoejGGXcJMe9MwMWTWhnCjZOpRt7g",
  authDomain: "sprint-87863.firebaseapp.com",
  projectId: "sprint-87863",
  storageBucket: "sprint-87863.firebasestorage.app",
  messagingSenderId: "549425279249",
  appId: "1:549425279249:web:ce3d25457977bec5915cb0",
  measurementId: "G-PCKD965D95"
};

// Initialize Firebase safely
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const loginBtn = document.getElementById('login-btn');
const authLoading = document.getElementById('auth-loading');
const authSuccess = document.getElementById('auth-success');
const successMessage = document.getElementById('success-message');

// Initialize loading state immediately on load
authLoading.classList.remove('hidden');
loginBtn.classList.add('hidden');
authSuccess.classList.add('hidden');

function syncSessionTokenToExtension(sessionToken) {
  localStorage.setItem('authToken', sessionToken);
  document.documentElement.setAttribute('data-sprint-auth', sessionToken);
}

function clearSessionTokenFromExtension() {
  localStorage.removeItem('authToken');
  document.documentElement.setAttribute('data-sprint-auth', 'logout');
}

async function performUserSync(user) {
  const idToken = await user.getIdToken(true);
  const syncRes = await fetch('https://syncuser-i6ptizncma-uc.a.run.app', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
      'X-Client-Version': '3.0'
    }
  });

  const syncData = await syncRes.json().catch(() => ({}));
  if (syncRes.ok && syncData.success && syncData.sessionToken) {
    syncSessionTokenToExtension(syncData.sessionToken);
    return syncData;
  }
  throw new Error(syncData.detail || syncData.error || `HTTP ${syncRes.status}`);
}

auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      await performUserSync(user);
      
      authLoading.classList.add('hidden');
      loginBtn.classList.add('hidden');
      authSuccess.classList.remove('hidden');
      successMessage.innerHTML = `Successfully authenticated as <strong style="color:#cd5c5c">${user.email}</strong>`;

      // Handle redirect parameter
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('redirect') === 'payments') {
        setTimeout(() => {
          window.location.href = '../payments/index.html';
        }, 800);
      }
    } catch (syncErr) {
      console.error("Auth sync error:", syncErr);
      authLoading.classList.add('hidden');
      loginBtn.classList.remove('hidden');
      authSuccess.classList.add('hidden');
    }
  } else {
    authLoading.classList.add('hidden');
    loginBtn.classList.remove('hidden');
    authSuccess.classList.add('hidden');
    clearSessionTokenFromExtension();
  }
});

loginBtn.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  
  loginBtn.classList.add('hidden');
  authLoading.classList.remove('hidden');

  auth.signInWithPopup(provider)
    .catch((error) => {
      console.error("Popup Sign-In failed:", error);
      loginBtn.classList.remove('hidden');
      authLoading.classList.add('hidden');
    });
});