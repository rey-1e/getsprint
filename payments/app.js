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
const loginRedirectBtn = document.getElementById('login-redirect-btn');
const logoutBtn = document.getElementById('logout-btn');
const statusText = document.getElementById('auth-status');
const payButtons = document.querySelectorAll('.pay-btn');

let currentUserToken = null;

function syncSessionTokenToExtension(sessionToken) {
  localStorage.setItem('authToken', sessionToken);
  document.documentElement.setAttribute('data-sprint-auth', sessionToken);
}

function clearSessionTokenFromExtension() {
  localStorage.removeItem('authToken');
  document.documentElement.setAttribute('data-sprint-auth', 'logout');
}

async function performUserSync(user, retryCount = 0) {
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

  if (syncRes.status === 500 && retryCount < 2) {
    await new Promise(r => setTimeout(r, 2500));
    return performUserSync(user, retryCount + 1);
  }

  if (syncRes.ok && syncData.success && syncData.sessionToken) {
    syncSessionTokenToExtension(syncData.sessionToken);
    return syncData;
  }

  const errDetail = syncData.detail || syncData.error || `HTTP ${syncRes.status}`;
  console.error("Sprint syncUser failed:", syncRes.status, syncData);
  throw new Error(errDetail);
}

auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      statusText.innerHTML = "Verifying profile synchronization...";
      await performUserSync(user);

      statusText.innerHTML = `✔️ Logged in: <strong style="color:#cd5c5c">${user.email}</strong>`;

      loginRedirectBtn.classList.add('hidden');
      logoutBtn.classList.remove('hidden');
      payButtons.forEach(btn => {
        btn.removeAttribute('disabled');
        btn.textContent = btn.getAttribute('data-plan') === '1day' ? 'Upgrade for 24h' : 'Unlock Monthly Pass';
      });
    } catch (e) {
      console.error("Sprint: Auth sync error:", e);
      statusText.innerHTML = `Sync error: <code style="font-size:11px;background:#f3f3f3;padding:2px 5px;border-radius:3px;">${e.message}</code>`;
      loginRedirectBtn.classList.add('hidden');
      logoutBtn.classList.remove('hidden');
    }
  } else {
    currentUserToken = null;
    statusText.textContent = "Sign-in required to manage your subscription.";
    loginRedirectBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    payButtons.forEach(btn => {
      btn.setAttribute('disabled', 'true');
      btn.textContent = "Sign In to Upgrade";
    });

    clearSessionTokenFromExtension();
  }
});

logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

payButtons.forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const planType = e.target.getAttribute('data-plan');
    const originalBtnText = e.target.innerHTML;
    
    try {
      e.target.innerHTML = "Creating Secure Order...";
      e.target.setAttribute('disabled', 'true');

      const orderRes = await fetch('https://createrazorpayorder-i6ptizncma-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType })
      });
      const order = await orderRes.json();

      const options = {
        "key": "rzp_live_SvG5sgcyDBqn0V",
        "amount": order.amount,
        "currency": "INR",
        "order_id": order.id,
        "name": "LeetCode Sprint",
        "description": `Upgrade to ${planType === '1day' ? '1 Day' : '1 Month'} Premium`,
        "handler": async function (paymentResponse) {
           e.target.innerHTML = "Verifying Transaction...";
           
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