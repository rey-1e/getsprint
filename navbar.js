document.addEventListener('DOMContentLoaded', () => {
  const auth = firebase.auth();
  const navContainer = document.querySelector('.nav-container');
  
  if (!navContainer) return;
  
  // Fast-sync tokens from localStorage on immediate document read
  const cachedToken = localStorage.getItem('authToken');
  const cachedPremium = localStorage.getItem('isPremium');
  if (cachedToken) {
    document.documentElement.setAttribute('data-sprint-auth', cachedToken);
    document.documentElement.setAttribute('data-sprint-premium', cachedPremium || 'false');
  }
  
  let authNavBtn = document.getElementById('nav-auth-btn');
  if (!authNavBtn) {
    authNavBtn = document.createElement('a');
    authNavBtn.id = 'nav-auth-btn';
    authNavBtn.className = 'btn btn-secondary nav-btn';
    authNavBtn.style.marginLeft = '12px';
    
    const targetParent = navContainer.querySelector('.nav-links')?.parentNode || navContainer;
    targetParent.appendChild(authNavBtn);
  }

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

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      authNavBtn.textContent = 'Account Dashboard';
      authNavBtn.href = '/authorize/index.html'; 
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
          syncSessionTokenToExtension(syncData.sessionToken, syncData.isPremium);
        }
      } catch (e) {
        console.error("Sprint navbar: Silent authentication sync failed:", e);
      }
    } else {
      authNavBtn.textContent = 'Sign In';
      authNavBtn.href = '/login/index.html';
      authNavBtn.className = 'btn btn-primary nav-btn';
      clearSessionTokenFromExtension();
    }
  });
});