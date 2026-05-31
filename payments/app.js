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

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const statusText = document.getElementById('auth-status');
const payButtons = document.querySelectorAll('.pay-btn');

// Replace this with your actual published Extension ID
const EXTENSION_ID = "eilgpmmdpaapjbjgcjnoddnddnlagica";

let currentUserToken = null;

auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUserToken = await user.getIdToken();
    statusText.textContent = `Logged in as: ${user.email}`;
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    payButtons.forEach(btn => btn.removeAttribute('disabled'));

    // Push authentication token down to the local extension store
    sendTokenToExtension(currentUserToken);
  } else {
    currentUserToken = null;
    statusText.textContent = "Please sign in to proceed with upgrades.";
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    payButtons.forEach(btn => btn.setAttribute('disabled', 'true'));
  }
});

loginBtn.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
});

logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

function sendTokenToExtension(token) {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage(EXTENSION_ID, { type: "SET_AUTH_TOKEN", token }, (res) => {
      if (chrome.runtime.lastError) {
        console.log("Extension connection offline or not active yet.");
      } else {
        console.log("Token securely synced with extension:", res);
      }
    });
  }
}

// Checkout and Order Verification Handlers
payButtons.forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const planType = e.target.getAttribute('data-plan');
    
    try {
      // Step 1: Create Order ID
      const orderRes = await fetch('https://us-central1-sprint-87863.cloudfunctions.net/createRazorpayOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType })
      });
      const order = await orderRes.json();

      // Step 2: Open Razorpay Popup Screen
      const options = {
        "key": "rzp_live_SvG5sgcyDBqn0V",
        "amount": order.amount,
        "currency": "INR",
        "order_id": order.id,
        "name": "LeetCode Sprint",
        "description": `Upgrade to ${planType} Premium`,
        "handler": async function (paymentResponse) {
           // Step 3: Verify execution legitimacy on backend
           const verifyRes = await fetch('https://us-central1-sprint-87863.cloudfunctions.net/verifyPayment', {
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
             sendTokenToExtension(freshToken);
           } else {
             alert("Payment verification error: " + verification.error);
           }
        },
        "theme": { "color": "#cd5c5c" }
      };
      
      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Billing connection interrupted. Please try again later.");
    }
  });
});