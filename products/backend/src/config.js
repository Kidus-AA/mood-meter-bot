import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  appEnv: process.env.APP_ENV,
  port: process.env.PORT || 4000,
  twitch: {
    username: process.env.TWITCH_BOT_USERNAME,
    channels: (process.env.TWITCH_CHANNELS || '').split(',').filter(Boolean),
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    redirectUri: process.env.TWITCH_REDIRECT_URI,
    scopes: (process.env.TWITCH_SCOPES || 'chat:read chat:edit').split(' '),
  },
  redisUrl: process.env.REDIS_URL,
};
