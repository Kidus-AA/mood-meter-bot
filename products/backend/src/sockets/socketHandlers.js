import { channelKey } from '../services/helpers/helpers.js';
import { redis } from '../clients/redisClient.js';

export const registerSocketHandlers = (io) => {
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
};
