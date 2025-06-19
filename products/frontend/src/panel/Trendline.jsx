import { LineChart, Line, XAxis, Tooltip, YAxis } from 'recharts';
import { useEffect, useState, useCallback } from 'react';
import { connectSocket } from '../common/socket';

export default function Trendline({ channel, small = false }) {
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
    const socket = connectSocket(channel, { panel: true });
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
      <div className="bg-[#23232b] text-white p-2 rounded shadow-lg w-64 border border-[#a970ff]">
        <div className="font-bold mb-1 text-[#a970ff]">
          {new Date(ts).toLocaleTimeString()} — Score:{' '}
          <span className="text-[#00c7ac]">{payload[0].value.toFixed(2)}</span>
        </div>
        {loading ? (
          <div>Loading messages...</div>
        ) : messages.length ? (
          <ul className="text-xs list-disc pl-4 max-h-24 overflow-y-auto">
            {messages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-gray-400">No sample messages</div>
        )}
      </div>
    );
  };

  return (
    <div
      className="bg-[#23232b] rounded-lg shadow border border-[#27272a] p-2 flex flex-col items-center w-full"
      style={{ maxWidth: 280 }}
    >
      <LineChart
        width={260}
        height={small ? 140 : 200}
        data={data}
        margin={{ top: 10, right: 0, bottom: 0, left: 0 }}
      >
        <XAxis dataKey="ts" hide tickFormatter={() => ''} />
        <YAxis domain={[-1, 1]} hide />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="score"
          strokeWidth={2}
          dot={false}
          stroke="#a970ff"
        />
      </LineChart>
    </div>
  );
}
