"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ChatConversation, Message } from "@shared/types";
import {
  useGetMessagesQuery,
  useMarkAsReadMutation,
  useSendMessageMutation,
  useDeleteMessageMutation,
  useDeleteConversationMutation,
} from "@/state/api";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { ArrowLeft, Loader2, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { getChatSocket } from "@/lib/socket";
import { toast } from "sonner";

interface ConversationViewProps {
  conversation: ChatConversation;
  currentUserCognitoId: string;
  onBack: () => void;
}

const ConversationView = ({
  conversation,
  currentUserCognitoId,
  onBack,
}: ConversationViewProps) => {
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [realtimeMessages, setRealtimeMessages] = useState<Message[]>([]);
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  // Load lịch sử tin nhắn lần đầu qua HTTP
  const { data: historicalMessages = [], isLoading } = useGetMessagesQuery(
    conversation.id
  );

  const [markAsRead] = useMarkAsReadMutation();
  const [sendMessage] = useSendMessageMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [deleteConversation] = useDeleteConversationMutation();

  const peerName = conversation.peer?.name || "Người dùng";

  // Danh sách tin nhắn cuối cùng = lịch sử + real-time (loại bỏ các tin đã bị xóa)
  const allMessages = [...historicalMessages, ...realtimeMessages.filter(
    (rt) => !historicalMessages.some((h) => h.id === rt.id)
  )].filter((msg) => !deletedMessageIds.has(msg.id));

  // Kết nối Socket.IO, join room, lắng nghe sự kiện newMessage, messageDeleted, conversationDeleted
  useEffect(() => {
    if (!currentUserCognitoId || !conversation.id) return;

    const socket = getChatSocket(currentUserCognitoId);

    const handleNewMessage = (msg: Message) => {
      if (msg.conversationId !== conversation.id) return;
      setRealtimeMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const handleMessageDeleted = (data: { messageId: number; conversationId: number }) => {
      if (data.conversationId !== conversation.id) return;
      setDeletedMessageIds((prev) => new Set(prev).add(data.messageId));
    };

    const handleConversationDeleted = (data: { conversationId: number }) => {
      if (data.conversationId !== conversation.id) return;
      toast.info("Cuộc trò chuyện đã bị xóa");
      onBack();
    };

    socket.emit("joinConversation", { conversationId: conversation.id });
    socket.on("newMessage", handleNewMessage);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("conversationDeleted", handleConversationDeleted);

    if (!initializedRef.current) {
      setRealtimeMessages([]);
      initializedRef.current = true;
    }

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("conversationDeleted", handleConversationDeleted);
      socket.emit("leaveConversation", { conversationId: conversation.id });
      initializedRef.current = false;
    };
  }, [conversation.id, currentUserCognitoId, onBack]);

  // Đánh dấu đã đọc khi mở conversation
  useEffect(() => {
    if (conversation.id && currentUserCognitoId) {
      markAsRead({
        conversationId: conversation.id,
        userCognitoId: currentUserCognitoId,
      });
    }
  }, [conversation.id, currentUserCognitoId, markAsRead]);

  // Auto-scroll xuống cuối khi có tin mới
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  // Focus input khi mở
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleDeleteMessage = useCallback(
    async (messageId: number) => {
      try {
        await deleteMessage(messageId).unwrap();
        setDeletedMessageIds((prev) => new Set(prev).add(messageId));
        toast.success("Đã xóa tin nhắn");
      } catch (err: any) {
        toast.error(err?.data?.message || "Không thể xóa tin nhắn");
      }
    },
    [deleteMessage]
  );

  const handleDeleteConversation = useCallback(async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa toàn bộ cuộc trò chuyện này không? Hành động này không thể hoàn tác.")) {
      return;
    }
    try {
      await deleteConversation(conversation.id).unwrap();
      toast.success("Đã xóa cuộc trò chuyện");
      onBack();
    } catch (err: any) {
      toast.error(err?.data?.message || "Không thể xóa cuộc trò chuyện");
    }
  }, [deleteConversation, conversation.id, onBack]);

  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || isSending) return;

    setInputValue("");
    setIsSending(true);

    try {
      await sendMessage({
        conversationId: conversation.id,
        senderCognitoId: currentUserCognitoId,
        content,
      }).unwrap();
    } catch {
      toast.error("Không thể gửi tin nhắn. Vui lòng thử lại.");
      setInputValue(content);
    } finally {
      setIsSending(false);
    }
  }, [inputValue, isSending, conversation.id, currentUserCognitoId, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isOwnMessage = (msg: Message) =>
    Boolean(
      currentUserCognitoId &&
        msg.senderCognitoId &&
        msg.senderCognitoId.trim().toLowerCase() ===
          currentUserCognitoId.trim().toLowerCase()
    );

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <ConversationHeader
          peerName={peerName}
          onBack={onBack}
          onDeleteConversation={handleDeleteConversation}
        />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ConversationHeader
        peerName={peerName}
        onBack={onBack}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {allMessages.length === 0 && (
          <p className="text-center text-xs text-gray-400 pt-4">
            Bắt đầu cuộc trò chuyện 👋
          </p>
        )}

        {allMessages.map((msg) => {
          const own = isOwnMessage(msg);
          return (
            <div
              key={msg.id}
              className={cn(
                "group flex items-center gap-1.5",
                own ? "justify-end" : "justify-start"
              )}
            >
              {!own && (
                <Avatar className="w-6 h-6 shrink-0 mb-0.5">
                  <AvatarFallback className="text-[10px] bg-primary-100 text-primary-700">
                    {peerName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}

              {own && (
                <button
                  onClick={() => handleDeleteMessage(msg.id)}
                  title="Xóa tin nhắn"
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <div
                className={cn(
                  "max-w-[72%] px-3 py-2 rounded-2xl text-sm leading-snug break-words",
                  own
                    ? "bg-primary-600 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                )}
              >
                <p>{msg.content}</p>
                <p
                  className={cn(
                    "text-[10px] mt-1 text-right",
                    own ? "text-primary-200" : "text-gray-400"
                  )}
                >
                  {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: false })}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-3 py-2 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập tin nhắn..."
          maxLength={2000}
          className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 border rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-primary-300 transition"
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isSending}
          className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
          aria-label="Gửi tin nhắn"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Send className="w-4 h-4 text-white" />
          )}
        </button>
      </div>
    </div>
  );
};

// ─── Header sub-component ─────────────────────────────────────────────────────

const ConversationHeader = ({
  peerName,
  onBack,
  onDeleteConversation,
}: {
  peerName: string;
  onBack: () => void;
  onDeleteConversation: () => void;
}) => (
  <div className="flex items-center justify-between border-b px-3 py-2">
    <div className="flex items-center gap-2 min-w-0">
      <button
        onClick={onBack}
        className="p-1.5 rounded-full hover:bg-gray-100 transition"
        aria-label="Quay lại danh sách"
      >
        <ArrowLeft className="w-4 h-4 text-gray-600" />
      </button>
      <Avatar className="w-7 h-7">
        <AvatarFallback className="text-xs bg-primary-200 text-primary-700 font-medium">
          {peerName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <p className="text-sm font-medium text-gray-800 truncate">{peerName}</p>
    </div>

    <button
      onClick={onDeleteConversation}
      title="Xóa toàn bộ cuộc trò chuyện"
      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex items-center gap-1 text-xs"
    >
      <Trash2 className="w-4 h-4" />
      <span className="hidden sm:inline">Xóa trò chuyện</span>
    </button>
  </div>
);

export default ConversationView;
