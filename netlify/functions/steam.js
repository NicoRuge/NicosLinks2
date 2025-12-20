
/*
  STEAM STATUS SERVER (Netlify Function / Node.js Script)
  
  This script handles the secret handshake with Steam so your API Key
  is never exposed in the browser.

  REQUIRED ENVIRONMENT VARIABLES:
  - STEAM_API_KEY
  - STEAM_ID
*/

const fetch = require('node-fetch'); // Ensure fetch is available using project dependency

exports.handler = async function (event, context) {
    const api_key = process.env.STEAM_API_KEY;
    const steam_id = process.env.STEAM_ID;

    if (!api_key || !steam_id) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: 'Missing environment variables' })
        };
    }

    const STEAM_ENDPOINT = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${api_key}&steamids=${steam_id}`;

    try {
        const response = await fetch(STEAM_ENDPOINT);
        if (!response.ok) {
            throw new Error(`Steam API error: ${response.statusText}`);
        }

        const data = await response.json();
        const player = data.response.players[0];

        if (!player) {
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Player not found' })
            };
        }

        let playtime_hours = null;

        // If playing, try to get playtime details
        if (player.gameid) {
            try {
                // Use GetOwnedGames as it reliably contains playtime_forever for ALL games, not just recent ones.
                // We don't need include_appinfo (makes response huge), just the list of IDs and playtimes.
                // We include free games to be safe.
                const OWNED_GAMES_ENDPOINT = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${api_key}&steamid=${steam_id}&include_played_free_games=1`;

                const ownedRes = await fetch(OWNED_GAMES_ENDPOINT);
                if (ownedRes.ok) {
                    const ownedData = await ownedRes.json();
                    const playingGame = ownedData.response.games?.find(g => g.appid == player.gameid);
                    if (playingGame) {
                        playtime_hours = Math.round(playingGame.playtime_forever / 60);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch owned games:", err);
            }
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                personastate: player.personastate,
                gameextrainfo: player.gameextrainfo || null,
                gameid: player.gameid || null,
                profileurl: player.profileurl,
                avatar: player.avatarfull,
                playtime_hours: playtime_hours
            })
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: error.message })
        };
    }
};
