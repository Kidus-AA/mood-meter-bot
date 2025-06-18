import { useEffect, useState } from 'react';

const EMOJI = { happy: '😊', neutral: '😐', sad: '🙁' };

export default function OverlayApp() {
  const [score, setScore] = useState(0);
  const channel = new URLSearchParams(window.location.search).get('channel');

  useEffect(() => {
    // Placeholder: simulate sentiment changing every 3 seconds in dev
    const interval = setInterval(() => {
      setScore((prev) => (prev >= 1 ? -1 : prev + 0.2));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const current = score > 0.3 ? 'happy' : score < -0.3 ? 'sad' : 'neutral';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center select-none pointer-events-none">
      <span className="text-8xl drop-shadow-lg">{EMOJI[current]}</span>
      <p className="text-sm mt-2 opacity-70">{channel ?? 'Dev'} sentiment</p>
    </div>
  );
}
