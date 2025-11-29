# Spotify Widget Setup Guide

To make the Spotify widget work, you need to set up a small "backend" to handle your API keys securely.

## Step 1: Get your Spotify Credentials

1.  Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/).
2.  Log in and create an App (e.g., "My Website Widget").
3.  Note down your **Client ID** and **Client Secret**.
4.  Click "Edit Settings" and add a Redirect URI: `http://localhost:8888/callback` (This is just for the initial setup).

## Step 2: Get your Refresh Token

You need a "Refresh Token" so your script can generate new Access Tokens forever without you logging in again.

1.  **Authorize your app**:
    Replace `YOUR_CLIENT_ID` in the URL below and paste it into your browser:
    ```
    https://accounts.spotify.com/authorize?client_id=b2d9b07cd77b442daee520d54bb82f1e&response_type=code&redirect_uri=https://stuff.nico-ruge.de/callback&scope=user-read-currently-playing%20user-read-recently-played
    ```
2.  **Get the Code**:
    After logging in, you will be redirected to a URL like `http://localhost:8888/callback?code=NApCCg...`.
    Copy the `code` part (everything after `code=`).

3.  **Exchange Code for Refresh Token**:
    You need to run a curl command (in your terminal) to get the token. Replace the placeholders:
    ```bash
    curl -H "Authorization: Basic $(echo -n 'YOUR_CLIENT_ID
    :YOUR_CLIENT_SECRET' | base64)" -d grant_type=authorization_code -d code=YOUR_CODE -d redirect_uri=http://localhost:8888/callback https://accounts.spotify.com/api/token
    ```
    *Note: If you are on Windows, you might need a different tool or an online Base64 encoder.*

    The response will contain a `refresh_token`. **SAVE THIS!**

## Step 3: Deploy the Backend

The easiest way is to use **Netlify Functions** (Free).

1.  Create a folder `netlify/functions` in your project root.
2.  Move `spotify_auth_server.js` into that folder and rename it to `spotify.js`.
3.  Create a `netlify.toml` file in your project root:
    ```toml
    [build]
      functions = "netlify/functions"
    ```
4.  Push your code to GitHub.
5.  Connect your repo to Netlify.
6.  In Netlify Site Settings > **Environment Variables**, add:
    - `SPOTIFY_CLIENT_ID`
    - `SPOTIFY_CLIENT_SECRET`
    - `SPOTIFY_REFRESH_TOKEN`

## Step 4: Connect Frontend

1.  Once deployed, your API URL will be: `https://your-site-name.netlify.app/.netlify/functions/spotify`
2.  Open `spotify_widget.js` in your code.
3.  Update the `API_ENDPOINT` variable with your new URL.
