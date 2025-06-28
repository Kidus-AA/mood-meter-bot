import express from 'express';
import { redis } from '../../clients/redisClient.js';

const router = express.Router();

// GET /trends/:provider?limit=10
// Returns the top N trending items for the given provider, ordered by score (highest first).
router.get('/trends/:provider', async (req, res) => {
  const { provider } = req.params;
  const limit = Number.parseInt(req.query.limit ?? '10', 10);
  if (!provider) {
    return res.status(400).json({ error: 'provider param required' });
  }

  try {
    const key = `trends:external:${provider}`;
    // ZREVRANGE withscores 0 limit-1
    const range = await redis.zRangeWithScores(key, 0, limit - 1, {
      REV: true,
    });

    if (!range.length) {
      return res.json({ provider, items: [] });
    }

    const detailKeys = range.map(
      (z) => `trends:external:${provider}:details:${z.value}`
    );
    const detailVals = await redis.mGet(detailKeys);

    const items = range.map((z, idx) => {
      let details = {};
      try {
        if (detailVals[idx]) details = JSON.parse(detailVals[idx]);
      } catch (e) {
        // ignore JSON parse errors
      }
      return {
        id: z.value,
        score: z.score,
        ...details,
      };
    });

    return res.json({ provider, items });
  } catch (err) {
    console.error('[TrendRouter] redis', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

export const trendRouter = router;
