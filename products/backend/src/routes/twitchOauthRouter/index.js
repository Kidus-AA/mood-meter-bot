import express from 'express';
import axios from 'axios';
import { redis } from '../../clients/redisClient.js';
import { CONFIG } from '../../config.js';

export const oauthRouter = express.Router();

// GET /api/auth/twitch/login
oauthRouter.get('/api/auth/twitch/login', (req, res) => {
  const { clientId, redirectUri, scopes } = CONFIG.twitch;
  const url = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scopes.join(' '))}`;
  return res.redirect(url);
});

// GET /api/auth/twitch/callback
oauthRouter.get('/api/auth/twitch/callback', async (req, res) => {
  const { code } = req.query;
  const { clientId, clientSecret, redirectUri } = CONFIG.twitch;
  try {
    const resp = await axios.post('https://id.twitch.tv/oauth2/token', null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      },
    });
    const { access_token, refresh_token, expires_in } = resp.data;
    await redis.set('twitch:access_token', access_token, { EX: expires_in });
    await redis.set('twitch:refresh_token', refresh_token);
    // Redirect user to dashboard
    return res.redirect('/dashboard');
  } catch (e) {
    console.error('[OAuth] Error during callback', e);
    return res.status(500).send('OAuth error: ' + e.message);
  }
});
