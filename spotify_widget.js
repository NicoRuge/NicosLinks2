/*! Spotify Widget (vanilla JS) for @Lord_NicolasX
   Drop-in usage:
   <div id="spotify-widget"></div>
   <script src="spotify_widget.js"></script>
*/
(function () {
    const CONFIG = {
        // REPLACE THIS with your actual backend URL from the setup guide
        // e.g., "https://your-site.netlify.app/.netlify/functions/spotify"
        apiEndpoint: "https://nico-ruge.netlify.app/.netlify/functions/spotify",

        targetId: "spotify-widget",
        intervalMs: 10000, // Refresh every 10s
        classPrefix: "sp-", // prefixes all CSS hooks

        // Mock data for initial display before backend is set up
        mockData: {
            isPlaying: true,
            item: {
                name: "Neon Nights",
                artists: [{ name: "Cyberpunk City" }],
                album: {
                    name: "Future Sounds",
                    images: [{ url: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=300&q=80" }]
                },
                duration_ms: 240000
            },
            progress_ms: 120000
        }
    };

    const $ = (sel) => document.querySelector(sel);
    const container = document.getElementById(CONFIG.targetId);
    if (!container) return;

    function safe(txt) {
        return String(txt == null ? "" : txt);
    }

    function formatTime(ms) {
        const s = Math.floor((ms / 1000) % 60);
        const m = Math.floor((ms / 1000) / 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function render(data) {
        if (!data || !data.item) {
            container.innerHTML = `<div class="${CONFIG.classPrefix}card">
          <div class="${CONFIG.classPrefix}title">Not Playing</div>
        </div>`;
            return;
        }

        const track = data.item;
        const isPlaying = data.isPlaying;
        const progress = data.progress_ms;
        const duration = track.duration_ms;
        const pct = (progress / duration) * 100;

        const coverUrl = track.album.images[0]?.url || '';
        const artistName = track.artists.map(a => a.name).join(', ');

        const statusText = isPlaying ? "Currently listening to:" : "Last listened to:";
        const iconClass = isPlaying ? "sp-icon-playing" : "sp-icon-stopped";
        const statusClass = isPlaying ? "sp-status-playing" : "sp-status-stopped";

        const html = `
        <div class="${CONFIG.classPrefix}card">
          <div class="${CONFIG.classPrefix}header">
            <span class="${CONFIG.classPrefix}icon ${iconClass}"></span>
            <span class="${CONFIG.classPrefix}status ${statusClass}">${statusText}</span>
          </div>
          
          <div class="${CONFIG.classPrefix}content">
            <img src="${coverUrl}" alt="${safe(track.album.name)}" class="${CONFIG.classPrefix}cover">
            <div class="${CONFIG.classPrefix}info">
              <div class="${CONFIG.classPrefix}track">${safe(track.name)}</div>
              <div class="${CONFIG.classPrefix}artist">${safe(artistName)}</div>
            </div>
          </div>
  
          <div class="${CONFIG.classPrefix}progress-container">
            <div class="${CONFIG.classPrefix}time">${formatTime(progress)}</div>
            <div class="${CONFIG.classPrefix}progress-bar">
               <div class="${CONFIG.classPrefix}progress-fill" style="width:${pct}%"></div>
            </div>
            <div class="${CONFIG.classPrefix}time">${formatTime(duration)}</div>
          </div>
        </div>
      `;
        container.innerHTML = html;
    }

    async function fetchStatus() {
        if (CONFIG.apiEndpoint === "MOCK_MODE") {
            console.log("Spotify Widget: Running in MOCK MODE. Update apiEndpoint in spotify_widget.js to connect to real data.");
            // Simulate progress in mock mode
            CONFIG.mockData.progress_ms += 1000;
            if (CONFIG.mockData.progress_ms > CONFIG.mockData.item.duration_ms) {
                CONFIG.mockData.progress_ms = 0;
            }
            render(CONFIG.mockData);
            return;
        }

        try {
            const res = await fetch(CONFIG.apiEndpoint);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            render(json);
        } catch (e) {
            console.error("Spotify Widget Error:", e);
            // Don't overwrite with error immediately to avoid flickering, maybe show small error indicator
        }
    }

    // initial render and refresh
    fetchStatus();
    setInterval(fetchStatus, CONFIG.intervalMs);
})();
