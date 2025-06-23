import { redis } from '../../clients/redisClient.js';
import { alertState } from '../../state.js';

/**
 * Evaluate sentiment scores against per-channel alert thresholds and emit
 * alert events via Socket.IO when conditions are met.
 */
export const checkAlerts = (io, channel, score, now) => {
  redis.get(`alerts:${channel}`).then((data) => {
    const settings = data
      ? JSON.parse(data)
      : { threshold: -0.5, duration: 30 };
    let state = alertState.get(channel) || {
      belowSince: null,
      active: false,
    };
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
};
