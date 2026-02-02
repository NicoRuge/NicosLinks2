// JS Logic for Departure Monitor

// Initialize theme
const currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);

window.addEventListener('message', (event) => {
    if (event.data.type === 'theme-change') {
        const theme = event.data.theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }
});

const stationInput = document.getElementById('station-input');
const searchResults = document.getElementById('search-results');
const departuresList = document.getElementById('departures-list');
const statusMessage = document.getElementById('status-message');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const clockElement = document.getElementById('clock');
const stationTitle = document.getElementById('station-title');

// Modal Elements
const remarkModal = document.getElementById('remark-modal');
const remarkTitle = document.getElementById('remark-title');
const remarkText = document.getElementById('remark-text');
const remarkClose = document.getElementById('remark-close');

function showRemark(text) {
    remarkText.textContent = text;
    remarkModal.classList.remove('hidden');
}

function closeRemark() {
    remarkModal.classList.add('hidden');
}

if (remarkClose) {
    remarkClose.addEventListener('click', closeRemark);
}

if (remarkModal) {
    remarkModal.addEventListener('click', (e) => {
        if (e.target === remarkModal) {
            closeRemark();
        }
    });
}

let searchTimeout = null;
let currentStationId = null;
let currentStationName = 'Abfahrtsmonitor';
let autoRefreshInterval = null;

// Initial filters
const productFilters = {
    nationalExpress: true, // ICE/IC
    national: true,
    regionalExpress: true,
    regional: true,
    suburban: true, // S-Bahn
    bus: false,
    ferry: false,
    subway: false, // U-Bahn
    tram: false,
    taxi: false
};

// Map inputs to API product keys
const inputMap = {
    'filter-ice': ['nationalExpress', 'national'],
    'filter-regio': ['regionalExpress', 'regional'],
    'filter-s': ['suburban'],
    'filter-bus': ['bus'],
    'filter-u': ['subway'],
    'filter-tram': ['tram']
};

document.querySelectorAll('.toggle-pill input').forEach(input => {
    input.addEventListener('change', (e) => {
        const targetProducts = inputMap[e.target.id];
        if (targetProducts) {
            targetProducts.forEach(prod => {
                productFilters[prod] = e.target.checked;
            });
            if (currentStationId) {
                fetchDepartures(currentStationId);
            }
        }
    });
});

stationInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (searchTimeout) clearTimeout(searchTimeout);

    if (query.length < 2) {
        searchResults.classList.add('hidden');
        return;
    }

    searchTimeout = setTimeout(() => {
        searchStation(query);
    }, 300); // Debounce
});

async function searchStation(query) {
    try {
        const response = await fetch(`https://v6.db.transport.rest/locations?query=${encodeURIComponent(query)}&results=5&stops=true&addresses=false&poi=false`);
        const data = await response.json();
        renderSearchResults(data);
    } catch (e) {
        console.error("Search error", e);
    }
}

function renderSearchResults(locations) {
    searchResults.innerHTML = '';
    if (!locations || locations.length === 0) {
        searchResults.classList.add('hidden');
        return;
    }

    locations.forEach(loc => {
        if (loc.type === 'stop' || loc.type === 'station') {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.textContent = loc.name;
            div.addEventListener('click', () => {
                selectStation(loc);
            });
            searchResults.appendChild(div);
        }
    });
    searchResults.classList.remove('hidden');
}

function selectStation(station) {
    stationInput.value = station.name;
    currentStationId = station.id;
    currentStationName = station.name;

    // Update title if in fullscreen or normal mode, but logic inside FS toggle handles display
    // But we should update the h2 text if we want "Haltestellennamen"
    stationTitle.textContent = currentStationName;

    searchResults.classList.add('hidden');
    fetchDepartures(station.id);
}

async function fetchDepartures(stationId) {
    if (!stationId) return;

    statusMessage.textContent = 'Loading...';
    // Don't clear list while refreshing to avoid flicker
    if (!autoRefreshInterval) {
        departuresList.innerHTML = '';
    }

    // Build query params based on filters
    const params = new URLSearchParams();
    params.append('duration', 720); // Show next 12 hours
    params.append('results', 30);  // Max results

    for (const [key, val] of Object.entries(productFilters)) {
        params.append(key, val);
    }

    try {
        const response = await fetch(`https://v6.db.transport.rest/stops/${stationId}/departures?${params.toString()}`);
        const data = await response.json();

        // API v6 returns { departures: [...] } or just [...] depending on endpoint/params sometimes
        const departures = data.departures || data;

        renderDepartures(departures);
        statusMessage.textContent = '';

        // Update title with timestamp of last update if desired, or keep station name
    } catch (e) {
        statusMessage.textContent = 'Error loading departures.';
        console.error(e);
    }
}

function renderDepartures(departures) {
    departuresList.innerHTML = '';

    if (!departures || departures.length === 0) {
        departuresList.innerHTML = '<div class="empty-state">Keine Abfahrten gefunden.</div>';
        return;
    }

    // Sort by actual time (when) or planned time (plannedWhen)
    departures.sort((a, b) => {
        const timeA = new Date(a.when || a.plannedWhen);
        const timeB = new Date(b.when || b.plannedWhen);
        return timeA - timeB;
    });

    departures.forEach(dep => {
        const row = document.createElement('div');
        row.className = 'departure-row';

        // Time logic: use plannedWhen and when to show delay
        const timeObj = new Date(dep.when || dep.plannedWhen);
        const hours = timeObj.getHours().toString().padStart(2, '0');
        const minutes = timeObj.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        // Delay calculation
        let delayInfo = '';
        if (dep.delay && dep.delay > 60) { // delay in seconds
            const minutesDelay = Math.floor(dep.delay / 60);

            // Check for remarks
            let remarksText = '';
            if (dep.remarks && dep.remarks.length > 0) {
                const uniqueRemarks = [...new Set(dep.remarks
                    .filter(r => r.type === 'status' || r.type === 'warning' || r.text) // simple filter
                    .map(r => r.text || r.summary)
                    .filter(Boolean))];

                if (uniqueRemarks.length > 0) {
                    remarksText = uniqueRemarks.join('\n\n');
                }
            }

            if (remarksText) {
                // Encode remarks safely for attribute? 
                // Better approach: use data attribute on the row or element
                delayInfo = ` <span class="delay-info has-info" style="color: #ff6b6b; font-size: 0.8em;" data-remark="${remarksText.replace(/"/g, '&quot;')}">+${minutesDelay}</span>`;
            } else {
                delayInfo = ` <span class="delay-info" style="color: #ff6b6b; font-size: 0.8em;">+${minutesDelay}</span>`;
            }
        }

        const iconPath = getProductIcon(dep.line.product);
        const lineContent = iconPath ? `<img src="assets/icons/${iconPath}" alt="${dep.line.product}" class="transport-icon"> ${dep.line.name}` : dep.line.name;

        let platform = dep.platform || dep.plannedPlatform;
        if (!platform) {
            if (['bus', 'tram', 'subway', 'ferry', 'taxi'].includes(dep.line.product)) {
                platform = '';
            } else {
                platform = '?';
            }
        }

        row.innerHTML = `
            <div class="col-time">${timeStr}${delayInfo}</div>
            <div class="col-line">${lineContent}</div>
            <div class="col-dest" title="${dep.direction}">${dep.direction}</div>
            <div class="col-plat">${platform}</div>
        `;

        departuresList.appendChild(row);
    });
}
// Add event delegation for remarks
departuresList.addEventListener('click', (e) => {
    const target = e.target.closest('.has-info');
    if (target && target.dataset.remark) {
        showRemark(target.dataset.remark);
    }
});

function getProductIcon(product) {
    // API product names: nationalExpress, national, regionalExpress, regional, suburban, bus, ferry, subway, tram, taxi
    switch (product) {
        case 'nationalExpress':
        case 'national':
            return 'ic_blank.svg'; // ICE/IC
        case 'regionalExpress':
        case 'regional':
            return 'train-front.svg'; // Fallback for Regio
        case 'suburban':
            return 'sbahn_blank.svg'; // S-Bahn
        case 'bus':
            return 'bus_blank.svg';
        case 'subway':
            return 'subway_blank.svg'; // U-Bahn
        case 'tram':
            return 'tram_blank.svg';
        default:
            return null;
    }
}

// Clock & Fullscreen Logic
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    clockElement.textContent = timeString;
}

// Update clock every second
setInterval(updateClock, 1000);
updateClock();

fullscreenBtn.addEventListener('click', () => {
    toggleFullscreen();
});

function toggleFullscreen() {
    const body = document.body;

    // Toggle class
    body.classList.toggle('is-fullscreen');

    // Check if we are in fullscreen
    const isFS = body.classList.contains('is-fullscreen');

    if (isFS) {
        // Request browser fullscreen for the iframe (or body)
        if (body.requestFullscreen) {
            body.requestFullscreen();
        } else if (body.webkitRequestFullscreen) { /* Safari */
            body.webkitRequestFullscreen();
        } else if (body.msRequestFullscreen) { /* IE11 */
            body.msRequestFullscreen();
        }

        // Start auto-refresh every 60s
        if (currentStationId) {
            autoRefreshInterval = setInterval(() => fetchDepartures(currentStationId), 60000);
            fetchDepartures(currentStationId);
        }

    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        }

        // Stop auto-refresh
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }

        // Reset Title if needed, but user wanted Station Name, which we set on select.
        // Maybe reset to "Abfahrtsmonitor" if cleared? nah keep station name.
    }
}

// Handle ESC key or other exit methods
document.addEventListener('fullscreenchange', exitHandler);
document.addEventListener('webkitfullscreenchange', exitHandler);
document.addEventListener('mozfullscreenchange', exitHandler);
document.addEventListener('MSFullscreenChange', exitHandler);

function exitHandler() {
    if (!document.fullscreenElement && !document.webkitIsFullScreen && !document.mozFullScreen && !document.msFullscreenElement) {
        // User pressed ESC or exited via browser UI
        document.body.classList.remove('is-fullscreen');
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    }
}
