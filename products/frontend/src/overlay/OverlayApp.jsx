import { useEffect, useState, useRef } from 'react';
import { connectSocket } from '../common/socket';

const EMOJI = { happy: '😊', neutral: '😐', sad: '🙁' };

// How many recent scores to average together – 6×10 s ≈ 1 min window
const WINDOW_SIZE = 6;

export default function OverlayApp() {
  const [avgScore, setAvgScore] = useState(0);
  const scoresRef = useRef([]);

  const channel = new URLSearchParams(window.location.search).get('channel');

  // Subscribe to live sentiment updates
  useEffect(() => {
    if (!channel) return; // must supply ?channel=

    const socket = connectSocket(channel);
    socket.on('sentiment:update', ({ score }) => {
      scoresRef.current = [...scoresRef.current, score].slice(-WINDOW_SIZE);
      const sum = scoresRef.current.reduce((a, b) => a + b, 0);
      setAvgScore(sum / scoresRef.current.length);
    });

    return () => socket.disconnect();
  }, [channel]);

  // Determine the displayed emoji based on a smoother threshold
  const current =
    avgScore > 0.25 ? 'happy' : avgScore < -0.25 ? 'sad' : 'neutral';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center select-none pointer-events-none">
      <span className="text-8xl drop-shadow-lg transition-transform duration-300 ease-out emoji-float">
        {EMOJI[current]}
      </span>
      <p className="text-sm mt-2 opacity-70">
        {channel ?? 'Channel'} sentiment
      </p>
    </div>
  );
}
