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
    <div className="w-full h-full flex flex-col items-center justify-center text-6xl select-none">
      <span>{EMOJI[current]}</span>
      <div className="mt-2 flex gap-2 text-base">
        {Object.keys(EMOJI).map((v) => (
          <button key={v} onClick={() => sendVote(v)} className="px-2 py-1 rounded bg-gray-700/60 hover:bg-gray-600/60">
            {EMOJI[v]}
          </button>
        ))}
      </div>
    </div>
  );
}

