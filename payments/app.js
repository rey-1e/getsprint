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
const statusText = document.getElementById('auth-status');
const payButtons = document.querySelectorAll('.pay-btn');

let currentUserToken = null;

function syncSessionTokenToExtension(sessionToken, isPremium) {
  localStorage.setItem('authToken', sessionToken);
  localStorage.setItem('isPremium', isPremium ? 'true' : 'false');
  document.documentElement.setAttribute('data-sprint-auth', sessionToken);
  document.documentElement.setAttribute('data-sprint-premium', isPremium ? 'true' : 'false');
}

function clearSessionTokenFromExtension() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('isPremium');
  document.documentElement.setAttribute('data-sprint-auth', 'logout');
  document.documentElement.setAttribute('data-sprint-premium', 'false');
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
    syncSessionTokenToExtension(syncData.sessionToken, syncData.isPremium);
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
      const syncData = await performUserSync(user);

      if (syncData.isPremium) {
        statusText.innerHTML = `✔️ Active Premium Member: <strong>${user.email}</strong>`;
        // Redirect premium members instantly to avoid double-purchase mistakes
        window.location.href = '../authorize/index.html';
        return;
      }

      statusText.innerHTML = `✔️ Logged in as: <strong>${user.email}</strong>`;
      payButtons.forEach(btn => {
        btn.removeAttribute('disabled');
        btn.textContent = btn.getAttribute('data-plan') === '1day' ? 'Upgrade for 24h' : 'Unlock Monthly Pass';
        // Clean event triggers
        btn.onclick = () => initiateCheckout(btn.getAttribute('data-plan'), btn);
      });
    } catch (e) {
      console.error("Sprint: Auth sync error:", e);
      statusText.innerHTML = `Sync error: <code style="font-size:11px;">${e.message}</code>`;
    }
  } else {
    currentUserToken = null;
    statusText.innerHTML = `<a href="../login/index.html?redirect=payments" style="color:#cd5c5c; font-weight:700; text-decoration:underline;">Click here to Sign In and unlock pricing</a>`;
    payButtons.forEach(btn => {
      btn.setAttribute('disabled', 'true');
      btn.textContent = "Sign In to Upgrade";
      btn.onclick = () => { window.location.href = '../login/index.html?redirect=payments'; };
    });
    clearSessionTokenFromExtension();
  }
});

async function initiateCheckout(planType, buttonEl) {
  const originalBtnText = buttonEl.innerHTML;
  
  try {
    buttonEl.innerHTML = "Creating Secure Order...";
    buttonEl.setAttribute('disabled', 'true');

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
         buttonEl.innerHTML = "Verifying Transaction...";
         
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
               window.location.href = '../authorize/index.html';
             } catch (syncErr) {
               console.error("Sprint: Post-payment sync failed:", syncErr);
             }
           }
         } else {
           alert("Payment verification error: " + verification.error);
         }
         
         buttonEl.innerHTML = originalBtnText;
         buttonEl.removeAttribute('disabled');
      },
      "modal": {
        "ondismiss": function() {
          buttonEl.innerHTML = originalBtnText;
          buttonEl.removeAttribute('disabled');
        }
      },
      "theme": { "color": "#cd5c5c" }
    };
    
    const rzp = new Razorpay(options);
    rzp.open();
  } catch (err) {
    console.error(err);
    alert("Billing connection interrupted. Please check your network and try again.");
    buttonEl.innerHTML = originalBtnText;
    buttonEl.removeAttribute('disabled');
  }
}