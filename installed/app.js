const auth = firebase.auth();
const syncStatusBox = document.getElementById('auth-sync-status');
const syncSpinner = document.getElementById('sync-spinner');
const syncTextStatus = document.getElementById('sync-text-status');
const actionWrapper = document.getElementById('auth-action-wrapper');

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
    // User is logged in - attempt sync
    syncTextStatus.textContent = "Authenticating secure sync...";
    
    try {
      const syncData = await performUserSync(user);
      
      // Update status block UI to show success
      syncSpinner.classList.add('hidden');
      syncStatusBox.style.borderColor = "#bbf7d0";
      syncStatusBox.style.background = "#f0fdf4";
      syncStatusBox.style.color = "#166534";
      
      const tierName = syncData.isPremium ? "Premium member" : "Free tier user";
      syncTextStatus.textContent = `Sync Complete: Connected as ${user.email} (${tierName})`;

      // Provide Dashboard and return keys
      actionWrapper.innerHTML = `
        <a href="../dashboard/index.html" class="btn btn-primary nav-btn">View My Dashboard</a>
        <a href="https://leetcode.com" target="_blank" class="btn btn-secondary nav-btn">Return to Coding</a>
      `;
    } catch (e) {
      console.error("Onboarding auth sync failed:", e);
      syncSpinner.classList.add('hidden');
      syncStatusBox.style.borderColor = "#fca5a5";
      syncStatusBox.style.background = "#fef2f2";
      syncStatusBox.style.color = "#991b1b";
      syncTextStatus.textContent = "Sync connection failed. Please sign in manually to re-establish.";

      actionWrapper.innerHTML = `
        <a href="../login/index.html?redirect=installed" class="btn btn-primary nav-btn">Sign In to Retry Sync</a>
      `;
    }
  } else {
    // User is logged out - prompt manual login redirect
    clearSessionTokenFromExtension();
    syncSpinner.classList.add('hidden');
    syncStatusBox.style.borderColor = "var(--border)";
    syncStatusBox.style.background = "var(--bg-muted)";
    syncStatusBox.style.color = "var(--text-secondary)";
    syncTextStatus.textContent = "Not Synced: Authentication Required";

    actionWrapper.innerHTML = `
      <a href="../login/index.html?redirect=installed" class="btn btn-primary nav-btn">Sign In & Complete Sync</a>
    `;
  }
});

