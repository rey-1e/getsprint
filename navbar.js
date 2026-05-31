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
    
    // Append beside primary CTA in the navbar layout
    const targetParent = navContainer.querySelector('.nav-links')?.parentNode || navContainer;
    targetParent.appendChild(authNavBtn);
  }

  auth.onAuthStateChanged(async (user) => {
    if (user) {
      authNavBtn.textContent = 'Account Dashboard';
      authNavBtn.href = '/payments/index.html'; 
      authNavBtn.className = 'btn btn-secondary nav-btn';
      
      const idToken = await user.getIdToken();
      
      try {
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
          localStorage.setItem('sprint_authToken', syncData.sessionToken);
          document.documentElement.setAttribute('data-sprint-auth', syncData.sessionToken);
        }
      } catch (e) {
        console.error("Silent authentication sync failed:", e);
      }
    } else {
      authNavBtn.textContent = 'Sign In';
      authNavBtn.href = '/login/index.html';
      authNavBtn.className = 'btn btn-primary nav-btn';
      
      localStorage.removeItem('sprint_authToken');
      document.documentElement.setAttribute('data-sprint-auth', 'logout');
    }
  });
});