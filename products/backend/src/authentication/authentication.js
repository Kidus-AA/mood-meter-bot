import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { CONFIG } from '../config.js';
import { channelKey } from '../services/helpers/helpers.js';

const jwks = jwksClient({
  jwksUri: 'https://id.twitch.tv/oauth2/keys',
});

const getKey = (header, callback) => {
  jwks.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
};

export const verifyTwitchJWT = (req, res, next) => {
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
};

// Helper to check channel match
export const checkChannelMatch = (req, res, next) => {
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
};
