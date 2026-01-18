(function () {
    const CONFIG = {
        apiEndpoint: "https://api.lanyard.rest/v1/users/269810872619237378",
        targetId: "discord-widget",
        classPrefix: "dc-"
    };

    const container = document.getElementById(CONFIG.targetId);
    if (!container) return;

    function render(data) {
        if (!data) return;
        const { discord_status, activities, discord_user } = data;

        let statusText = "Discord - Offline";
        let statusClass = "dc-status-offline";
        let iconClass = "dc-icon-offline";

        switch (discord_status) {
            case "online":
                statusText = "Discord - Online";
                statusClass = "dc-status-online";
                iconClass = "dc-icon-online";
                break;
            case "idle":
                statusText = "Discord - Currently away";
                statusClass = "dc-status-idle";
                iconClass = "dc-icon-idle";
                break;
            case "dnd":
                statusText = "Discord - Do Not Disturb";
                statusClass = "dc-status-dnd";
                iconClass = "dc-icon-dnd";
                break;
            default:
                statusText = "Discord - Offline";
                statusClass = "dc-status-offline";
                iconClass = "dc-icon-offline";
        }

        // Check for "Playing" status (type 0)
        const activity = activities.find(a => a.type === 0);

        // Check for custom status activity (type 4) - kept for fallback
        const customStatus = activities.find(a => a.type === 4);
        let activityText = null;
        if (customStatus && customStatus.state) {
            activityText = customStatus.state;
        }

        let imageUrl = "assets/icons/coffee.svg";
        let imageClass = "dc-no-activity"; // Standard size (64px or 48px)
        let title = "No Activity";
        let subtitle = null;

        // Overlay Activity if exists
        if (activity) {
            if (activity.assets && activity.assets.large_image) {
                let assetId = activity.assets.large_image;
                if (assetId.startsWith("mp:external")) {
                    // External image (e.g. from Spotify or Music)
                    assetId = assetId.replace(/mp:external\/([^\/]*)\/(https\/)?/, "");
                    imageUrl = `https://${assetId}`;
                } else {
                    // Discord Asset
                    imageUrl = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`;
                }
                imageClass = "dc-activity-image"; // Large size (110px)
            }
            title = activity.name;
            subtitle = activity.details
                ? `${activity.details}${activity.state ? `<br>${activity.state}` : ''}`
                : activity.state;

            // If no details/state, maybe fallback to "Playing a game" or nothing
        }

        // CSS adjustment for coffee icon to look nice (maybe invert for dark mode if needed, but it's SVG)
        // If it's the coffee icon, we might want to ensure it looks good. 
        // Using dc-activity-image which is 64x64 rounded.

        const html = `
      <div class="${CONFIG.classPrefix}card">
        <div class="${CONFIG.classPrefix}header">
          <span class="${CONFIG.classPrefix}icon ${iconClass}"></span>
          <span class="${CONFIG.classPrefix}status ${statusClass}">${statusText}</span>
        </div>
        <div class="${CONFIG.classPrefix}content">
            <img src="${imageUrl}" alt="${title}" class="${imageClass}" ${imageUrl.includes('coffee.svg') ? 'style="padding: 12px; background: var(--md-sys-color-surface-variant);"' : ''}>
            <div class="${CONFIG.classPrefix}info">
                <span class="${CONFIG.classPrefix}username">${title}</span>
                ${subtitle ? `<span class="${CONFIG.classPrefix}activity">${subtitle}</span>` : ''}
            </div>
        </div>
      </div>
    `;

        container.innerHTML = html;
    }

    async function fetchStatus() {
        try {
            const res = await fetch(CONFIG.apiEndpoint);
            const json = await res.json();
            if (json.success) {
                render(json.data);
            }
        } catch (e) {
            console.error("Discord Widget Error:", e);
        }
    }

    fetchStatus();
    setInterval(fetchStatus, 10000); // Update every 10 seconds
})();
