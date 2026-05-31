document.addEventListener('DOMContentLoaded', () => {
  const auth = firebase.auth();
  const navContainer = document.querySelector('.nav-container');
  if (!navContainer) return;

  // Fast-sync local storage attributes
  const cachedToken = localStorage.getItem('authToken');
  const cachedPremium = localStorage.getItem('isPremium');
  if (cachedToken) {
    document.documentElement.setAttribute('data-sprint-auth', cachedToken);
    document.documentElement.setAttribute('data-sprint-premium', cachedPremium || 'false');
  }

  // Set up robust routing relative path prefixes
  let prefix = '';
  if (
    window.location.pathname.includes('/authorize/') || 
    window.location.pathname.includes('/login/') || 
    window.location.pathname.includes('/payments/')
  ) {
    prefix = '../';
  }

  // Inject or verify stable navigation links on the fly
  const navLinks = navContainer.querySelector('.nav-links');
  if (navLinks) {
    let dashLink = navLinks.querySelector('.nav-link-dashboard');
    if (!dashLink) {
      dashLink = document.createElement('a');
      dashLink.className = 'nav-link nav-link-dashboard';
      dashLink.textContent = 'Dashboard';
      // Safe insertion order: locate Features to insert beside
      const featuresLink = Array.from(navLinks.children).find(el => el.textContent.trim() === 'Features');
      if (featuresLink) {
        featuresLink.after(dashLink);
      } else {
        navLinks.appendChild(dashLink);
      }
    }
  }

  // Setup actions container
  let navActions = navContainer.querySelector('.nav-actions');
  if (!navActions) {
    navActions = document.createElement('div');
    navActions.className = 'nav-actions';
    navContainer.appendChild(navActions);
  }

  let authNavBtn = document.getElementById('nav-auth-btn');
  if (!authNavBtn) {
    authNavBtn = document.createElement('a');
    authNavBtn.id = 'nav-auth-btn';
    navActions.insertBefore(authNavBtn, navActions.firstChild);
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
    const dashLink = navContainer.querySelector('.nav-link-dashboard');
    if (user) {
      // User is verified: dashboard link goes direct, nav actions shows sleek signout
      if (dashLink) {
        dashLink.href = prefix + 'authorize/index.html';
        if (window.location.pathname.includes('/authorize/')) {
          dashLink.classList.add('active');
        }
      }

      authNavBtn.textContent = 'Sign Out';
      authNavBtn.href = '#';
      authNavBtn.className = 'btn btn-secondary nav-btn';
      authNavBtn.onclick = (e) => {
        e.preventDefault();
        auth.signOut();
      };

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
        console.error('Sprint navbar auth sync failed:', e);
      }
    } else {
      // User is signed out: dashboard redirecting to login page cleanly
      if (dashLink) {
        dashLink.href = prefix + 'login/index.html?redirect=authorize';
        if (window.location.pathname.includes('/authorize/')) {
          dashLink.classList.remove('active');
        }
      }

      authNavBtn.textContent = 'Sign In';
      authNavBtn.href = prefix + 'login/index.html';
      authNavBtn.className = 'btn btn-secondary nav-btn';
      authNavBtn.onclick = null;

      clearSessionTokenFromExtension();
    }
  });
});