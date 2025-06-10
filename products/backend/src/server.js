import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import tmi from 'tmi.js';
import Redis from 'redis';
import { parse } from 'url';
import axios from 'axios';
import { json2csvAsync } from 'json-2-csv';

import { CONFIG } from './config.js';
import { scoreBatch, WINDOW_MS } from './sentimentEngine.js';

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: '*' } });

const redis = Redis.createClient({ url: CONFIG.redisUrl });
await redis.connect();

let twitchClient = null;
const buffers = new Map();
const MSG_HISTORY_WINDOW = 30 * 60 * 1000; // 30 minutes
const MSG_BUCKETS = new Map(); // channel -> Map<bucketTs, string[]>
let sentimentInterval = null;

// --- OAuth Endpoints ---
app.get('/api/auth/twitch/login', (req, res) => {
  const { clientId, redirectUri, scopes } = CONFIG.twitch;
  const url = `https://id.twitch.tv/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scopes.join(' '))}`;
  res.redirect(url);
});

app.get('/api/auth/twitch/callback', async (req, res) => {
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
    // Connect Twitch client after successful OAuth
    await connectTwitchClient();
    res.redirect('/dashboard');
  } catch (e) {
    res.status(500).send('OAuth error: ' + e.message);
  }
});

// Add a dashboard route
app.get('/dashboard', (req, res) => {
  res.send(`
    <h2>Authentication successful!</h2>
    <p>Your bot is now connected to Twitch chat.</p>
    <ul>
      <li><a href="http://localhost:5173/overlay">Open Overlay</a></li>
      <li><a href="http://localhost:5173/panel">Open Panel</a></li>
    </ul>
    <p>Open your Twitch channel and send some chat messages to see sentiment analysis in action.</p>
  `);
});

// Support root redirect URI for OAuth callback
app.get('/', async (req, res, next) => {
  if (req.query.code) {
    // Proxy to the callback handler
    req.url =
      '/api/auth/twitch/callback' +
      (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    app._router.handle(req, res, next);
  } else {
    res.send('Welcome to Sentiment Snapshot backend!');
  }
});

// Helper to get a valid access token (refresh if needed)
async function getAccessToken() {
  let token = await redis.get('twitch:access_token');
  if (token) return token;
  // Refresh
  const refresh_token = await redis.get('twitch:refresh_token');
  if (!refresh_token) throw new Error('No refresh token');
  const { clientId, clientSecret } = CONFIG.twitch;
  const resp = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      grant_type: 'refresh_token',
      refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    },
  });

  token = resp.data.access_token;
  await redis.set('twitch:access_token', token, { EX: resp.data.expires_in });
  await redis.set('twitch:refresh_token', resp.data.refresh_token);
  return token;
}

// --- Connect Twitch client only after OAuth ---
async function connectTwitchClient() {
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
  setupTwitchHandlers();
  console.log('[Twitch] Connected to chat.');
  return twitchClient;
}

function setupTwitchHandlers() {
  if (!twitchClient) return;
  twitchClient.on('message', (channel, tags, message, self) => {
    if (self) return;
    const bucket = buffers.get(channel) || [];
    bucket.push(message);
    buffers.set(channel, bucket);
  });
  if (!sentimentInterval) {
    sentimentInterval = setInterval(async () => {
      const now = Date.now();
      for (const [channel, msgs] of buffers) {
        const score = scoreBatch(msgs);
        buffers.set(channel, []);

        const key = `sentiment:${channel}`;
        await redis.zAdd(key, { score: now, value: score.toString() });
        await redis.expire(key, 60 * 60);

        // Store messages for this bucket
        let buckets = MSG_BUCKETS.get(channel);
        if (!buckets) {
          buckets = new Map();
          MSG_BUCKETS.set(channel, buckets);
        }
        buckets.set(now, msgs.slice(0, 20)); // store up to 20 messages per bucket
        // Clean up old buckets
        for (const [ts] of buckets) {
          if (now - ts > MSG_HISTORY_WINDOW) buckets.delete(ts);
        }

        io.to(channel).emit('sentiment:update', { channel, score, ts: now });
      }
    }, WINDOW_MS);
  }
}

// --- Calibration privacy: only send to panel ---
io.on('connection', (socket) => {
  const { channel, panel } = socket.handshake.query;
  if (channel) {
    if (panel === 'true') {
      socket.join(`panel:${channel}`);
    } else {
      socket.join(channel);
    }
  }

  socket.on('calibrate', async ({ channel, vote }) => {
    const val = vote === 'happy' ? 1 : vote === 'sad' ? -1 : 0;
    const key = `calibration:${channel}`;
    await redis.incrByFloat(key, val);
    await redis.expire(key, 60 * 60);
    // Only emit calibration events to the panel
    io.to(`panel:${channel}`).emit('calibration:update', { channel, vote });
  });
});

// API: Get last 30 minutes of sentiment scores (bucketed)
app.get('/api/sentiment/:channel/history', async (req, res) => {
  const { channel } = req.params;
  const now = Date.now();
  const since = now - MSG_HISTORY_WINDOW;
  const key = `sentiment:${channel}`;
  // Get all scores in the last 30 minutes
  const results = await redis.zRangeByScoreWithScores(key, since, now);
  // Format: [{ ts, score }]
  const data = results.map(({ value, score }) => ({
    ts: score,
    score: parseFloat(value),
  }));
  res.json(data);
});

// API: Get sample messages for a given bucket
app.get('/api/sentiment/:channel/messages', (req, res) => {
  const { channel } = req.params;
  const ts = parseInt(req.query.ts, 10);
  const buckets = MSG_BUCKETS.get(channel);
  if (!buckets || !buckets.has(ts)) return res.json([]);
  // Return up to 5 sample messages
  const msgs = buckets.get(ts) || [];
  res.json(msgs.slice(0, 5));
});

// Session report endpoints (last 4 hours as session)
app.get('/api/session/:channel/report.json', async (req, res) => {
  const { channel } = req.params;
  const now = Date.now();
  const since = now - 4 * 60 * 60 * 1000; // 4 hours
  const key = `sentiment:${channel}`;
  const results = await redis.zRangeByScoreWithScores(key, since, now);
  const data = results.map(({ value, score }) => ({
    ts: score,
    score: parseFloat(value),
  }));
  if (!data.length) return res.json({ error: 'No data' });
  const scores = data.map((d) => d.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  // Find spikes (local min/max)
  const spikes = [];
  for (let i = 1; i < scores.length - 1; ++i) {
    if (
      (scores[i] > scores[i - 1] && scores[i] > scores[i + 1]) ||
      (scores[i] < scores[i - 1] && scores[i] < scores[i + 1])
    ) {
      spikes.push({ ts: data[i].ts, score: data[i].score });
    }
  }
  // Calibration feedback
  const calKey = `calibration:${channel}`;
  const calibration = await redis.get(calKey);
  res.json({
    channel,
    from: since,
    to: now,
    avg,
    min,
    max,
    spikes,
    calibration: calibration ? parseFloat(calibration) : 0,
    data,
  });
});

app.get('/api/session/:channel/report.csv', async (req, res) => {
  const { channel } = req.params;
  const now = Date.now();
  const since = now - 4 * 60 * 60 * 1000; // 4 hours
  const key = `sentiment:${channel}`;
  const results = await redis.zRangeByScoreWithScores(key, since, now);
  const data = results.map(({ value, score }) => ({
    ts: score,
    score: parseFloat(value),
  }));
  if (!data.length) return res.status(404).send('No data');
  const scores = data.map((d) => d.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const spikes = [];
  for (let i = 1; i < scores.length - 1; ++i) {
    if (
      (scores[i] > scores[i - 1] && scores[i] > scores[i + 1]) ||
      (scores[i] < scores[i - 1] && scores[i] < scores[i + 1])
    ) {
      spikes.push({ ts: data[i].ts, score: data[i].score });
    }
  }
  const calKey = `calibration:${channel}`;
  const calibration = await redis.get(calKey);
  const summary = [
    {
      channel,
      from: since,
      to: now,
      avg,
      min,
      max,
      calibration: calibration ? parseFloat(calibration) : 0,
    },
  ];
  const summaryCsv = await json2csvAsync(summary);
  const dataCsv = await json2csvAsync(data);
  res.header('Content-Type', 'text/csv');
  res.attachment(`session-${channel}.csv`);
  res.send(summaryCsv + '\n\n' + dataCsv);
});

server.listen(CONFIG.port, async () => {
  console.log(`[Backend] Listening on :${CONFIG.port}`);
  // Try to connect Twitch client if token is present
  await connectTwitchClient();
});
