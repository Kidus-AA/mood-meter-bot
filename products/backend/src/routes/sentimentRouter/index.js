import express from 'express';
import { sentimentServices } from '../../services/sentiment/index.js';
import { authenticationServices } from '../../authentication/index.js';

const {
  getSentimentHistory,
  getSampleMessages,
  sessionReportJson,
  sessionReportCsv,
  setAlertConfig,
  getAlertConfig,
} = sentimentServices;

export const sentimentRouter = express.Router();

// Sentiment routes
sentimentRouter.get('/api/sentiment/:channel/history', getSentimentHistory);
sentimentRouter.get('/api/sentiment/:channel/messages', getSampleMessages);

// Session report routes
sentimentRouter.get(
  '/api/session/:channel/report.json',
  authenticationServices.verifyTwitchJWT,
  authenticationServices.checkChannelMatch,
  sessionReportJson
);

sentimentRouter.get(
  '/api/session/:channel/report.csv',
  authenticationServices.verifyTwitchJWT,
  authenticationServices.checkChannelMatch,
  sessionReportCsv
);

// Alerts routes
sentimentRouter.post(
  '/api/alerts/:channel',
  authenticationServices.verifyTwitchJWT,
  authenticationServices.checkChannelMatch,
  setAlertConfig
);
sentimentRouter.get(
  '/api/alerts/:channel',
  authenticationServices.verifyTwitchJWT,
  authenticationServices.checkChannelMatch,
  getAlertConfig
);
