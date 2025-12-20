
document.addEventListener("DOMContentLoaded", () => {
    const widget = document.getElementById("steam-widget");
    if (!widget) return;

    // Use local function URL for development if needed, otherwise relative path works on Netlify
    const API_URL = "/.netlify/functions/steam";

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
            if (!response.ok) throw new Error("Failed to load Steam status");

            const data = await response.json();
            renderSteamWidget(data);
        } catch (error) {
            console.warn("Steam Widget Error (likely local):", error);
            // Fallback for local testing/styling if API fails
            if (window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
                console.log("Rendering mock Steam data for local testing");
                // MOCK DATA
                renderSteamWidget({
                    gameextrainfo: "Half-Life 3 (Local Debug)",
                    personastate: 1, // Online
                    profileurl: "#",
                    // Use a placeholder image or a known steam APP ID image if possible, but generic is fine
                    gameid: "540",
                    playtime_hours: 3333
                });
            } else {
                widget.innerHTML = ""; // Hide on production if real error
            }
        }
    }

    function renderSteamWidget(data) {
        const { gameextrainfo, personastate, profileurl, gameid, playtime_hours } = data;

        // Steam persona states: 0: Offline, 1: Online, 2: Busy, 3: Away, 4: Snooze, 5: Looking to trade, 6: Looking to play
        const isOnline = personastate !== 0;
        const isPlaying = !!gameextrainfo;

        let headerText = "Steam Status";
        let statusIconClass = "st-icon-stopped"; // Default gray dot
        let statusTextClass = "st-status-stopped"; // Default gray text

        let coverUrl = "assets/icons/gamepad-2.svg"; // Fallback icon
        let mainText = "Offline";
        let subText = ""; // Playtime or other info

        if (isPlaying) {
            headerText = "Currently Playing";
            statusIconClass = "st-icon-playing"; // Green pulsating dot
            statusTextClass = "st-status-playing"; // Green text

            mainText = gameextrainfo;
            if (playtime_hours) {
                subText = `${playtime_hours} hours total`;
            }

            // Steam Game Header Image: https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{gameid}/header.jpg 
            // Or capsule: https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{gameid}/capsule_184x69.jpg
            // Or library generic: https://steamcdn-a.akamaihd.net/steam/apps/{gameid}/library_600x900.jpg
            if (gameid) {
                coverUrl = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${gameid}/capsule_184x69.jpg`;
            }

        } else if (isOnline) {
            const states = ["Offline", "Online", "Busy", "Away", "Snooze", "Looking to trade", "Looking to play"];
            headerText = "Steam Status";
            statusIconClass = "st-icon-stopped"; // Online matches "stopped" in style (just a dot, maybe color green?)
            // Actually user wanted "Green text with pulsating circle" ONLY for playing usually? 
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
