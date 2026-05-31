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
 * Resilient sync helper — retries on failure to handle Cloud Functions cold-starts.
 * Returns { success, sessionToken } or throws after all retries exhausted.
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
    // Wait before retrying (skip wait on last attempt)
    if (attempt < maxRetries) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  throw lastError;
}

auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUserToken = await user.getIdToken();
    
    try {
      statusText.innerHTML = "Verifying profile synchronization...";
      const syncData = await syncWithRetry(currentUserToken);
      
      statusText.innerHTML = `✔️ Validated: <strong style="color:#cd5c5c">${user.email}</strong>`;
      // Sync robust long-lived token
      localStorage.setItem('sprint_authToken', syncData.sessionToken);
      document.documentElement.setAttribute('data-sprint-auth', syncData.sessionToken);
    } catch (e) {
      console.error(e);
      statusText.innerHTML = `Profile sync error. <button id="retry-sync-btn" style="background:none;border:1px solid #cd5c5c;color:#cd5c5c;padding:2px 10px;border-radius:4px;cursor:pointer;font-size:0.75rem;margin-left:8px;">Retry</button>`;
      
      // Attach retry handler
      const retryBtn = document.getElementById('retry-sync-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', async () => {
          retryBtn.textContent = 'Retrying...';
          retryBtn.disabled = true;
          try {
            const freshToken = await user.getIdToken(true);
            currentUserToken = freshToken;
            const syncData = await syncWithRetry(freshToken, 1);
            statusText.innerHTML = `✔️ Validated: <strong style="color:#cd5c5c">${user.email}</strong>`;
            localStorage.setItem('sprint_authToken', syncData.sessionToken);
            document.documentElement.setAttribute('data-sprint-auth', syncData.sessionToken);
          } catch (retryErr) {
            console.error(retryErr);
            statusText.textContent = "Sync failed. Please sign out and sign in again.";
          }
        });
      }
    }

    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    payButtons.forEach(btn => btn.removeAttribute('disabled'));
  } else {
    currentUserToken = null;
    statusText.textContent = "Requires user authentication before pricing unlock.";
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    payButtons.forEach(btn => btn.setAttribute('disabled', 'true'));

    localStorage.removeItem('sprint_authToken');
    document.documentElement.setAttribute('data-sprint-auth', 'logout');
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
           
           // Verify execution legitimacy on backend
           const verifyRes = await fetch('https://verifypayment-i6ptizncma-uc.a.run.app', {
             method: 'POST',
             headers: { 
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${currentUserToken}`
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
             const freshToken = await auth.currentUser.getIdToken(true);
             
             // Sync refreshed profile with retry
             try {
               const syncData = await syncWithRetry(freshToken);
               localStorage.setItem('sprint_authToken', syncData.sessionToken);
               document.documentElement.setAttribute('data-sprint-auth', syncData.sessionToken);
             } catch (syncErr) {
               console.error("Post-payment sync failed:", syncErr);
               // Payment succeeded but sync failed — user needs to refresh
               statusText.innerHTML = `✔️ Payment successful! Please <a href="" onclick="location.reload();return false;" style="color:#cd5c5c;font-weight:600;">refresh this page</a> to sync your premium status.`;
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