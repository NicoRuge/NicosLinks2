const fetch = require('node-fetch'); // You might need to install this: npm install node-fetch

/*
  SPOTIFY AUTH SERVER (Netlify Function / Node.js Script)
  
  This script handles the secret handshake with Spotify so your Client Secret
  is never exposed in the browser.

  REQUIRED ENVIRONMENT VARIABLES:
  - SPOTIFY_CLIENT_ID
  - SPOTIFY_CLIENT_SECRET
  - SPOTIFY_REFRESH_TOKEN
*/

exports.handler = async function (event, context) {
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
    const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

    if (!client_id || !client_secret || !refresh_token) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Missing environment variables' })
        };
    }

    const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
    const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;
    const NOW_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;
    const RECENTLY_PLAYED_ENDPOINT = `https://api.spotify.com/v1/me/player/recently-played?limit=1`;

    try {
        // 1. Get a fresh Access Token
        const tokenResponse = await fetch(TOKEN_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${basic}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token
            })
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
            throw new Error(`Token error: ${JSON.stringify(tokenData)}`);
        }
        const access_token = tokenData.access_token;

        // 2. Try to get "Currently Playing"
        const nowPlayingResponse = await fetch(NOW_PLAYING_ENDPOINT, {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        if (nowPlayingResponse.status === 204 || nowPlayingResponse.status > 400) {
            // Nothing playing or error -> Fallback to "Recently Played"
            const recentResponse = await fetch(RECENTLY_PLAYED_ENDPOINT, {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            const recentData = await recentResponse.json();

            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*', // Allow your site to access this
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isPlaying: false, item: recentData.items[0].track })
            };
        }

        const nowPlayingData = await nowPlayingResponse.json();
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isPlaying: nowPlayingData.is_playing, item: nowPlayingData.item, progress_ms: nowPlayingData.progress_ms })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
