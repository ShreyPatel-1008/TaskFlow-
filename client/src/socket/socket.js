import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (token) => {
  // If already connected, return existing socket
  if (socket?.connected) return socket;
  
  // If a previous socket exists but is disconnected, clean it up first
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  // Connect through the Vite proxy (same origin) to avoid CORS issues
  // In production, connect to the API server directly
  const isProduction = import.meta.env.PROD;
  const SOCKET_URL = isProduction 
    ? (import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin)
    : window.location.origin; // Uses Vite proxy at /socket.io

  console.log('[Socket] Connecting to:', SOCKET_URL, 'with token:', token ? 'present' : 'MISSING');

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected! ID:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('error', (err) => {
    console.error('[Socket] Server error:', err);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};
