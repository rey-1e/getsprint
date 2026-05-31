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
const auth = firebase.auth();

const loginBtn = document.getElementById('login-btn');
const authLoading = document.getElementById('auth-loading');
const authSuccess = document.getElementById('auth-success');
const successMessage = document.getElementById('success-message');

/**
 * Resilient sync helper — retries on failure to handle Cloud Functions cold-starts.
 */
async function syncWithRetry(token, maxRetries = 2) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const syncRes = await fetch('https://syncuser-i6ptizncma-uc.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Client-Version': '3.0'
        }
      });
      const syncData = await syncRes.json();
      
      if (syncRes.ok && syncData.success && syncData.sessionToken) {
        return syncData;
      }
      lastError = new Error(syncData.error || "Sync returned unsuccessful response");
    } catch (e) {
      lastError = e;
    }
    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  throw lastError;
}

auth.onAuthStateChanged(async (user) => {
  if (user) {
    loginBtn.classList.add('hidden');
    authLoading.classList.remove('hidden');
    
    try {
      const idToken = await user.getIdToken();
      const syncData = await syncWithRetry(idToken);
      
      // Broadcast long-lived session token to local extension
      localStorage.setItem('sprint_authToken', syncData.sessionToken);
      document.documentElement.setAttribute('data-sprint-auth', syncData.sessionToken);
      
      authLoading.classList.add('hidden');
      authSuccess.classList.remove('hidden');
      successMessage.innerHTML = `Signed in as <strong style="color:#cd5c5c">${user.email}</strong>. Extension is active.<br><span style="font-size:0.78rem;color:#71717a;margin-top:4px;display:inline-block;">You can now close this tab and return to LeetCode.</span>`;
    } catch (e) {
      console.error(e);
      authLoading.classList.add('hidden');
      loginBtn.classList.remove('hidden');
      alert("Verification failed. Please retry signing in.");
    }
  } else {
    loginBtn.classList.remove('hidden');
    authSuccess.classList.add('hidden');
    authLoading.classList.add('hidden');
    localStorage.removeItem('sprint_authToken');
    document.documentElement.setAttribute('data-sprint-auth', 'logout');
  }
});

loginBtn.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => {
    console.error("Auth popup failed:", err);
  });
});