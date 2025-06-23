import axios from 'axios';
import { CONFIG } from '../../config.js';
import { redis } from '../../clients/redisClient.js';

export const getAccessToken = async () => {
  let token = await redis.get('twitch:access_token');
  if (token) return token;

  // Attempt refresh using stored refresh token
  const refreshToken = await redis.get('twitch:refresh_token');
  if (!refreshToken) throw new Error('No refresh token');

  const { clientId, clientSecret } = CONFIG.twitch;
  const resp = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    },
  });

  token = resp.data.access_token;
  await redis.set('twitch:access_token', token, { EX: resp.data.expires_in });
  await redis.set('twitch:refresh_token', resp.data.refresh_token);
  return token;
};
