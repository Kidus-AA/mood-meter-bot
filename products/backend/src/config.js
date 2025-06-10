import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  port: process.env.PORT || 4000,
  twitch: {
    username: process.env.TWITCH_BOT_USERNAME,
    channels: (process.env.TWITCH_CHANNELS || '').split(',').filter(Boolean),
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    redirectUri: process.env.TWITCH_REDIRECT_URI, // e.g., http://localhost:4000/api/auth/twitch/callback
    scopes: (process.env.TWITCH_SCOPES || 'chat:read chat:edit').split(' '),
  },
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
};
