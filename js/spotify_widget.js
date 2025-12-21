(function () {
  const CONFIG = {
    apiEndpoint: "https://nico-ruge.netlify.app/.netlify/functions/spotify",
    targetId: "spotify-widget",
    fetchIntervalMs: 10000,
    updateIntervalMs: 1000,
    minLoadingTime: 5000,
    classPrefix: "sp-"
  };

  const $ = (sel) => document.querySelector(sel);
  const container = document.getElementById(CONFIG.targetId);
  if (!container) return;

  let currentState = {
    data: null,
    lastFetchTime: 0,
    currentTrackSignature: null,
    loadingStartTime: null
  };
  function safe(txt) {
    return String(txt == null ? "" : txt);
  }

  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    } else {
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
  }

  function getTrackSignature(data) {
    if (!data || !data.item) return "no-track";
    return `${data.item.name}-${data.item.id}`;
  }

  function renderLoading() {
    currentState.loadingStartTime = Date.now();
    container.innerHTML = `<div class="${CONFIG.classPrefix}card">
          <div class="${CONFIG.classPrefix}header">
            <span class="${CONFIG.classPrefix}icon ${CONFIG.classPrefix}icon-loading"></span>
            <span class="${CONFIG.classPrefix}status">Loading...</span>
          </div>
          <div class="${CONFIG.classPrefix}content">
            <div class="${CONFIG.classPrefix}cover" style="background-color: var(--md-sys-color-surface-variant);"></div>
            <div class="${CONFIG.classPrefix}info">
              <div class="${CONFIG.classPrefix}track" style="background-color: var(--md-sys-color-surface-variant); border-radius: 4px; height: 1rem; width: 70%;"></div>
              <div class="${CONFIG.classPrefix}artist" style="background-color: var(--md-sys-color-surface-variant); border-radius: 4px; height: 0.85rem; width: 50%; margin-top: 4px;"></div>
            </div>
          </div>
        </div>`;
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


    let progress = data.progress_ms;
    if (isPlaying) {
      const elapsed = Date.now() - currentState.lastFetchTime;
      progress += elapsed;
      if (progress > item.duration_ms) progress = item.duration_ms;
    }

    const duration = item.duration_ms;
    const pct = (progress / duration) * 100;

    const newSignature = getTrackSignature(data);

    if (newSignature !== currentState.currentTrackSignature) {
      const isEpisode = item.type === 'episode';

      let coverUrl = '';
      let title = item.name;
      let artistName = '';
      let contextName = '';
      let trackUrl = '';
      let artistUrl = '';

      if (isEpisode) {
        coverUrl = item.images?.[0]?.url || item.show?.images?.[0]?.url || '';
        artistName = item.show?.publisher || item.show?.name || '';
        contextName = item.show?.name || '';
        trackUrl = item.external_urls?.spotify || '#';
        artistUrl = item.show?.external_urls?.spotify || '#';
      } else {
        coverUrl = item.album?.images?.[0]?.url || '';
        artistName = item.artists?.map(a => a.name).join(', ') || '';
        contextName = item.album?.name || '';
        trackUrl = item.external_urls?.spotify || '#';
        artistUrl = item.artists?.[0]?.external_urls?.spotify || '#';
      }

      const statusText = isPlaying ? "Spotify - Currently listening to:" : "Spotify - Last listened to:";
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
                  <a href="${trackUrl}" target="_blank" rel="noopener noreferrer" class="${CONFIG.classPrefix}track">${safe(title)}</a>
                  <a href="${artistUrl}" target="_blank" rel="noopener noreferrer" class="${CONFIG.classPrefix}artist">${safe(artistName)}</a>
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
      const timeEl = document.getElementById("sp-current-time");
      const fillEl = document.getElementById("sp-progress-fill");

      if (timeEl) timeEl.textContent = formatTime(progress);
      if (fillEl) fillEl.style.width = `${pct}%`;
    }
  }

  async function fetchStatus() {
    try {
      const res = await fetch(CONFIG.apiEndpoint);
      if (!res.ok) {
        const errText = await res.text();
        console.error("Spotify Backend Error:", errText);
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      const json = await res.json();
      console.log("Spotify Widget Response:", json);
      currentState.data = json;
      currentState.lastFetchTime = Date.now();

      const elapsed = Date.now() - currentState.loadingStartTime;
      const remaining = Math.max(0, CONFIG.minLoadingTime - elapsed);

      setTimeout(() => {
        render();
      }, remaining);
    } catch (e) {
      console.error("Spotify Widget Error:", e);
    }
  }

  renderLoading();
  fetchStatus();

  setInterval(fetchStatus, CONFIG.fetchIntervalMs);
  setInterval(render, CONFIG.updateIntervalMs);
})();
