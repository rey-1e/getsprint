/**
 * Sprint Update Splash Page Handler
 */
document.addEventListener('DOMContentLoaded', () => {
    // Dynamically retrieve the extension version if executed in Chrome environment
    const versionBadge = document.getElementById('version-badge');
    if (versionBadge && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
        try {
            const manifest = chrome.runtime.getManifest();
            if (manifest && manifest.version) {
                versionBadge.textContent = `v${manifest.version}`;
            }
        } catch (error) {
            console.log("Could not fetch extension manifest version, keeping default placeholder.");
        }
    }

    // Gentle scroll indicator animation (optional interaction tracking)
    const changelogItems = document.querySelectorAll('.changelog-list li');
    changelogItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(10px)';
        item.style.transition = `opacity 0.4s ease ${index * 0.1}s, transform 0.4s ease ${index * 0.1}s`;
        
        // Quick deferred execution to trigger entrance transitions smoothly
        setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, 50);
    });
});