import Sentiment from 'sentiment';
const sentiment = new Sentiment();

const WINDOW_MS = 10_000;

export function scoreBatch(messages) {
  if (messages.length === 0) return 0;
  const total = messages.reduce((sum, msg) => sum + sentiment.analyze(msg).comparative, 0);
  return total / messages.length; // -1 ➜ +1
}

export { WINDOW_MS };

