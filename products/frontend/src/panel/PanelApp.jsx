import { useState, useEffect } from 'react';
import Trendline from './Trendline.jsx';
import EmojiGauge from './EmojiGauge.jsx';

export default function PanelApp() {
  const [channelId, setChannelId] = useState(null);

  useEffect(() => {
    // 1) Manual override via URL param (?channel=loginOrId)
    const urlParam = new URLSearchParams(window.location.search).get('channel');
    if (urlParam) {
      setChannelId(urlParam);
      return; // skip Twitch auth handling
    }

    if (window.Twitch && window.Twitch.ext) {
      window.Twitch.ext.onAuthorized((auth) => {
        setChannelId(auth.channelId);
      });
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
          <EmojiGauge channel={channelId} />

          <Trendline channel={channelId} small />

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
