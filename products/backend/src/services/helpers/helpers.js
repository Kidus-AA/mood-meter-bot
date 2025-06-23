export const channelKey = (channel) =>
  encodeURIComponent(channel.startsWith('#') ? channel.slice(1) : channel);
