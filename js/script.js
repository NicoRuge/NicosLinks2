document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    const getPreferredTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const setTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        // Notify travelling and chess iframes
        const travellingFrame = document.querySelector('iframe[src="travelling.html"]');
        if (travellingFrame && travellingFrame.contentWindow) {
            travellingFrame.contentWindow.postMessage({ type: 'theme-change', theme: theme }, '*');
        }
        const chessFrame = document.querySelector('iframe[src="chess.html"]');
        if (chessFrame && chessFrame.contentWindow) {
            chessFrame.contentWindow.postMessage({ type: 'theme-change', theme: theme }, '*');
        }
        const departureFrame = document.querySelector('iframe[src="departure.html"]');
        if (departureFrame && departureFrame.contentWindow) {
            departureFrame.contentWindow.postMessage({ type: 'theme-change', theme: theme }, '*');
        }

        if (theme === 'dark') {
            themeIcon.src = 'assets/icons/sun.svg';
            themeToggle.setAttribute('aria-label', 'Switch to Light Mode');
        } else {
            themeIcon.src = 'assets/icons/moon.svg';
            themeToggle.setAttribute('aria-label', 'Switch to Dark Mode');
        }
    };

    setTheme(getPreferredTheme());

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });

    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const sections = document.querySelectorAll('.content-section');

    const switchSection = (targetId) => {
        sections.forEach(section => {
            section.classList.remove('active');
        });

        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.target === targetId) {
                link.classList.add('active');
            }
        });

        const hash = targetId.replace('-section', '');
        if (hash === 'home') {
            history.pushState(null, null, ' ');
        } else {
            history.pushState(null, null, `#${hash}`);
        }

        if (targetId === 'chess-section') {
            const chessFrame = document.querySelector('iframe[src="chess.html"]');
            const theme = document.documentElement.getAttribute('data-theme') || 'light';
            if (chessFrame && chessFrame.contentWindow) {
                chessFrame.contentWindow.postMessage({ type: 'theme-change', theme }, '*');
            }
        }

        if (targetId === 'departure-section') {
            const departureFrame = document.querySelector('iframe[src="departure.html"]');
            const theme = document.documentElement.getAttribute('data-theme') || 'light';
            if (departureFrame && departureFrame.contentWindow) {
                departureFrame.contentWindow.postMessage({ type: 'theme-change', theme }, '*');
            }
        }
    };

    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.dataset.target;
            switchSection(targetId);
        });
    });

    const handleHashChange = () => {
        const hash = window.location.hash.slice(1);
        if (hash) {
            const targetId = `${hash}-section`;
            if (document.getElementById(targetId)) {
                switchSection(targetId);
            }
        } else {
            switchSection('home-section');
        }
    };

    window.addEventListener('hashchange', handleHashChange);

    // Mobile Menu Logic
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarClose = document.getElementById('sidebar-close');

    const toggleMenu = () => {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('active');
        const isOpen = sidebar.classList.contains('open');
        mobileMenuToggle.setAttribute('aria-expanded', isOpen);

        if (isOpen) {
            mobileMenuToggle.innerHTML = '<img src="assets/icons/x.svg" alt="" class="icon">';
        } else {
            mobileMenuToggle.innerHTML = '<img src="assets/icons/menu.svg" alt="" class="icon">';
        }
    };

    const closeMenu = () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        mobileMenuToggle.innerHTML = '<img src="assets/icons/menu.svg" alt="" class="icon">';
    };

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', toggleMenu);
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMenu);
    }

    if (sidebarClose) {
        sidebarClose.addEventListener('click', closeMenu);
    }

    // Close menu when clicking a link on mobile
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeMenu();
            }
        });
    });

    /* Blog logic moved to js/blog.js */

    handleHashChange();
});
