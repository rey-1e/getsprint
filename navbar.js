document.addEventListener('DOMContentLoaded', () => {
  const auth = firebase.auth();
  const navContainer = document.querySelector('.nav-container');
  
  if (!navContainer) return;
  
  // Find or create the auth action element in the navbar
  let authNavBtn = document.getElementById('nav-auth-btn');
  if (!authNavBtn) {
    authNavBtn = document.createElement('a');
    authNavBtn.id = 'nav-auth-btn';
    authNavBtn.className = 'btn btn-secondary nav-btn';
    authNavBtn.style.marginLeft = '12px';
    
    const targetParent = navContainer.querySelector('.nav-links')?.parentNode || navContainer;
    targetParent.appendChild(authNavBtn);
  }

  async function syncSessionTokenToExtension(sessionToken) {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ authToken: sessionToken });
      }
    } catch (e) {
      console.error("Sprint navbar: Failed to sync token to extension storage:", e);
    }
  }

  async function clearSessionTokenFromExtension() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.remove('authToken');
      }
    } catch (e) {
      console.error("Sprint navbar: Failed to clear token from extension storage:", e);
    }
  }

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      authNavBtn.textContent = 'Account Dashboard';
      authNavBtn.href = '/payments/index.html'; 
      authNavBtn.className = 'btn btn-secondary nav-btn';

      try {
        const idToken = await user.getIdToken(true);
        const syncRes = await fetch('https://syncuser-i6ptizncma-uc.a.run.app', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
            'X-Client-Version': '3.0'
          }
        });
        const syncData = await syncRes.json();

        if (syncRes.ok && syncData.success && syncData.sessionToken) {
          await syncSessionTokenToExtension(syncData.sessionToken);
        }
      } catch (e) {
        console.error("Sprint navbar: Silent authentication sync failed:", e);
      }
    } else {
      authNavBtn.textContent = 'Sign In';
      authNavBtn.href = '/login/index.html';
      authNavBtn.className = 'btn btn-primary nav-btn';
      await clearSessionTokenFromExtension();
    }
  });
});