document.addEventListener('DOMContentLoaded', () => {
  const auth = firebase.auth();
  const navContainer = document.querySelector('.nav-container');
  
  if (!navContainer) return;
  
  // Fast-sync cached token from localStorage to DOM attribute on load
  const cachedToken = localStorage.getItem('authToken');
  if (cachedToken) {
    document.documentElement.setAttribute('data-sprint-auth', cachedToken);
  }
  
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

  function syncSessionTokenToExtension(sessionToken) {
    localStorage.setItem('authToken', sessionToken);
    document.documentElement.setAttribute('data-sprint-auth', sessionToken);
  }

  function clearSessionTokenFromExtension() {
    localStorage.removeItem('authToken');
    document.documentElement.setAttribute('data-sprint-auth', 'logout');
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
          syncSessionTokenToExtension(syncData.sessionToken);
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