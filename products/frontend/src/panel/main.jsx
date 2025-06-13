import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import Trendline from './Trendline.jsx';
import { connectSocket } from '../common/socket';

const urlChannel = new URLSearchParams(window.location.search).get('channel');
// const backend = import.meta.env.VITE_BACKEND_URL;
const backend = 'http://localhost:4000';

function Panel({ channel }) {
  const [threshold, setThreshold] = useState(-0.5);
  const [duration, setDuration] = useState(30);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  // Fetch current alert settings
  useEffect(() => {
    if (!channel) return;
    fetch(`${backend}/api/alerts/${channel}`)
      .then((r) => r.json())
      .then(({ threshold, duration }) => {
        if (typeof threshold === 'number') setThreshold(threshold);
        if (typeof duration === 'number') setDuration(duration);
      });
  }, [channel]);

  // Listen for alert events
  useEffect(() => {
    if (!channel) return;
    const socket = connectSocket(channel);
    socket.on('alert:triggered', (data) => {
      setAlert(data);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 10000);
    });
    return () => socket.disconnect();
  }, [channel]);

  const saveAlertSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    await fetch(`${backend}/api/alerts/${channel}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold, duration }),
    });
    setSaving(false);
  };

  // Download JSON report using fetch + Blob
  const downloadJson = async (e) => {
    e.preventDefault();
    const res = await fetch(`${backend}/api/session/${channel}/report.json`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${channel}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {showBanner && alert && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded shadow-lg z-50 text-lg font-bold animate-pulse">
          ⚠️ Alert: Sentiment below {alert.threshold} for {alert.duration}{' '}
          seconds!
        </div>
      )}
      <h2 className="text-lg font-bold">Sentiment Trendline</h2>
      <Trendline channel={channel} />
      <form
        onSubmit={saveAlertSettings}
        className="flex flex-col items-center gap-2 mt-4 p-3 border rounded bg-gray-50 w-full max-w-xs"
      >
        <div className="font-semibold mb-1">Custom Alert Settings</div>
        <label className="flex flex-col w-full">
          Threshold:{' '}
          <span className="text-xs">(Trigger if sentiment stays below)</span>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
          <input
            type="number"
            min="-1"
            max="1"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full border rounded px-2 py-1 mt-1"
          />
        </label>
        <label className="flex flex-col w-full">
          Duration (seconds):
          <input
            type="number"
            min="5"
            max="300"
            step="1"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full border rounded px-2 py-1 mt-1"
          />
        </label>
        <button
          type="submit"
          className="mt-2 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
      <div className="flex gap-2 mt-4">
        <button
          onClick={downloadJson}
          className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Download JSON Report
        </button>
        <a
          href={`${backend}/api/session/${channel}/report.csv`}
          className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
          download
        >
          Download CSV Report
        </a>
      </div>
    </div>
  );
}

function Landing() {
  const [input, setInput] = useState('');
  const goToChannel = (e) => {
    e.preventDefault();
    if (input.trim()) {
      window.location.href = `?channel=${encodeURIComponent(
        input.trim().toLowerCase()
      )}`;
    }
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-2xl font-bold">Sentiment Snapshot Panel</h1>
      <form onSubmit={goToChannel} className="flex flex-col items-center gap-2">
        <label className="font-semibold">Enter your Twitch channel name:</label>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border rounded px-3 py-2 text-lg"
          placeholder="e.g. kidusaye"
        />
        <button
          type="submit"
          className="mt-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Go to Channel Panel
        </button>
      </form>
      <div className="text-gray-500 text-sm">
        You must enter a channel to view sentiment analytics and reports.
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  urlChannel ? <Panel channel={urlChannel} /> : <Landing />
);
