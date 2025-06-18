import { useEffect, useState } from 'react';
import { connectSocket } from '../common/socket';

const EMOJI = { happy: '😊', neutral: '😐', sad: '🙁' };

export default function Overlay({ channel }) {
  const [score, setScore] = useState(0);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const s = connectSocket(channel);
    s.on('sentiment:update', ({ score }) => setScore(score));
    setSocket(s);
    return () => s.disconnect();
  }, [channel]);

  const current = score > 0.3 ? 'happy' : score < -0.3 ? 'sad' : 'neutral';

  const sendVote = (vote) => socket?.emit('calibrate', { channel, vote });

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-dark rounded-lg border border-purple shadow-lg text-6xl select-none p-2">
      <span className="drop-shadow-lg">{EMOJI[current]}</span>
      <div className="mt-2 flex gap-2 text-base">
        {Object.keys(EMOJI).map((v) => (
          <button
            key={v}
            onClick={() => sendVote(v)}
            className="px-3 py-1 rounded bg-semidark border text-white hover:bg-primary hover:text-white transition shadow focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {EMOJI[v]}
          </button>
        ))}
      </div>
    </div>
  );
}
