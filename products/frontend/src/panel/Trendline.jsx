import { LineChart, Line, XAxis, Tooltip, YAxis } from 'recharts';
import { useEffect, useState, useCallback } from 'react';
import { connectSocket } from '../common/socket';

export default function Trendline({ channel }) {
  const [data, setData] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTs, setActiveTs] = useState(null);

  // Fetch history on mount
  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/sentiment/${channel}/history`
    )
      .then((r) => r.json())
      .then((d) => setData(d));
  }, [channel]);

  // Listen for live updates
  useEffect(() => {
    const socket = connectSocket(channel);
    socket.on('sentiment:update', ({ score, ts }) => {
      setData((prev) => [...prev.slice(-179), { ts, score }]);
    });
    return () => socket.disconnect();
  }, [channel]);

  // Fetch messages for a bucket
  const fetchMessages = useCallback(
    (ts) => {
      setLoading(true);
      setActiveTs(ts);
      fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/api/sentiment/${channel}/messages?ts=${ts}`
      )
        .then((r) => r.json())
        .then((msgs) => setMessages(msgs))
        .finally(() => setLoading(false));
    },
    [channel]
  );

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const ts = label;
    if (activeTs !== ts) fetchMessages(ts);
    return (
      <div className="bg-white text-black p-2 rounded shadow w-64">
        <div className="font-bold mb-1">
          {new Date(ts).toLocaleTimeString()} — Score:{' '}
          {payload[0].value.toFixed(2)}
        </div>
        {loading ? (
          <div>Loading messages...</div>
        ) : messages.length ? (
          <ul className="text-xs list-disc pl-4">
            {messages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        ) : (
          <div className="text-xs">No sample messages</div>
        )}
      </div>
    );
  };

  return (
    <LineChart
      width={280}
      height={260}
      data={data}
      margin={{ top: 10, right: 0, bottom: 0, left: 0 }}
    >
      <XAxis dataKey="ts" hide tickFormatter={() => ''} />
      <YAxis domain={[-1, 1]} hide />
      <Tooltip content={<CustomTooltip />} />
      <Line type="monotone" dataKey="score" strokeWidth={2} dot={false} />
    </LineChart>
  );
}
