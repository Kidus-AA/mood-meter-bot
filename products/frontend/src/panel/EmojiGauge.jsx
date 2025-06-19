import { useEffect, useState, useRef } from 'react';
import { connectSocket } from '../common/socket';

const EMOJI = { happy: '😊', neutral: '😐', sad: '🙁' };
const WINDOW_SIZE = 6; // last ~1min

export default function EmojiGauge({ channel }) {
  const [avgScore, setAvgScore] = useState(0);
  const scoresRef = useRef([]);

  useEffect(() => {
    if (!channel) return;
    const socket = connectSocket(channel, { panel: true });

    socket.on('sentiment:update', ({ score }) => {
      scoresRef.current = [...scoresRef.current, score].slice(-WINDOW_SIZE);
      const sum = scoresRef.current.reduce((a, b) => a + b, 0);
      setAvgScore(sum / scoresRef.current.length);
    });

    return () => socket.disconnect();
  }, [channel]);

  const current =
    avgScore > 0.25 ? 'happy' : avgScore < -0.25 ? 'sad' : 'neutral';

  return (
    <span className="text-8xl drop-shadow-lg emoji-float select-none pointer-events-none">
      {EMOJI[current]}
    </span>
  );
}
