const auth = firebase.auth();
const userEmailEl = document.getElementById('user-email');
const avatarEl = document.getElementById('avatar-initials');
const tierBadge = document.getElementById('tier-badge');

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
    avatarEl.textContent = user.email.charAt(0).toUpperCase();

    try {
      const syncData = await performUserSync(user);
      
      if (syncData.isPremium) {
        tierBadge.textContent = "Premium Member";
        tierBadge.className = "tier-badge premium";
      } else {
        tierBadge.textContent = "Free Tier Profile";
        tierBadge.className = "tier-badge free";
      }
    } catch (e) {
      console.error("Authorization sync failed, resorting to cache:", e);
      const isPremiumCached = localStorage.getItem('isPremium') === 'true';
      tierBadge.textContent = isPremiumCached ? "Premium Member (Cached)" : "Free Tier Profile";
      tierBadge.className = isPremiumCached ? "tier-badge premium" : "tier-badge free";
    }
  } else {
    clearSessionTokenFromExtension();
    window.location.href = '../login/index.html?redirect=authorize';
  }
});