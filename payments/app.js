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
const logoutBtn = document.getElementById('logout-btn');
const statusText = document.getElementById('auth-status');
const payButtons = document.querySelectorAll('.pay-btn');

let currentUserToken = null;

/**
 * FIX: Centralized function to sync sessionToken into chrome.storage.local.
 * This is the ONLY correct cross-context bridge between the website and the extension.
 * localStorage and data-sprint-auth DOM attributes do NOT work across tabs/contexts.
 */
async function syncSessionTokenToExtension(sessionToken) {
  try {
    await chrome.storage.local.set({ authToken: sessionToken });
  } catch (e) {
    console.error("Sprint: Failed to sync token to extension storage:", e);
  }
}

/**
 * FIX: Centralized function to clear the auth token from extension storage on logout.
 */
async function clearSessionTokenFromExtension() {
  try {
    await chrome.storage.local.remove('authToken');
  } catch (e) {
    console.error("Sprint: Failed to clear token from extension storage:", e);
  }
}

/**
 * FIX: Call syncUser with forceRefresh=true to ensure the ID token is never stale.
 * Firebase ID tokens expire after 1 hour. A stale token causes the backend to throw
 * "Unauthorized" even for a legitimately logged-in user.
 */
async function performUserSync(user, retryCount = 0) {
  // Always force-refresh to guarantee a fresh token — prevents stale token rejections
  const idToken = await user.getIdToken(true);
  currentUserToken = idToken;

  const syncRes = await fetch('https://syncuser-i6ptizncma-uc.a.run.app', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
      'X-Client-Version': '3.0'
    }
  });

  const syncData = await syncRes.json().catch(() => ({}));

  // Retry on 500 (infrastructure/cold-start errors) up to 2 times
  if (syncRes.status === 500 && retryCount < 2) {
    await new Promise(r => setTimeout(r, 2500));
    return performUserSync(user, retryCount + 1);
  }

  if (syncRes.ok && syncData.success && syncData.sessionToken) {
    // FIX: Write to chrome.storage.local — the only storage accessible to the extension
    await syncSessionTokenToExtension(syncData.sessionToken);
    return syncData;
  }

  // Surface the real server error — visible in the UI and browser console
  const errDetail = syncData.detail || syncData.error || `HTTP ${syncRes.status}`;
  console.error("Sprint syncUser failed:", syncRes.status, syncData);
  throw new Error(errDetail);
}

auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      statusText.innerHTML = "Verifying profile synchronization...";
      const syncData = await performUserSync(user);

      statusText.innerHTML = `✔️ Validated: <strong style="color:#cd5c5c">${user.email}</strong>`;

      loginBtn.classList.add('hidden');
      logoutBtn.classList.remove('hidden');
      payButtons.forEach(btn => btn.removeAttribute('disabled'));
    } catch (e) {
      console.error("Sprint: Auth sync error:", e);
      // FIX: Show the ACTUAL error — not a generic message. This lets you see
      // in the UI exactly what the server is rejecting (IAM, Firestore rules, etc.)
      statusText.innerHTML = `Sync error: <code style="font-size:11px;background:#f3f3f3;padding:2px 5px;border-radius:3px;">${e.message}</code><br><small>Check Firebase Console → Functions logs</small>`;
      // Still show logged-in UI state — the user IS authenticated via Firebase
      loginBtn.classList.add('hidden');
      logoutBtn.classList.remove('hidden');
    }
  } else {
    currentUserToken = null;
    statusText.textContent = "Requires user authentication before pricing unlock.";
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    payButtons.forEach(btn => btn.setAttribute('disabled', 'true'));

    // FIX: Clear from chrome.storage.local on logout
    await clearSessionTokenFromExtension();
  }
});

loginBtn.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
});

logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

// Checkout and Order Verification Handlers
payButtons.forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const planType = e.target.getAttribute('data-plan');
    const originalBtnText = e.target.innerHTML;
    
    try {
      e.target.innerHTML = "Creating Secure Order...";
      e.target.setAttribute('disabled', 'true');

      // Create Order ID
      const orderRes = await fetch('https://createrazorpayorder-i6ptizncma-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType })
      });
      const order = await orderRes.json();

      // Open Razorpay Popup Screen
      const options = {
        "key": "rzp_live_SvG5sgcyDBqn0V",
        "amount": order.amount,
        "currency": "INR",
        "order_id": order.id,
        "name": "LeetCode Sprint",
        "description": `Upgrade to ${planType === '1day' ? '1 Day' : '1 Month'} Premium`,
        "handler": async function (paymentResponse) {
           e.target.innerHTML = "Verifying Transaction...";
           
           // FIX: Must include X-Client-Version or server treats this as legacy
           // and rejects the payment with "Unauthorized operation" after money is taken
           const verifyRes = await fetch('https://verifypayment-i6ptizncma-uc.a.run.app', {
             method: 'POST',
             headers: { 
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${currentUserToken}`,
               'X-Client-Version': '3.0'
             },
             body: JSON.stringify({
               razorpay_order_id: paymentResponse.razorpay_order_id,
               razorpay_payment_id: paymentResponse.razorpay_payment_id,
               razorpay_signature: paymentResponse.razorpay_signature,
               planType
             })
           });
           
           const verification = await verifyRes.json();
           if (verification.success) {
             alert("Upgrade complete! Premium features are now unlocked.");
             
             const currentUser = auth.currentUser;
             if (currentUser) {
               try {
                 // FIX: Re-sync after payment to refresh premium status in extension
                 await performUserSync(currentUser);
               } catch (syncErr) {
                 console.error("Sprint: Post-payment sync failed:", syncErr);
               }
             }
           } else {
             alert("Payment verification error: " + verification.error);
           }
           
           e.target.innerHTML = originalBtnText;
           e.target.removeAttribute('disabled');
        },
        "modal": {
          "ondismiss": function() {
            e.target.innerHTML = originalBtnText;
            e.target.removeAttribute('disabled');
          }
        },
        "theme": { "color": "#cd5c5c" }
      };
      
      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Billing connection interrupted. Please check your network and try again.");
      e.target.innerHTML = originalBtnText;
      e.target.removeAttribute('disabled');
    }
  });
});