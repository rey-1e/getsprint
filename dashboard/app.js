const auth = firebase.auth();
const userEmailEl = document.getElementById('user-email');
const avatarEl = document.getElementById('avatar-initials');
const tierPill = document.getElementById('tier-pill');
const expiryDateEl = document.getElementById('expiry-date');
const logoutBtn = document.getElementById('logout-btn');

const complexityUsed = document.getElementById('complexity-used');
const complexityBar = document.getElementById('complexity-bar');
const detailedUsed = document.getElementById('detailed-used');
const detailedBar = document.getElementById('detailed-bar');
const bugUsed = document.getElementById('bug-used');
const bugBar = document.getElementById('bug-bar');
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
    // Populate profile card basics instantly
    userEmailEl.textContent = user.email;
    userEmailEl.setAttribute('title', user.email);
    avatarEl.textContent = user.email.charAt(0).toUpperCase();

    let syncData = null;
    try {
      syncData = await performUserSync(user);
    } catch (e) {
      console.warn("Dashboard: Cloud function sync failed, falling back to local credentials.", e);
    }

    // Determine Premium tier with a robust local fallback
    const isPremium = (syncData && syncData.isPremium) || (localStorage.getItem('isPremium') === 'true');

    // Fetch Firestore usage inside a safe, isolated block to prevent silent crashes
    let usage = { complexity: 0, detailed: 0, bug: 0 };
    let userData = {};
    try {
      const userDoc = await firebase.firestore().collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        userData = userDoc.data() || {};
        usage = userData.usage || { complexity: 0, detailed: 0, bug: 0 };
      }
    } catch (fsError) {
      console.warn("Dashboard: Firestore query blocked or deferred. Proceeding with sync state.", fsError);
    }

    // Render exact layout based on Premium tier resolution
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
      detailedUsed.textContent = "Unlimited (Premium)";
      detailedBar.style.width = "100%";
      bugUsed.textContent = "Unlimited (Premium)";
      bugBar.style.width = "100%";
      
      ctaArea.classList.add('hidden');
    } else {
      tierPill.textContent = "Free Tier";
      tierPill.className = "tier-pill free";
      expiryDateEl.textContent = "Never (Free Account)";

      const compCount = usage.complexity || 0;
      complexityUsed.textContent = `${compCount} / 5 used`;
      complexityBar.style.width = `${Math.min((compCount / 5) * 100, 100)}%`;

      const detCount = usage.detailed || 0;
      detailedUsed.textContent = `${detCount} / 5 used`;
      detailedBar.style.width = `${Math.min((detCount / 5) * 100, 100)}%`;

      const bugCount = usage.bug || 0;
      bugUsed.textContent = `${bugCount} / 3 used`;
      bugBar.style.width = `${Math.min((bugCount / 3) * 100, 100)}%`;

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