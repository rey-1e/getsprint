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

    // ── Live Interactive Theme Showroom ──
    const headerElement = document.getElementById('mock-header');
    const bodyElement = document.getElementById('mock-body');
    const displayContainer = document.getElementById('showroom-display');
    const swatches = document.querySelectorAll('.s-dot');
    
    // Config states mapping matching standard stylesheet layers exactly
    const themeConfigs = {
        amethyst: { bg1: '#131124', bg2: '#1a1631', border: '#2a254c', accent: '#9d4edd' },
        forest:   { bg1: '#0c1b12', bg2: '#12271a', border: '#1a3b26', accent: '#10b981' },
        sunset:   { bg1: '#1c1414', bg2: '#281d1d', border: '#3b2929', accent: '#ff6b6b' },
        space:    { bg1: '#0a1120', bg2: '#0f1a30', border: '#1a2d52', accent: '#3b82f6' },
        gruvbox:  { bg1: '#282828', bg2: '#3c3836', border: '#32302f', accent: '#fe8019' }
    };

    if (displayContainer && swatches.length > 0) {
        // Initialize default loaded Amethyst variables
        document.documentElement.style.setProperty('--mock-bg-1', '#131124');
        document.documentElement.style.setProperty('--mock-bg-2', '#1a1631');
        document.documentElement.style.setProperty('--mock-border', '#2a254c');
        document.documentElement.style.setProperty('--swatch-accent', '#9d4edd');

        swatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                const themeKey = swatch.getAttribute('data-theme');
                const config = themeConfigs[themeKey];
                
                if (!config) return;

                // Deactivate previous active dots
                swatches.forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');

                // Apply style changes directly to CSS variables to animate gracefully
                document.documentElement.style.setProperty('--mock-bg-1', config.bg1);
                document.documentElement.style.setProperty('--mock-bg-2', config.bg2);
                document.documentElement.style.setProperty('--mock-border', config.border);
                document.documentElement.style.setProperty('--swatch-accent', config.accent);
            });
        });
    }
});