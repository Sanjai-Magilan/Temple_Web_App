document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const landingNavLinks = document.querySelector('.landing-nav-links');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            if (navLinks) {
                navLinks.classList.toggle('active');
            }
            if (landingNavLinks) {
                landingNavLinks.classList.toggle('active');
            }
            mobileMenuBtn.classList.toggle('open');
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (mobileMenuBtn && !mobileMenuBtn.contains(e.target) &&
            ((navLinks && !navLinks.contains(e.target)) || (landingNavLinks && !landingNavLinks.contains(e.target)))) {
            if (navLinks) navLinks.classList.remove('active');
            if (landingNavLinks) landingNavLinks.classList.remove('active');
            mobileMenuBtn.classList.remove('open');
        }
    });
});
