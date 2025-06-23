import tmi from 'tmi.js';
import { getAccessToken } from './twitchTokenService.js';
import { CONFIG } from '../../config.js';
import { statsBatch, WINDOW_MS } from '../sentimentEngine/sentimentEngine.js';
import { channelKey } from '../helpers/helpers.js';
import { redis } from '../../clients/redisClient.js';
import { buffers, MSG_HISTORY_WINDOW, MSG_BUCKETS } from '../../state.js';
import { checkAlerts } from '../alerts/alertService.js';

let twitchClient = null;
let sentimentInterval = null;

const setupTwitchHandlers = (io) => {
  if (!twitchClient) return;

  twitchClient.on('message', (channel, tags, message, self) => {
    if (self) return;
    const key = channelKey(channel);
    const idKey = tags['room-id'];

    // Store by channel login (used by overlay)
    const bucketLogin = buffers.get(key) || [];
    bucketLogin.push(message);
    buffers.set(key, bucketLogin);

    // Also store by numeric channel ID (used by panel auth)
    if (idKey) {
      const bucketId = buffers.get(idKey) || [];
      bucketId.push(message);
      buffers.set(idKey, bucketId);
    }
  });

  if (!sentimentInterval) {
    sentimentInterval = setInterval(async () => {
      const now = Date.now();
      for (const [key, msgs] of buffers) {
        if (msgs.length === 0) continue; // keep previous sentiment if no new messages

        const { avg: score, pos, neu, neg } = statsBatch(msgs);
        buffers.set(key, []);

        const redisKey = `sentiment:${key}`;
        await redis.zAdd(redisKey, { score: now, value: score.toString() });
        await redis.expire(redisKey, 60 * 60);

        // Store messages for this bucket
        let buckets = MSG_BUCKETS.get(key);
        if (!buckets) {
          buckets = new Map();
          MSG_BUCKETS.set(key, buckets);
        }
        buckets.set(now, msgs.slice(0, 20)); // store up to 20 messages per bucket
        // Clean up old buckets
        for (const [ts] of buckets) {
          if (now - ts > MSG_HISTORY_WINDOW) buckets.delete(ts);
        }

        const counts = { pos, neu, neg };
        io.to(key).emit('sentiment:update', {
          channel: key,
          score,
          counts,
          ts: now,
        });
        io.to(`panel:${key}`).emit('sentiment:update', {
          channel: key,
          score,
          counts,
          ts: now,
        });
        checkAlerts(io, key, score, now);
      }
    }, WINDOW_MS);
  }
};

export const connectTwitchClient = async (io) => {
  if (twitchClient) return twitchClient; // Already connected
  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (e) {
    console.log('[Twitch] No access token yet, skipping connection.');
    return null;
  }
  twitchClient = new tmi.Client({
    options: { debug: false },
    connection: { reconnect: true, secure: true },
    identity: {
      username: CONFIG.twitch.username,
      password: `oauth:${accessToken}`,
    },
    channels: CONFIG.twitch.channels,
  });
  await twitchClient.connect();
  setupTwitchHandlers(io);
  console.log('[Twitch] Connected to chat.');
  return twitchClient;
};
