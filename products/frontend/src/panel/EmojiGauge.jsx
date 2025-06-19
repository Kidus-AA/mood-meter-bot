import { useEffect, useState } from 'react';
import { connectSocket } from '../common/socket';
import RainbowGauge from './RainbowGauge.jsx';

const EMOJI = { happy: '😊', neutral: '😐', sad: '🙁' };
const BACKEND = import.meta.env.VITE_BACKEND_URL;

export default function EmojiGauge({ channel }) {
  const [score, setScore] = useState(0);
  const [counts, setCounts] = useState({ pos: 0, neu: 0, neg: 0 });

  useEffect(() => {
    if (!channel) return;
    const socket = connectSocket(channel, { panel: true });

    socket.on('sentiment:update', ({ score, counts }) => {
      setScore(score);
      if (counts) setCounts(counts);
    });

    return () => socket.disconnect();
  }, [channel]);

  // On mount: seed with recent history so gauge is accurate after reload
  useEffect(() => {
    if (!channel) return;
    fetch(`${BACKEND}/api/sentiment/${channel}/history`)
      .then((r) => r.json())
      .then((hist) => {
        if (hist.length) {
          const last = hist[hist.length - 1];
          setScore(last.score);
        }
      })
      .catch(() => {});
  }, [channel]);

  const current = score > 0.25 ? 'happy' : score < -0.25 ? 'sad' : 'neutral';

  const totalMsgs = counts.pos + counts.neu + counts.neg;

  return (
    <div className="flex flex-col items-center">
      <RainbowGauge
        counts={counts}
        faded={totalMsgs < 10}
        radius={70}
        thickness={18}
      />
      <span className="text-8xl drop-shadow-lg emoji-float select-none pointer-events-none mt-[-50px]">
        {EMOJI[current]}
      </span>
    </div>
  );
}
