import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

function Config() {
  const [jwt, setJwt] = useState(null);
  const [channelId, setChannelId] = useState(null);

  useEffect(() => {
    if (window.Twitch && window.Twitch.ext) {
      window.Twitch.ext.onAuthorized((auth) => {
        setJwt(auth.token);
        setChannelId(auth.channelId);
      });
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Mood Meter Configuration</h1>
      {jwt ? (
        <div>
          <p className="mb-2">
            Extension is authorized for channel: <b>{channelId}</b>
          </p>
          <p className="text-xs break-all">JWT: {jwt}</p>
          {/* Add configuration UI here */}
        </div>
      ) : (
        <p>Waiting for Twitch authorization...</p>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Config />);
