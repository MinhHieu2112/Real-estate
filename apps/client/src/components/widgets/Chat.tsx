"use client";

import React, { useState, useEffect } from "react";
import { ChatConversation } from "@shared/types";
import { useGetAuthUserQuery, useGetConversationsQuery } from "@/state/api";
import ConversationList from "./ConversationList";
import ConversationView from "./ConversationView";
import { AlertCircle, RefreshCw } from "lucide-react";
import { getChatSocket, disconnectChatSocket } from "@/lib/socket";

const Chat = () => {
  const [selectedConversation, setSelectedConversation] =
    useState<ChatConversation | null>(null);

  const { data: authUser } = useGetAuthUserQuery();
  const cognitoId = authUser?.cognitoInfo?.userId;

  const {
    data: conversations = [],
    isLoading,
    isError,
    refetch,
  } = useGetConversationsQuery(cognitoId!, {
    skip: !cognitoId,
    // Không cần polling thường xuyên khi đã có WebSocket, dùng 60 giây làm fallback
    pollingInterval: 60_000,
  });

  // Kết nối socket khi user đăng nhập, ngắt khi unmount
  useEffect(() => {
    if (!cognitoId) return;

    // Khởi tạo socket để lắng nghe sự kiện global (ví dụ: cập nhật badge unread)
    getChatSocket(cognitoId);

    return () => {
      disconnectChatSocket();
    };
  }, [cognitoId]);

  // ─── Error state ─────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-10 gap-3 px-4">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-gray-600 text-center">
          Không thể tải tin nhắn
        </p>
        <button
          onClick={refetch}
          className="flex items-center gap-1.5 text-xs text-primary-600 hover:underline"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Thử lại
        </button>
      </div>
    );
  }

  // ─── Conversation detail view ─────────────────────────────────────────────────
  if (selectedConversation && cognitoId) {
    return (
      <ConversationView
        conversation={selectedConversation}
        currentUserCognitoId={cognitoId}
        onBack={() => setSelectedConversation(null)}
      />
    );
  }

  // ─── Conversation list view ───────────────────────────────────────────────────
  return (
    <ConversationList
      conversations={conversations}
      isLoading={isLoading || !cognitoId}
      onSelect={setSelectedConversation}
    />
  );
};

export default Chat;