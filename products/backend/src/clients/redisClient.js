import Redis from 'redis';
import { CONFIG } from '../config.js';

export const redis = Redis.createClient({
  url: CONFIG.redisUrl,
  ...(CONFIG.appEnv !== 'local' && {
    socket: { tls: true, rejectUnauthorized: false },
  }),
});

await redis.connect();
