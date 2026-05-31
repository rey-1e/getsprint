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

auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUserToken = await user.getIdToken();
    
    try {
      statusText.innerHTML = "Verifying profile synchronization...";
      const syncRes = await fetch('https://syncuser-i6ptizncma-uc.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUserToken}`,
          'X-Client-Version': '3.0'
        }
      });
      const syncData = await syncRes.json();
      
      if (syncRes.ok && syncData.success && syncData.sessionToken) {
        statusText.innerHTML = `✔️ Validated: <strong style="color:#cd5c5c">${user.email}</strong>`;
        // Sync robust long-lived token
        localStorage.setItem('sprint_authToken', syncData.sessionToken);
        document.documentElement.setAttribute('data-sprint-auth', syncData.sessionToken);
      } else {
        statusText.textContent = "Profile sync error. Try refreshing.";
      }
    } catch (e) {
      console.error(e);
      statusText.textContent = "Authentication sync failed.";
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
    document.documentElement.removeAttribute('data-sprint-auth');
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
             
             // Sync refreshed profile
             const syncRes = await fetch('https://syncuser-i6ptizncma-uc.a.run.app', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${freshToken}`,
                  'X-Client-Version': '3.0'
                }
              });
              const syncData = await syncRes.json();
              if (syncRes.ok && syncData.success && syncData.sessionToken) {
                localStorage.setItem('sprint_authToken', syncData.sessionToken);
                document.documentElement.setAttribute('data-sprint-auth', syncData.sessionToken);
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