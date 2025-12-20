
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
                <span class="st-status st-status-stopped">Loading Steam...</span>
              </div>
              <div class="st-content">
                  <div class="st-cover" style="background-color: var(--md-sys-color-surface-variant);"></div>
                  <div class="st-info">
                      <div style="background-color: var(--md-sys-color-surface-variant); border-radius: 4px; height: 1rem; width: 70%;"></div>
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
            widget.innerHTML = ""; // Hide on production if real error
        }
    }

    function renderSteamWidget(data) {
        const { gameextrainfo, personastate, profileurl, gameid, playtime_hours } = data;

        // Steam persona states: 0: Offline, 1: Online, 2: Busy, 3: Away, 4: Snooze, 5: Looking to trade, 6: Looking to play
        const isPlaying = !!gameextrainfo;

        // Default to "Steam Status" header
        let headerText = "Steam Status";
        let statusIconClass = "st-icon-stopped";
        let statusTextClass = "st-status-stopped";

        let coverUrl = "assets/icons/gamepad-2.svg";
        let mainText = "Offline";
        let subText = "";

        const states = ["Offline", "Online", "Busy", "Away", "Snooze", "Looking to trade", "Looking to play"];
        // status colors could be mapped if desired.

        if (isPlaying) {
            headerText = "Currently Playing";
            statusIconClass = "st-icon-playing";
            statusTextClass = "st-status-playing";

            mainText = gameextrainfo;
            if (playtime_hours) {
                subText = `${playtime_hours} hours total`;
            }

            if (gameid) {
                coverUrl = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${gameid}/capsule_184x69.jpg`;
            }
            // "top green text with pulsating circle is... and then game icon and beside title"

            // If just online, let's keep it subtle like Spotify "Last listened to"
            statusIconClass = "st-status-online"; // We might need to define this if we want green without pulse

            // Re-reading user request: "Grüner Text mit pulsierendem kreis ist, wie bei den anderen Widgets auch"
            // Usually that implies Active state.

            if (personastate === 1) { // Online
                statusIconClass = "st-icon-playing"; // Reuse Green dot (pulsing? maybe not if not playing)
                // Let's stick to standard: Playing = Green Pulse. Online = Green Static?
                // Spotify widget uses "sp-icon-stopped" (gray) when not playing.
                statusIconClass = "st-icon-stopped";
            }

            mainText = states[personastate] || "Online";
        }

        // Adjust for styling consistency:
        // Use a generic gamepad icon if no game cover
        let imageHtml = `<img src="${coverUrl}" alt="${mainText}" class="st-cover" style="${!gameid ? 'padding: 10px; background: var(--md-sys-color-surface-variant);' : ''}">`;

        // Subtext HTML
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
