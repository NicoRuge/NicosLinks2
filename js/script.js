document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('.material-symbols-rounded');
    const themeText = themeToggle.querySelector('.sidebar-text');

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

        // Notify Railmap iframe
        const railmapFrame = document.querySelector('iframe[src="railmap.html"]');
        if (railmapFrame && railmapFrame.contentWindow) {
            railmapFrame.contentWindow.postMessage({ type: 'theme-change', theme: theme }, '*');
        }

        if (theme === 'dark') {
            themeIcon.textContent = 'light_mode';
            themeText.textContent = 'Light Mode';
            themeToggle.setAttribute('aria-label', 'Switch to Light Mode');
        } else {
            themeIcon.textContent = 'dark_mode';
            themeText.textContent = 'Dark Mode';
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
            mobileMenuToggle.innerHTML = '<span class="material-symbols-rounded">close</span>';
        } else {
            mobileMenuToggle.innerHTML = '<span class="material-symbols-rounded">menu</span>';
        }
    };

    const closeMenu = () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
        mobileMenuToggle.setAttribute('aria-expanded', 'false');
        mobileMenuToggle.innerHTML = '<span class="material-symbols-rounded">menu</span>';
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

    handleHashChange();
});
