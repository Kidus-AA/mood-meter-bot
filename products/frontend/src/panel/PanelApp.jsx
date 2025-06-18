import { useState, useEffect } from 'react';
import Trendline from './Trendline.jsx';

export default function PanelApp() {
  const [channelId, setChannelId] = useState(null);

  useEffect(() => {
    if (
      (window.Twitch && window.Twitch.ext) ||
      import.meta.env.VITE_APP_ENV === 'local'
    ) {
      window.Twitch.ext.onAuthorized((auth) => {
        setChannelId(auth.channelId);
      });

      if (import.meta.env.VITE_APP_ENV === 'local') {
        setChannelId('1234567890');
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 gap-6">
      <h1 className="text-2xl font-bold">Sentiment Snapshot Panel</h1>
      {channelId ? (
        <>
          <p className="opacity-80 text-sm mb-2">
            Authorized for channel <b>{channelId}</b>
          </p>
          <Trendline channel={channelId} />

          <div className="flex flex-col items-center gap-2 pt-4">
            <p className="text-sm opacity-70 italic">
              Controls coming soon: alert thresholds, calibration, export…
            </p>
          </div>
        </>
      ) : (
        <p className="italic text-sm opacity-60">
          Waiting for Twitch authorization…
        </p>
      )}
    </div>
  );
}
