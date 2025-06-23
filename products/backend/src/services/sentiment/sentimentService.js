import { MSG_HISTORY_WINDOW, MSG_BUCKETS } from '../../state.js';
import { redis } from '../../clients/redisClient.js';
import { json2csv } from 'json-2-csv';
import { channelKey } from '../helpers/helpers.js';

export const getSentimentHistory = async (req, res) => {
  const key = channelKey(req.params.channel);
  const now = Date.now();
  const since = now - MSG_HISTORY_WINDOW;
  const redisKey = `sentiment:${key}`;
  const results = await redis.zRangeByScoreWithScores(redisKey, since, now);
  const data = results.map(({ value, score }) => ({
    ts: score,
    score: parseFloat(value),
  }));
  res.json(data);
};

export const getSampleMessages = (req, res) => {
  const key = channelKey(req.params.channel);
  const ts = parseInt(req.query.ts, 10);
  const buckets = MSG_BUCKETS.get(key);
  if (!buckets || !buckets.has(ts)) return res.json([]);
  const msgs = buckets.get(ts) || [];
  res.json(msgs.slice(0, 5));
};

// Helpers
const buildSessionReport = async (key, from, to) => {
  const redisKey = `sentiment:${key}`;
  const results = await redis.zRangeByScoreWithScores(redisKey, from, to);
  const data = results.map(({ value, score }) => ({
    ts: score,
    score: parseFloat(value),
  }));
  if (!data.length) return { data: null };
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
  const calibrationRaw = await redis.get(calKey);
  const calibration = calibrationRaw ? parseFloat(calibrationRaw) : 0;
  const summary = { key, from, to, avg, min, max, spikes, calibration };
  return { summary, data };
};

export const sessionReportJson = async (req, res) => {
  const key = channelKey(req.params.channel);
  const now = Date.now();
  const since = now - 4 * 60 * 60 * 1000; // 4 hours
  const { summary, data } = await buildSessionReport(key, since, now);
  if (!data) {
    res.header('Content-Type', 'application/json');
    res.attachment(`session-${key}.json`);
    return res.send(JSON.stringify({ error: 'No data' }, null, 2));
  }
  res.header('Content-Type', 'application/json');
  res.attachment(`session-${key}.json`);
  res.send(
    JSON.stringify(
      {
        channel: key,
        from: since,
        to: now,
        avg: summary.avg,
        min: summary.min,
        max: summary.max,
        spikes: summary.spikes,
        calibration: summary.calibration,
        data,
      },
      null,
      2
    )
  );
};

export const sessionReportCsv = async (req, res) => {
  const key = channelKey(req.params.channel);
  const now = Date.now();
  const since = now - 4 * 60 * 60 * 1000; // 4 hours
  const { summary, data } = await buildSessionReport(key, since, now);
  if (!data) {
    res.header('Content-Type', 'text/csv');
    res.attachment(`session-${key}.csv`);
    return res.send('No data');
  }
  const summaryCsv = json2csv([
    {
      channel: key,
      from: since,
      to: now,
      avg: summary.avg,
      min: summary.min,
      max: summary.max,
      calibration: summary.calibration,
    },
  ]);
  const dataCsv = json2csv(data);
  res.header('Content-Type', 'text/csv');
  res.attachment(`session-${key}.csv`);
  res.send(summaryCsv + '\n\n' + dataCsv);
};

export const setAlertConfig = async (req, res) => {
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
};

export const getAlertConfig = async (req, res) => {
  const { channel } = req.params;
  const data = await redis.get(`alerts:${channelKey(channel)}`);
  if (!data) return res.json({ threshold: -0.5, duration: 30 });
  res.json(JSON.parse(data));
};
