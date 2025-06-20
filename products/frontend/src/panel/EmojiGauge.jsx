import { useEffect, useState, useRef } from 'react';
import { connectSocket } from '../common/socket';
import RainbowGauge from './RainbowGauge.jsx';

const EMOJI = { happy: '😊', neutral: '😐', sad: '🙁' };
const BACKEND = import.meta.env.VITE_BACKEND_URL;

export default function EmojiGauge({ channel }) {
  const [score, setScore] = useState(0); // instantaneous (current bucket)
  const [avgScore, setAvgScore] = useState(0); // 5-minute running average
  const [counts, setCounts] = useState({ pos: 0, neu: 0, neg: 0 }); // last 5-minute counts

  const scoresRef = useRef([]); // array of {ts, score}
  const countsRef = useRef([]); // array of {ts, counts}

  useEffect(() => {
    if (!channel) return;
    const socket = connectSocket(channel, { panel: true });

    socket.on('sentiment:update', ({ score, counts: bucketCounts, ts }) => {
      const now = ts || Date.now();
      setScore(score);
      if (bucketCounts) {
        // track counts per bucket in rolling window
        countsRef.current = [
          ...countsRef.current,
          { ts: now, counts: bucketCounts },
        ].filter((c) => now - c.ts <= 5 * 60 * 1000);

        const agg = countsRef.current.reduce(
          (acc, cur) => {
            acc.pos += cur.counts.pos;
            acc.neu += cur.counts.neu;
            acc.neg += cur.counts.neg;
            return acc;
          },
          { pos: 0, neu: 0, neg: 0 }
        );
        setCounts(agg);
      }

      // Maintain sliding window of last 5 minutes
      scoresRef.current = [...scoresRef.current, { ts: now, score }].filter(
        (s) => now - s.ts <= 5 * 60 * 1000
      );

      const sum = scoresRef.current.reduce((a, b) => a + b.score, 0);
      setAvgScore(sum / scoresRef.current.length);
    });

    return () => socket.disconnect();
  }, [channel]);

  // On mount: seed with recent history so gauge & average are accurate after reload
  useEffect(() => {
    if (!channel) return;
    fetch(`${BACKEND}/api/sentiment/${channel}/history`)
      .then((r) => r.json())
      .then((hist) => {
        if (hist.length) {
          const last = hist[hist.length - 1];
          setScore(last.score);

          const now = Date.now();
          scoresRef.current = hist
            .filter((d) => now - d.ts <= 5 * 60 * 1000)
            .map((d) => ({ ts: d.ts, score: d.score }));

          if (scoresRef.current.length) {
            const sum = scoresRef.current.reduce((a, b) => a + b.score, 0);
            setAvgScore(sum / scoresRef.current.length);
          }
        }
      })
      .catch(() => {});
  }, [channel]);

  const current = score > 0.25 ? 'happy' : score < -0.25 ? 'sad' : 'neutral';

  return (
    <div className="flex flex-col items-center mt-2">
      <RainbowGauge counts={counts} score={avgScore} />
      <span className="text-8xl drop-shadow-lg emoji-float select-none pointer-events-none mt-8">
        {EMOJI[current]}
      </span>
    </div>
  );
}
