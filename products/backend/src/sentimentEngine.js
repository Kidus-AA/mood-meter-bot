import Sentiment from 'sentiment';
const sentiment = new Sentiment();

const WINDOW_MS = 10_000;

export function scoreBatch(messages) {
  if (messages.length === 0) return 0;
  const total = messages.reduce(
    (sum, msg) => sum + sentiment.analyze(msg).comparative,
    0
  );
  return total / messages.length; // -1 ➜ +1
}

export function statsBatch(messages) {
  if (messages.length === 0) return { avg: 0, pos: 0, neu: 0, neg: 0 };

  let pos = 0,
    neu = 0,
    neg = 0,
    total = 0;

  for (const msg of messages) {
    const c = sentiment.analyze(msg).comparative;
    if (c > 0.25) pos++;
    else if (c < -0.25) neg++;
    else neu++;
    total += c;
  }

  return { avg: total / messages.length, pos, neu, neg };
}

export { WINDOW_MS };
