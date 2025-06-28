import express from 'express';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import { CONFIG } from './config.js';
import { sentimentRouter } from './routes/sentimentRouter/index.js';
import { oauthRouter } from './routes/twitchOauthRouter/index.js';
import { channelKey } from './services/helpers/helpers.js';
import { registerSocketHandlers } from './sockets/socketHandlers.js';
import { connectTwitchClient } from './services/twitch/twitchClientService.js';
import { trendRouter } from './routes/trendRouter/index.js';

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(cors());

app.use('/', sentimentRouter);
app.use('/', oauthRouter);
app.use('/', trendRouter);

app.get('/dashboard', (req, res) => {
  const chanParam = req.query.channel;
  const fallback = CONFIG.twitch.channels[0];
  const channel = chanParam || fallback;

  if (!channel) {
    return res
      .status(400)
      .send('No channel specified and TWITCH_CHANNELS is empty.');
  }

  res.redirect(
    `http://localhost:5173/public/panel?channel=${channelKey(channel)}`
  );
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

registerSocketHandlers(io);

server.listen(CONFIG.port, async () => {
  console.log(`[Backend] Listening on port ${CONFIG.port}`);
  await connectTwitchClient(io);
});
