const auth = firebase.auth();
const userEmailEl = document.getElementById('user-email');
const avatarEl = document.getElementById('avatar-initials');
const tierPill = document.getElementById('tier-pill');
const expiryDateEl = document.getElementById('expiry-date');
const logoutBtn = document.getElementById('logout-btn');

const complexityUsed = document.getElementById('complexity-used');
const complexityBar = document.getElementById('complexity-bar');
const bugUsed = document.getElementById('bug-used');
const bugBar = document.getElementById('bug-bar');
const chatUsed = document.getElementById('chat-used');
const chatBar = document.getElementById('chat-bar');
const ctaArea = document.getElementById('dashboard-cta-area');

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
    await new Promise(r => setTimeout(r, 2000));
    return performUserSync(user, retryCount + 1);
  }

  if (syncRes.ok && syncData.success) {
    syncSessionTokenToExtension(syncData.sessionToken, syncData.isPremium);
    return syncData;
  }
  throw new Error(syncData.detail || syncData.error || `HTTP ${syncRes.status}`);
}

auth.onAuthStateChanged(async (user) => {
  if (user) {
    userEmailEl.textContent = user.email;
    userEmailEl.setAttribute('title', user.email);
    avatarEl.textContent = user.email.charAt(0).toUpperCase();

    let syncData = null;
    try {
      syncData = await performUserSync(user);
    } catch (e) {
      console.warn("Dashboard: Cloud function sync failed, falling back to local credentials.", e);
    }

    const isPremium = (syncData && syncData.isPremium) || (localStorage.getItem('isPremium') === 'true');

    // Secure, isolated Firestore block to prevent silent page crashes from Brave Shield / Adblockers
    let usage = { complexity: 0, detailed: 0, bug: 0, chat: 0 };
    let userData = {};
    try {
      const userDoc = await firebase.firestore().collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        userData = userDoc.data() || {};
        usage = userData.usage || { complexity: 0, detailed: 0, bug: 0, chat: 0 };
      }
    } catch (fsError) {
      console.warn("Dashboard: Firestore query blocked or deferred. Proceeding with sync state.", fsError);
    }

    if (isPremium) {
      tierPill.textContent = "Premium Member";
      tierPill.className = "tier-pill premium";
      
      let expiryText = "Active Session / Pass";
      if (userData.premiumUntil) {
        const expiry = userData.premiumUntil.toDate();
        expiryText = expiry.toLocaleDateString(undefined, { dateStyle: 'long' });
      } else if (syncData && syncData.premiumUntil) {
        const expiry = new Date(syncData.premiumUntil);
        expiryText = expiry.toLocaleDateString(undefined, { dateStyle: 'long' });
      }
      expiryDateEl.textContent = expiryText;

      complexityUsed.textContent = "Unlimited (Premium)";
      complexityBar.style.width = "100%";
      bugUsed.textContent = "Unlimited (Premium)";
      bugBar.style.width = "100%";
      chatUsed.textContent = "Unlimited (Premium)";
      chatBar.style.width = "100%";
      
      ctaArea.classList.add('hidden');
    } else {
      tierPill.textContent = "Free Tier";
      tierPill.className = "tier-pill free";
      expiryDateEl.textContent = "Never (Free Account)";

      const compCount = usage.complexity || 0;
      complexityUsed.textContent = `${compCount} / 15 used`;
      complexityBar.style.width = `${Math.min((compCount / 15) * 100, 100)}%`;

      const bugCount = usage.bug || 0;
      bugUsed.textContent = `${bugCount} / 7 used`;
      bugBar.style.width = `${Math.min((bugCount / 7) * 100, 100)}%`;

      const chatCount = usage.chat || 0;
      chatUsed.textContent = `${chatCount} / 10 used`;
      chatBar.style.width = `${Math.min((chatCount / 10) * 100, 100)}%`;

      ctaArea.classList.remove('hidden');
    }
  } else {
    clearSessionTokenFromExtension();
    window.location.href = '../login/index.html?redirect=dashboard';
  }
});

logoutBtn.addEventListener('click', () => {
  auth.signOut();
});