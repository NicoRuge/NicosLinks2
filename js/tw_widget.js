
/*! Träwelling Widget (vanilla JS) for @Lord_NicolasX
   Drop-in usage:
   <div id="twlngwidget"></div>
   <script src="tw_widget.js"></script>
*/
(function () {
  const CONFIG = {
    user: "Lord_NicolasX", // Träwelling username without @
    targetId: "twlngwidget",
    intervalMs: 60000,
    locale: "en", // "de" or "en"
    linkText: { de: "Träwelling öffnen", en: "Open Träwelling" },
    textNow: { de: "Nico ist gerade unterwegs", en: "Currently travelling:" },
    textLastH: {
      de: h => `Nico war zuletzt vor ${h} Stunden unterwegs`,
      en: h => `Last travelled ${h}h ago:`
    },
    textLastM: {
      de: m => `Nico war zuletzt vor ${m} Minuten unterwegs`,
      en: m => `Last travelled ${m}min ago:`
    },
    classPrefix: "tw-" // prefixes all CSS hooks to avoid collisions
  };

  const $ = (sel) => document.querySelector(sel);
  const container = document.getElementById(CONFIG.targetId);
  if (!container) return;

  let widgetState = {};

  function safe(txt) {
    return String(txt == null ? "" : txt);
  }

  function renderLoading() {
    container.innerHTML = `<div class="${CONFIG.classPrefix}card" style="text-decoration: none;">
      <div class="${CONFIG.classPrefix}header">
        <span class="${CONFIG.classPrefix}icon ${CONFIG.classPrefix}icon-loading"></span>
        <span class="${CONFIG.classPrefix}status">Getting Träwelling Data...</span>
      </div>
      <div class="${CONFIG.classPrefix}content" style="align-items: center; display: flex;">
           <div style="width: 48px; height: 48px; background: var(--md-sys-color-surface-variant); border-radius: 8px; margin-right: 12px;"></div>
           <div class="${CONFIG.classPrefix}info" style="flex: 1;">
               <div style="height: 1rem; width: 60%; background: var(--md-sys-color-surface-variant); border-radius: 4px; margin-bottom: 6px;"></div>
               <div style="height: 0.8rem; width: 40%; background: var(--md-sys-color-surface-variant); border-radius: 4px;"></div>
           </div>
      </div>
    </div>`;
  }

  function shortenLineName(name) {
    // Remove typical prefixes the original widget cleaned up
    return safe(name).replace(/^STR\s+/i, "").replace(/^BUS\s+/i, "");
  }

  function rilSpan(id) {
    if (!id) return "";
    return `<span class="${CONFIG.classPrefix}bigger">${safe(id)}</span><br>`;
  }

  function headline(nowTravelling, dep, arr) {
    const L = CONFIG.locale;
    if (nowTravelling) return CONFIG.textNow[L];
    const now = new Date();
    const diff = now - arr;
    const h = Math.floor(diff / 36e5);
    if (h > 0) return CONFIG.textLastH[L](h);
    const m = Math.max(1, Math.floor((diff % 36e5) / 6e4));
    return CONFIG.textLastM[L](m);
  }

  function progressPercent(dep, arr) {
    const now = new Date();
    if (now <= dep) return 0;
    if (now >= arr) return 100;
    const pct = Math.ceil(((now - dep) / (arr - dep)) * 100);
    return Math.min(100, Math.max(0, pct));
  }

  function render(data) {
    const L = CONFIG.locale;
    if (!data?.data?.length) {
      container.innerHTML = `<div class="${CONFIG.classPrefix}card">
        <div class="${CONFIG.classPrefix}title">Keine Reisedaten gefunden</div>
      </div>`;
      return;
    }
    const trip = data.data[0];
    const t = trip.train || trip.status || trip; // be lenient
    const dep = new Date(t.origin?.departure);
    const arr = new Date(t.destination?.arrival);
    const nowTravelling = new Date() < arr;
    const pct = progressPercent(dep, arr);
    const line = shortenLineName(t.lineName);

    const statusText = headline(nowTravelling, dep, arr);
    const iconClass = nowTravelling ? "tw-icon-travelling" : "tw-icon-stopped";
    const statusClass = nowTravelling ? "tw-status-travelling" : "tw-status-stopped";

    // Select Icon for the main display
    const coverUrl = nowTravelling ? "assets/icons/train-front.svg" : "assets/icons/home.svg";
    const coverAlt = nowTravelling ? "Train" : "Home";

    const html = `
      <a class="${CONFIG.classPrefix}card" target="_blank" rel="noopener" 
         href="https://traewelling.de/@${encodeURIComponent(CONFIG.user)}"
         style="text-decoration: none;">
        <div class="${CONFIG.classPrefix}header">
          <span class="${CONFIG.classPrefix}icon ${iconClass}"></span>
          <span class="${CONFIG.classPrefix}status ${statusClass}">${statusText}</span>
        </div>
        
        <div class="${CONFIG.classPrefix}content">
            <!-- Main Icon -->
            <img src="${coverUrl}" alt="${coverAlt}" class="${CONFIG.classPrefix}cover-icon" style="padding: 10px; background: var(--md-sys-color-surface-variant);">
            
            <!-- Info Area containing Table and Progress -->
            <div class="${CONFIG.classPrefix}info">
                <div class="${CONFIG.classPrefix}tablewrap">
                  <table class="${CONFIG.classPrefix}wide" aria-label="Letzte Fahrt">
                    <tr>
                      <td class="${CONFIG.classPrefix}cell">
                        ${rilSpan(t.origin?.rilIdentifier)}<small>${safe(t.origin?.name)}</small>
                      </td>
                      <td class="${CONFIG.classPrefix}cell center">
                        <div class="${CONFIG.classPrefix}linelabel">${safe(line)}</div>
                      </td>
                      <td class="${CONFIG.classPrefix}cell">
                        ${rilSpan(t.destination?.rilIdentifier)}<small>${safe(t.destination?.name)}</small>
                      </td>
                    </tr>
                  </table>
                </div>
                <div class="${CONFIG.classPrefix}progress">
                  <div class="${CONFIG.classPrefix}progressbar" style="width:${pct}%"></div>
                </div>
            </div>
        </div>
      </a>
    `;
    container.innerHTML = html;
  }

  async function fetchStatus() {
    try {
      const url = `https://traewelling.de/api/v1/user/${encodeURIComponent(CONFIG.user)}/statuses`;
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      render(json);
    } catch (e) {
      container.innerHTML = `<div class="${CONFIG.classPrefix}card">
        <div class="${CONFIG.classPrefix}title">Fehler beim Laden</div>
        <div class="${CONFIG.classPrefix}msg">${safe(e.message)}</div>
      </div>`;
    }
  }

  renderLoading();
  fetchStatus();
  setInterval(fetchStatus, CONFIG.intervalMs);
})();
