document.addEventListener('DOMContentLoaded', () => {
    const PLAYLIST_ID = "36etu5GvxagGIdHHcVoLcE";
    const API_URL = `https://nico-ruge.netlify.app/.netlify/functions/spotify?type=playlist&id=${PLAYLIST_ID}`;
    const container = document.getElementById('music-playlist');

    if (!container) return;

    // Show loading state
    container.innerHTML = '<div style="text-align: center; color: var(--md-sys-color-on-surface-variant); padding: 20px;">Loading Playlist...</div>';

    async function loadPlaylist() {
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error("Failed to load playlist");

            const items = await res.json();
            container.innerHTML = ''; // Clear loading

            items.forEach(item => {
                const track = item.track;
                if (!track) return; // Skip if null

                const coverUrl = track.album?.images[0]?.url || 'assets/icons/music.svg';
                const artists = track.artists.map(a => a.name).join(', ');

                const element = document.createElement('a');
                element.href = track.external_urls.spotify;
                element.target = "_blank";
                element.rel = "noopener noreferrer";
                element.className = "playlist-item";

                element.innerHTML = `
                    <img src="${coverUrl}" alt="${track.album.name}" class="playlist-cover">
                    <div class="playlist-info">
                        <div class="playlist-title">${track.name}</div>
                        <div class="playlist-artist">${artists}</div>
                        <div class="playlist-album">${track.album.name}</div>
                    </div>
                    <div class="playlist-action">
                        <img src="assets/icons/arrow-right.svg" class="icon" alt="Play">
                    </div>
                `;

                container.appendChild(element);
            });
        } catch (error) {
            console.error("Playlist Error:", error);
            container.innerHTML = '<div style="text-align: center; color: var(--md-sys-color-error); padding: 20px;">Failed to load playlist.</div>';
        }
    }

    loadPlaylist();
});
