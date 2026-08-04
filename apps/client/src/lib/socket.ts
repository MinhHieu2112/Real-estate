import { io, Socket } from "socket.io-client";

let chatSocket: Socket | null = null;
let notifySocket: Socket | null = null;

const getBackendUrl = () =>
  process.env.NEXT_PUBLIC_API_BASE_URL
    ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api\/?$/, "")
    : "http://localhost:3000";

export const getChatSocket = (cognitoId: string): Socket => {
  if (!chatSocket || chatSocket.disconnected) {
    chatSocket = io(`${getBackendUrl()}/chat`, {
      query: { cognitoId },
      transports: ["websocket", "polling"],
    });
  }
  return chatSocket;
};

export const disconnectChatSocket = () => {
  if (chatSocket) {
    chatSocket.disconnect();
    chatSocket = null;
  }
};

// ─── Notify Socket ────────────────────────────────────────────────────────────

export const getNotifySocket = (cognitoId: string): Socket => {
  if (!notifySocket || notifySocket.disconnected) {
    notifySocket = io(`${getBackendUrl()}/notify`, {
      query: { cognitoId },
      transports: ["websocket", "polling"],
    });
  }
  return notifySocket;
};

export const disconnectNotifySocket = () => {
  if (notifySocket) {
    notifySocket.disconnect();
    notifySocket = null;
  }
};
