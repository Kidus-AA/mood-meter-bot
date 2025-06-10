import React from 'react';
import ReactDOM from 'react-dom/client';
import Trendline from './Trendline.jsx';

const channel =
  new URLSearchParams(window.location.search).get('channel') || 'mychannel';

function Panel({ channel }) {
  const backend = import.meta.env.VITE_BACKEND_URL;
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h2 className="text-lg font-bold">Sentiment Trendline</h2>
      <Trendline channel={channel} />
      <div className="flex gap-2 mt-4">
        <a
          href={`${backend}/api/session/${channel}/report.json`}
          className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          download
        >
          Download JSON Report
        </a>
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <Panel channel={channel} />
);
