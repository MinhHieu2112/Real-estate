import { io, Socket } from "socket.io-client";

let chatSocket: Socket | null = null;

export const getChatSocket = (cognitoId: string): Socket => {
  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL
    ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api\/?$/, "")
    : "http://localhost:3000";

  if (!chatSocket || chatSocket.disconnected) {
    chatSocket = io(`${backendUrl}/chat`, {
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
