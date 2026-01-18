
document.addEventListener("DOMContentLoaded", () => {
    const widget = document.getElementById("steam-widget");
    if (!widget) return;

    // Use absolute URL because frontend (GitHub Pages) and backend (Netlify) are on different domains
    const API_URL = "https://nico-ruge.netlify.app/.netlify/functions/steam";

    async function fetchSteamStatus() {
        try {
            // Loading State
            widget.innerHTML = `
                <div class="st-card">
                    <div class="st-header">
                        <span class="st-icon st-icon-loading"></span>
                        <span class="st-status st-status-stopped">Getting Steam Data...</span>
                    </div>
                    <div class="st-content" style="align-items: center; display: flex;">
                        <div style="width: 48px; height: 48px; background: var(--md-sys-color-surface-variant); border-radius: 8px; margin-right: 12px;"></div>
                        <div class="st-info" style="flex: 1;">
                            <div style="height: 1rem; width: 60%; background: var(--md-sys-color-surface-variant); border-radius: 4px; margin-bottom: 6px;"></div>
                            <div style="height: 0.8rem; width: 40%; background: var(--md-sys-color-surface-variant); border-radius: 4px;"></div>
                        </div>
                    </div>
                </div>`;

            const response = await fetch(API_URL);
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Failed to load Steam status: ${response.status} ${text}`);
            }

            const data = await response.json();
            console.log("Steam Data Received:", data); // DEBUG LOG
            renderSteamWidget(data);

        } catch (error) {
            console.error("Steam Widget Live Error:", error);
            widget.innerHTML = "";
        }
    }

    function renderSteamWidget(data) {
        const { gameextrainfo, personastate, profileurl, gameid, playtime_hours } = data;

        // Steam persona states: 0: Offline, 1: Online, 2: Busy, 3: Away, 4: Snooze, 5: Looking to trade, 6: Looking to play
        const isPlaying = !!gameextrainfo;
        const isOnline = personastate !== 0;

        // Default to "Offline" state
        let headerText = "Steam - Currently offline";
        let statusIconClass = "st-icon-offline";
        let statusTextClass = "st-status-offline";
        let coverUrl = "assets/icons/moon.svg";
        let mainText = "Offline";
        let subText = "";
        let imgClass = "st-cover-icon";

        const states = ["Offline", "Online", "Busy", "Away", "Snooze", "Looking to trade", "Looking to play"];

        if (isPlaying) {
            // === PLAYING STATE ===
            headerText = "Steam - Currently playing:";
            statusIconClass = "st-icon-playing";
            statusTextClass = "st-status-playing";
            mainText = gameextrainfo;

            if (playtime_hours) {
                subText = `${playtime_hours} hours total`;
            }

            if (gameid) {
                // Use high-quality header image for games
                coverUrl = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${gameid}/header.jpg`;
                imgClass = "st-cover-game";
            }
        } else if (isOnline) {
            // === ONLINE STATE ===
            headerText = "Steam - Currently idle";
            statusIconClass = "st-icon-online";
            statusTextClass = "st-status-online";
            mainText = states[personastate] || "Online";
            coverUrl = "assets/icons/coffee.svg";
        }

        // Generate HTML
        const isIcon = !gameid || !isPlaying;
        let imageHtml = `<img src="${coverUrl}" alt="${mainText}" class="${imgClass}" style="${isIcon ? 'padding: 10px; background: var(--md-sys-color-surface-variant);' : ''}">`;
        let subTextHtml = subText ? `<div class="st-playtime">${subText}</div>` : '';

        widget.innerHTML = `
            <a href="${profileurl}" target="_blank" rel="noopener noreferrer" class="st-card">
                <div class="st-header">
                    <span class="st-icon ${statusIconClass}"></span>
                    <span class="st-status ${statusTextClass}">${headerText}</span>
                </div>
                
                <div class="st-content">
                    ${imageHtml}
                    <div class="st-info">
                        <span class="st-game">${mainText}</span>
                        ${subTextHtml}
                    </div>
                </div>
            </a>
        `;
    }

    fetchSteamStatus();
});
