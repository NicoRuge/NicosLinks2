(function () {
    const CONFIG = {
        apiEndpoint: "https://nico-ruge.netlify.app/.netlify/functions/spotify",
        targetId: "spotify-widget",
        fetchIntervalMs: 10000,
        updateIntervalMs: 1000,
        classPrefix: "sp-",

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

    let currentState = {
        data: null,
        lastFetchTime: 0,
        currentTrackSignature: null
    };

    function safe(txt) {
        return String(txt == null ? "" : txt);
    }

    function formatTime(ms) {
        const s = Math.floor((ms / 1000) % 60);
        const m = Math.floor((ms / 1000) / 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function getTrackSignature(data) {
        if (!data || !data.item) return "no-track";
        return `${data.item.name}-${data.item.id}`; // Use ID for uniqueness if available, or name
    }

    function render() {
        const data = currentState.data;

        if (!data || !data.item) {
            if (currentState.currentTrackSignature !== "no-track") {
                container.innerHTML = `<div class="${CONFIG.classPrefix}card">
                  <div class="${CONFIG.classPrefix}title">Not Playing</div>
                </div>`;
                currentState.currentTrackSignature = "no-track";
            }
            return;
        }

        const item = data.item;
        const isPlaying = data.isPlaying;

        // Calculate interpolated progress
        let progress = data.progress_ms;
        if (isPlaying) {
            const elapsed = Date.now() - currentState.lastFetchTime;
            progress += elapsed;
            if (progress > item.duration_ms) progress = item.duration_ms;
        }

        const duration = item.duration_ms;
        const pct = (progress / duration) * 100;

        const newSignature = getTrackSignature(data);

        // If track changed or we are coming from "not playing" state, do full render
        if (newSignature !== currentState.currentTrackSignature) {
            // Determine if it's a track or an episode
            const isEpisode = item.type === 'episode';

            let coverUrl = '';
            let title = item.name;
            let artistName = '';
            let contextName = ''; // Album or Show name

            if (isEpisode) {
                // Podcast Episode
                coverUrl = item.images?.[0]?.url || item.show?.images?.[0]?.url || '';
                artistName = item.show?.publisher || item.show?.name || '';
                contextName = item.show?.name || '';
            } else {
                // Music Track
                coverUrl = item.album?.images?.[0]?.url || '';
                artistName = item.artists?.map(a => a.name).join(', ') || '';
                contextName = item.album?.name || '';
            }

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
                <img src="${coverUrl}" alt="${safe(contextName)}" class="${CONFIG.classPrefix}cover">
                <div class="${CONFIG.classPrefix}info">
                  <div class="${CONFIG.classPrefix}track">${safe(title)}</div>
                  <div class="${CONFIG.classPrefix}artist">${safe(artistName)}</div>
                </div>
              </div>
      
              ${isPlaying ? `
              <div class="${CONFIG.classPrefix}progress-container" id="sp-progress-container">
                <div class="${CONFIG.classPrefix}time" id="sp-current-time">${formatTime(progress)}</div>
                <div class="${CONFIG.classPrefix}progress-bar">
                   <div class="${CONFIG.classPrefix}progress-fill" id="sp-progress-fill" style="width:${pct}%"></div>
                </div>
                <div class="${CONFIG.classPrefix}time">${formatTime(duration)}</div>
              </div>` : ''}
            </div>
          `;
            container.innerHTML = html;
            currentState.currentTrackSignature = newSignature;
        } else if (isPlaying) {
            // Just update progress if track is same and playing
            const timeEl = document.getElementById("sp-current-time");
            const fillEl = document.getElementById("sp-progress-fill");

            if (timeEl) timeEl.textContent = formatTime(progress);
            if (fillEl) fillEl.style.width = `${pct}%`;
        }
    }

    async function fetchStatus() {
        if (CONFIG.apiEndpoint === "MOCK_MODE") {
            console.log("Spotify Widget: Running in MOCK MODE. Update apiEndpoint in spotify_widget.js to connect to real data.");
            CONFIG.mockData.progress_ms += CONFIG.fetchIntervalMs;
            if (CONFIG.mockData.progress_ms > CONFIG.mockData.item.duration_ms) {
                CONFIG.mockData.progress_ms = 0;
            }
            currentState.data = CONFIG.mockData;
            currentState.lastFetchTime = Date.now();
            render();
            return;
        }

        try {
            const res = await fetch(CONFIG.apiEndpoint);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            console.log("Spotify Widget Response:", json); // DEBUG
            currentState.data = json;
            currentState.lastFetchTime = Date.now();
            render();
        } catch (e) {
            console.error("Spotify Widget Error:", e);
        }
    }

    fetchStatus();
    setInterval(fetchStatus, CONFIG.fetchIntervalMs);
    setInterval(render, CONFIG.updateIntervalMs);
})();
