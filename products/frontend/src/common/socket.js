import { io } from 'socket.io-client';

export function connectSocket(channel) {
  return io(import.meta.env.VITE_BACKEND_URL, { query: { channel } });
}

