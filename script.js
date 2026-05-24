document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Sticky Navbar styling based on scroll state
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Intersection Observer for Scroll Animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.08
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    const scrollElements = document.querySelectorAll('.scroll-trigger');
    scrollElements.forEach(el => observer.observe(el));

    // 3. Perfect Smooth Scroll targeting with dynamic offset height adjustments
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            
            // If the hash is just "#", scroll gracefully to top
            if (targetId === '#') {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                return;
            }

            const target = document.querySelector(targetId);
            if (target) {
                const navHeight = navbar.offsetHeight;
                // Calculate position relative to document, accounting for the persistent header height plus a comfortable vertical buffer
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - 12;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // 4. Custom Mockup Tab Interactions (Post-Submission Feature Mockup)
    const subTabs = document.querySelectorAll('.sub-tab');
    const subPanes = document.querySelectorAll('.submission-pane');

    subTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            subTabs.forEach(t => t.classList.remove('active'));
            subPanes.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const targetPaneId = `pane-${tab.getAttribute('data-tab')}`;
            const targetPane = document.getElementById(targetPaneId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });
});