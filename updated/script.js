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
            console.log("Could not fetch extension manifest version, keeping default placeholder.");
        }
    }

    // Gentle scroll indicator animation for entrance transitions
    const changelogItems = document.querySelectorAll('.changelog-list li');
    changelogItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(10px)';
        item.style.transition = `opacity 0.4s ease ${index * 0.1}s, transform 0.4s ease ${index * 0.1}s`;
        
        setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, 50);
    });

    // ── Live Interactive Theme Showroom ──
    const displayContainer = document.getElementById('showroom-display');
    const swatches = document.querySelectorAll('.s-dot');
    
    // Config states mapping matching standard stylesheet layers exactly
    const themeConfigs = {
        amethyst: { bg1: '#0d0b18', bg2: '#1a1631', border: '#231e42', accent: '#9d4edd' },
        forest:   { bg1: '#07100b', bg2: '#12271a', border: '#1a3625', accent: '#10b981' },
        sunset:   { bg1: '#120d0d', bg2: '#281d1d', border: '#342525', accent: '#ff6b6b' },
        space:    { bg1: '#050a12', bg2: '#0f1a30', border: '#162545', accent: '#3b82f6' },
        dracula:  { bg1: '#1e1f29', bg2: '#343746', border: '#3e4254', accent: '#ff79c6' },
        gruvbox:  { bg1: '#1d2021', bg2: '#3c3836', border: '#504945', accent: '#fe8019' }
    };

    if (displayContainer && swatches.length > 0) {
        // Initialize default loaded Amethyst variables
        document.documentElement.style.setProperty('--mock-bg-1', '#0d0b18');
        document.documentElement.style.setProperty('--mock-bg-2', '#1a1631');
        document.documentElement.style.setProperty('--mock-border', '#231e42');
        document.documentElement.style.setProperty('--swatch-accent', '#9d4edd');

        swatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                const themeKey = swatch.getAttribute('data-theme');
                const config = themeConfigs[themeKey];
                
                if (!config) return;

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