import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import tmi from 'tmi.js';
import Redis from 'redis';
import axios from 'axios';
import { json2csv } from 'json-2-csv';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

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

app.use(express.json()); // for parsing JSON bodies
app.use(cors());

// Twitch public keys endpoint
const jwks = jwksClient({
  jwksUri: 'https://id.twitch.tv/oauth2/keys',
});

function getKey(header, callback) {
  jwks.getSigningKey(header.kid, function (err, key) {
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Middleware to verify Twitch Extension JWT
function verifyTwitchJWT(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ error: 'Missing or invalid Authorization header' });
  }
  const token = auth.slice(7);
  jwt.verify(
    token,
    getKey,
    {
      audience: CONFIG.twitch.clientId,
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        return res
          .status(401)
          .json({ error: 'Invalid JWT', details: err.message });
      }
      req.twitch = decoded;
      next();
    }
  );
}

// Helper to check channel match
function checkChannelMatch(req, res, next) {
  const requested = channelKey(req.params.channel);
  const jwtChannel =
    req.twitch &&
    req.twitch.channel_id &&
    encodeURIComponent(req.twitch.channel_id);
  if (jwtChannel && requested !== jwtChannel) {
    return res
      .status(403)
      .json({ error: 'JWT channel_id does not match requested channel' });
  }
  next();
}

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
    res.send('Welcome to Mood Meter backend!');
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

// Helper to normalize channel key (URL-encode, remove leading # if present)
function channelKey(channel) {
  return encodeURIComponent(
    channel.startsWith('#') ? channel.slice(1) : channel
  );
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
    const key = channelKey(channel);
    console.log('key', key, message);
    const bucket = buffers.get(key) || [];
    bucket.push(message);
    buffers.set(key, bucket);
  });

  if (!sentimentInterval) {
    sentimentInterval = setInterval(async () => {
      const now = Date.now();
      for (const [key, msgs] of buffers) {
        const score = scoreBatch(msgs);
        buffers.set(key, []);

        const redisKey = `sentiment:${key}`;
        await redis.zAdd(redisKey, { score: now, value: score.toString() });
        await redis.expire(redisKey, 60 * 60);

        // Store messages for this bucket
        let buckets = MSG_BUCKETS.get(key);
        console.log('buckets', buckets, key);
        if (!buckets) {
          buckets = new Map();
          MSG_BUCKETS.set(key, buckets);
        }
        buckets.set(now, msgs.slice(0, 20)); // store up to 20 messages per bucket
        // Clean up old buckets
        for (const [ts] of buckets) {
          if (now - ts > MSG_HISTORY_WINDOW) buckets.delete(ts);
        }

        io.to(key).emit('sentiment:update', { channel: key, score, ts: now });
        checkAlerts(key, score, now);
      }
    }, WINDOW_MS);
  }
}

// --- Calibration privacy: only send to panel ---
io.on('connection', (socket) => {
  let { channel, panel } = socket.handshake.query;
  const key = channelKey(channel);
  if (channel) {
    if (panel === 'true') {
      socket.join(`panel:${key}`);
    } else {
      socket.join(key);
    }
  }

  socket.on('calibrate', async ({ channel, vote }) => {
    const key = channelKey(channel);
    const val = vote === 'happy' ? 1 : vote === 'sad' ? -1 : 0;
    const calKey = `calibration:${key}`;
    await redis.incrByFloat(calKey, val);
    await redis.expire(calKey, 60 * 60);
    // Only emit calibration events to the panel
    io.to(`panel:${key}`).emit('calibration:update', { channel: key, vote });
  });
});

// API: Get last 30 minutes of sentiment scores (bucketed)
app.get('/api/sentiment/:channel/history', async (req, res) => {
  const key = channelKey(req.params.channel);
  const now = Date.now();
  console.log('key', key);
  const since = now - MSG_HISTORY_WINDOW;
  const redisKey = `sentiment:${key}`;
  // Get all scores in the last 30 minutes
  const results = await redis.zRangeByScoreWithScores(redisKey, since, now);
  console.log('results', results);
  // Format: [{ ts, score }]
  const data = results.map(({ value, score }) => ({
    ts: score,
    score: parseFloat(value),
  }));
  res.json(data);
});

// API: Get sample messages for a given bucket
app.get('/api/sentiment/:channel/messages', (req, res) => {
  const key = channelKey(req.params.channel);
  const ts = parseInt(req.query.ts, 10);
  const buckets = MSG_BUCKETS.get(key);
  if (!buckets || !buckets.has(ts)) return res.json([]);
  // Return up to 5 sample messages
  const msgs = buckets.get(ts) || [];
  res.json(msgs.slice(0, 5));
});

// Session report endpoints (last 4 hours as session)
app.get(
  '/api/session/:channel/report.json',
  verifyTwitchJWT,
  checkChannelMatch,
  async (req, res) => {
    const key = channelKey(req.params.channel);
    const now = Date.now();
    const since = now - 4 * 60 * 60 * 1000; // 4 hours
    const redisKey = `sentiment:${key}`;
    const results = await redis.zRangeByScoreWithScores(redisKey, since, now);
    const data = results.map(({ value, score }) => ({
      ts: score,
      score: parseFloat(value),
    }));
    if (!data.length) {
      res.header('Content-Type', 'application/json');
      res.attachment(`session-${key}.json`);
      return res.send(JSON.stringify({ error: 'No data' }, null, 2));
    }
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
    const calKey = `calibration:${key}`;
    const calibration = await redis.get(calKey);
    const report = {
      channel: key,
      from: since,
      to: now,
      avg,
      min,
      max,
      spikes,
      calibration: calibration ? parseFloat(calibration) : 0,
      data,
    };
    res.header('Content-Type', 'application/json');
    res.attachment(`session-${key}.json`);
    res.send(JSON.stringify(report, null, 2));
  }
);

app.get(
  '/api/session/:channel/report.csv',
  verifyTwitchJWT,
  checkChannelMatch,
  async (req, res) => {
    const key = channelKey(req.params.channel);
    const now = Date.now();
    const since = now - 4 * 60 * 60 * 1000; // 4 hours
    const redisKey = `sentiment:${key}`;
    const results = await redis.zRangeByScoreWithScores(redisKey, since, now);
    const data = results.map(({ value, score }) => ({
      ts: score,
      score: parseFloat(value),
    }));
    if (!data.length) {
      res.header('Content-Type', 'text/csv');
      res.attachment(`session-${key}.csv`);
      return res.send('No data');
    }
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
    const calKey = `calibration:${key}`;
    const calibration = await redis.get(calKey);
    const summary = [
      {
        channel: key,
        from: since,
        to: now,
        avg,
        min,
        max,
        calibration: calibration ? parseFloat(calibration) : 0,
      },
    ];
    const summaryCsv = json2csv(summary);
    const dataCsv = json2csv(data);
    res.header('Content-Type', 'text/csv');
    res.attachment(`session-${key}.csv`);
    res.send(summaryCsv + '\n\n' + dataCsv);
  }
);

// --- Custom Alerts ---
// Set alert threshold and duration
app.post(
  '/api/alerts/:channel',
  verifyTwitchJWT,
  checkChannelMatch,
  async (req, res) => {
    const { channel } = req.params;
    const { threshold, duration } = req.body;
    if (typeof threshold !== 'number' || typeof duration !== 'number') {
      return res
        .status(400)
        .json({ error: 'threshold and duration must be numbers' });
    }
    await redis.set(
      `alerts:${channelKey(channel)}`,
      JSON.stringify({ threshold, duration })
    );
    res.json({ ok: true });
  }
);

// Get alert settings
app.get(
  '/api/alerts/:channel',
  verifyTwitchJWT,
  checkChannelMatch,
  async (req, res) => {
    const { channel } = req.params;
    const data = await redis.get(`alerts:${channelKey(channel)}`);
    if (!data) return res.json({ threshold: -0.5, duration: 30 }); // default
    res.json(JSON.parse(data));
  }
);

// --- Alert monitoring ---
const alertState = new Map(); // channel -> { belowSince, active }

function checkAlerts(channel, score, now) {
  redis.get(`alerts:${channel}`).then((data) => {
    const settings = data
      ? JSON.parse(data)
      : { threshold: -0.5, duration: 30 };
    let state = alertState.get(channel) || { belowSince: null, active: false };
    if (score < settings.threshold) {
      if (!state.belowSince) state.belowSince = now;
      if (!state.active && now - state.belowSince >= settings.duration * 1000) {
        state.active = true;
        io.to(`panel:${channel}`).emit('alert:triggered', {
          channel,
          score,
          ts: now,
          threshold: settings.threshold,
          duration: settings.duration,
        });
      }
    } else {
      state.belowSince = null;
      state.active = false;
    }
    alertState.set(channel, state);
  });
}

server.listen(CONFIG.port, async () => {
  console.log(`[Backend] Listening on :${CONFIG.port}`);
  // Try to connect Twitch client if token is present
  await connectTwitchClient();
});
