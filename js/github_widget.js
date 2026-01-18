document.addEventListener('DOMContentLoaded', () => {
    const REPO_OWNER = "NicoRuge";
    const REPO_NAME = "NicosLinks2";
    const CONTAINER_ID = "github-widget";

    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    // Loading State
    container.innerHTML = `
        <div class="gh-loading">
            <span class="gh-spinner"></span>
            <span>Fetching Repository Data...</span>
        </div>
    `;

    async function fetchGitHubData() {
        try {
            // Fetch Repo Info
            const repoRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`);
            if (!repoRes.ok) throw new Error("Failed to fetch repo info");
            const repoData = await repoRes.json();

            // Fetch Commits (List)
            const commitsListRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/commits?per_page=5`);
            if (!commitsListRes.ok) throw new Error("Failed to fetch commits");
            const commitsList = await commitsListRes.json();

            // Fetch Detailed Stats for each commit (parallel)
            const commitsData = await Promise.all(commitsList.map(async (c) => {
                try {
                    const detailRes = await fetch(c.url);
                    if (!detailRes.ok) return c;
                    return await detailRes.json();
                } catch (e) {
                    return c;
                }
            }));

            // Fetch Languages
            const langRes = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/languages`);
            if (!langRes.ok) throw new Error("Failed to fetch languages");
            const langData = await langRes.json();

            render(repoData, commitsData, langData);
        } catch (error) {
            console.error("GitHub Widget Error:", error);
            container.innerHTML = `<div class="gh-error">Failed to load GitHub data. (${error.message})</div>`;
        }
    }

    const LANGUAGE_COLORS = {
        "JavaScript": "#f1e05a",
        "HTML": "#e34c26",
        "CSS": "#563d7c",
        "Shell": "#89e051",
        "Python": "#3572A5",
        "Java": "#b07219",
        "TypeScript": "#2b7489",
        "Vue": "#41b883",
        "C++": "#f34b7d",
        "C": "#555555",
        "C#": "#178600",
        "Rust": "#dea584",
        "Go": "#00ADD8",
        "Ruby": "#701516",
        "PHP": "#4F5D95"
    };

    function render(repo, commits, languages) {
        const lastPushed = new Date(repo.pushed_at).toLocaleDateString();

        // Process Languages
        const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);
        const langStats = Object.keys(languages).map(lang => {
            const bytes = languages[lang];
            const pct = (bytes / totalBytes) * 100;
            return {
                name: lang,
                pct: pct,
                formattedPct: pct.toFixed(1) + "%",
                color: LANGUAGE_COLORS[lang] || "#cccccc"
            };
        }).sort((a, b) => b.pct - a.pct); // Sort by percentage descending

        const langBarHtml = langStats.map(l =>
            `<div class="gh-lang-segment" style="width: ${l.pct}%; background-color: ${l.color};" title="${l.name}: ${l.formattedPct}"></div>`
        ).join('');

        const langLegendHtml = langStats.map(l => `
            <div class="gh-lang-item">
                <span class="gh-lang-dot" style="background-color: ${l.color};"></span>
                <span class="gh-lang-name">${l.name}</span>
                <span class="gh-lang-pct">${l.formattedPct}</span>
            </div>
        `).join('');

        let commitsHtml = commits.map(c => {
            const msg = c.commit.message.split('\n')[0]; // First line only
            const date = new Date(c.commit.author.date).toLocaleDateString();
            const author = c.commit.author.name;
            const url = c.html_url;

            // Stats
            const additions = c.stats ? c.stats.additions : 0;
            const deletions = c.stats ? c.stats.deletions : 0;

            return `
                <a href="${url}" target="_blank" rel="noopener noreferrer" class="gh-commit-item">
                    <div class="gh-commit-row">
                        <div class="gh-commit-msg">${msg}</div>
                        <div class="gh-commit-stats">
                            ${additions > 0 ? `<span class="gh-stats-add">+${additions}</span>` : ''}
                            ${deletions > 0 ? `<span class="gh-stats-del">-${deletions}</span>` : ''}
                        </div>
                    </div>
                    <div class="gh-commit-meta">
                        <span class="gh-commit-author">${author}</span>
                        <span class="gh-commit-date">${date}</span>
                    </div>
                </a>
            `;
        }).join('');

        const html = `
            <div class="gh-card">
                <div class="gh-header">
                    <div class="gh-title-row">
                        <span class="gh-icon"></span>
                        <a href="${repo.html_url}" target="_blank" class="gh-repo-name">${repo.full_name}</a>
                    </div>
                    <div class="gh-desc">${repo.description || "No description provided."}</div>
                    
                    <div class="gh-languages">
                        <h4 class="gh-section-subtitle">Languages</h4>
                        <div class="gh-lang-bar">
                            ${langBarHtml}
                        </div>
                        <div class="gh-lang-legend">
                            ${langLegendHtml}
                        </div>
                    </div>
                </div>
                <div class="gh-body">
                    <h3 class="gh-section-title">Latest Commits</h3>
                    <div class="gh-commits-list">
                        ${commitsHtml}
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    fetchGitHubData();
});
