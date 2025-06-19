import {
  LineChart,
  Line,
  XAxis,
  Tooltip,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useEffect, useState, useCallback } from 'react';
import { connectSocket } from '../common/socket';

export default function Trendline({ channel, small = false }) {
  const [data, setData] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTs, setActiveTs] = useState(null);

  const POINT_MS = 10_000; // bucket size in backend
  const BASE_POINTS = 180; // 30 min baseline

  // Helper to generate neutral baseline
  const neutralSeries = () => {
    const now = Date.now();
    return Array.from({ length: BASE_POINTS }, (_, i) => ({
      ts: now - (BASE_POINTS - i) * POINT_MS,
      score: 0,
    }));
  };

  // Fetch history on mount
  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_BACKEND_URL}/api/sentiment/${channel}/history`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.length === 0) {
          setData(neutralSeries());
        } else {
          // Prepend baseline up to earliest point so line has context
          const firstTs = d[0].ts;
          const now = Date.now();
          const pointsBefore = [];
          for (let ts = firstTs - POINT_MS * 10; ts < firstTs; ts += POINT_MS) {
            pointsBefore.push({ ts, score: 0 });
          }
          setData([...pointsBefore, ...d]);
        }
      });
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
    const ts = label;

    // Fetch messages only when tooltip activates for new bucket
    useEffect(() => {
      if (active && payload && payload.length && activeTs !== ts) {
        fetchMessages(ts);
      }
    }, [active, ts]);

    if (!active || !payload || !payload.length) return null;

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
        <CartesianGrid stroke="#444" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="ts" hide tickFormatter={() => ''} />
        <YAxis domain={[-1, 1]} ticks={[-1, -0.5, 0, 0.5, 1]} hide />
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
