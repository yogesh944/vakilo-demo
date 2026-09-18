import { io, type Socket } from "socket.io-client";

const SOCKET_URL = "https://vakilo-demo-2.onrender.com/";

let socket: Socket | null = null;

export function connectSocket(
  token: string
): Socket {
  if (socket) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    auth: {
      token,
    },
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
