document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('.material-symbols-rounded');
    const themeText = themeToggle.querySelector('.sidebar-text');

    // Check for saved theme preference, otherwise use system preference
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

        // Update icon and text
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

    // Initialize theme
    setTheme(getPreferredTheme());

    // Toggle theme on click
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            setTheme(e.matches ? 'dark' : 'light');
        }
    });

    // --- Navigation Logic ---
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const sections = document.querySelectorAll('.content-section');

    const switchSection = (targetId) => {
        // Hide all sections
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update sidebar active state
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.target === targetId) {
                link.classList.add('active');
            }
        });

        // Update URL hash
        const hash = targetId.replace('-section', '');
        if (hash === 'home') {
            history.pushState(null, null, ' '); // Clear hash for home
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

    // Handle initial hash
    const handleHashChange = () => {
        const hash = window.location.hash.slice(1); // Remove #
        if (hash) {
            const targetId = `${hash}-section`;
            if (document.getElementById(targetId)) {
                switchSection(targetId);
            }
        } else {
            switchSection('home-section');
        }
    };

    // Listen for hash changes (back/forward button)
    window.addEventListener('hashchange', handleHashChange);

    // Initial check
    handleHashChange();
});
