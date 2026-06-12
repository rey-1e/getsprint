/**
 * Sprint Update Splash Page Handler
 */
document.addEventListener('DOMContentLoaded', () => {
    // Dynamically retrieve the extension version if executed in Chrome environment
    const versionBadge = document.getElementById('version-badge');
    if (versionBadge && typeof chrome !== 'undefined' && chrome.runtime?.getManifest) {
        try {
            const manifest = chrome.runtime.getManifest();
            if (manifest?.version) {
                versionBadge.textContent = `v${manifest.version}`;
            }
        } catch (error) {
            console.log("Could not fetch extension manifest version.");
        }
    }

    // Rapid visual theme switching simulation
    const slides = document.querySelectorAll('.theme-slide');
    const themeIndicator = document.getElementById('theme-name-indicator');
    let currentIndex = 0;

    if (slides.length > 0) {
        setInterval(() => {
            // Remove active state from current slide
            slides[currentIndex].classList.remove('active');
            
            // Advance index
            currentIndex = (currentIndex + 1) % slides.length;
            
            // Apply active state to next slide
            slides[currentIndex].classList.add('active');
            
            // Dynamically update corresponding theme visual label
            if (themeIndicator) {
                const nextThemeName = slides[currentIndex].getAttribute('data-theme-name');
                themeIndicator.textContent = nextThemeName || "Classic Theme";
            }
        }, 1100); // Dynamic swapper transition rate
    }
});