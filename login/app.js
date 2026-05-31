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

async function syncSessionTokenToExtension(sessionToken) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ authToken: sessionToken });
    }
  } catch (e) {
    console.error("Sprint: Failed to sync token to extension storage:", e);
  }
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
    await syncSessionTokenToExtension(syncData.sessionToken);
    return syncData;
  }
  throw new Error(syncData.detail || syncData.error || `HTTP ${syncRes.status}`);
}

loginBtn.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  
  loginBtn.classList.add('hidden');
  authLoading.classList.remove('hidden');

  auth.signInWithPopup(provider)
    .then(async (result) => {
      if (result.user) {
        try {
          await performUserSync(result.user);
          
          authLoading.classList.add('hidden');
          authSuccess.classList.remove('hidden');
          successMessage.innerHTML = `Successfully authenticated as <strong style="color:#cd5c5c">${result.user.email}</strong>`;

          // Handle redirection parameters
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('redirect') === 'payments') {
            setTimeout(() => {
              window.location.href = '../payments/index.html';
            }, 1000);
          }
        } catch (syncErr) {
          console.error("Auth sync error:", syncErr);
          alert("Profile synchronization failed. Please try logging in again.");
          loginBtn.classList.remove('hidden');
          authLoading.classList.add('hidden');
        }
      }
    })
    .catch((error) => {
      console.error("Popup Sign-In failed:", error);
      loginBtn.classList.remove('hidden');
      authLoading.classList.add('hidden');
    });
});

auth.onAuthStateChanged((user) => {
  if (user) {
    loginBtn.classList.add('hidden');
    authSuccess.classList.remove('hidden');
    successMessage.innerHTML = `Logged in as <strong style="color:#cd5c5c">${user.email}</strong>`;
  } else {
    loginBtn.classList.remove('hidden');
    authSuccess.classList.add('hidden');
  }
});