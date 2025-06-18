import { io } from 'socket.io-client';

export function connectSocket(channel, { panel = false } = {}) {
  return io(import.meta.env.VITE_BACKEND_URL, {
    query: { channel, panel: panel ? 'true' : 'false' },
  });
}
