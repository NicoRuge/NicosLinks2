document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('.material-symbols-rounded');

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

        // Update icon
        if (theme === 'dark') {
            themeIcon.textContent = 'light_mode';
            themeToggle.setAttribute('aria-label', 'Switch to Light Mode');
        } else {
            themeIcon.textContent = 'dark_mode';
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

    // --- Modal Logic ---
    const setupModal = (cardId, modalId) => {
        const card = document.getElementById(cardId);
        const modal = document.getElementById(modalId);
        if (!card || !modal) return;

        const closeModalBtn = modal.querySelector('.close-modal');

        const openModal = (e) => {
            e.preventDefault();
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        };

        const closeModal = () => {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        };

        card.addEventListener('click', openModal);

        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeModal);
        }

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeModal();
            }
        });
    };

    setupModal('railmap-card', 'railmap-modal');
    setupModal('equipment-card', 'equipment-modal');
});
