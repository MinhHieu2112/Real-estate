"use client";

import React from "react";
import { ChatConversation } from "@shared/types";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ConversationListProps {
  conversations: ChatConversation[];
  isLoading: boolean;
  onSelect: (conversation: ChatConversation) => void;
}

const ConversationList = ({
  conversations,
  isLoading,
  onSelect,
}: ConversationListProps) => {
  if (isLoading) {
    return (
      <div className="divide-y">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
        <MessageCircle className="w-10 h-10 text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">Chưa có cuộc trò chuyện</p>
        <p className="text-xs text-gray-400 mt-1">Cuộc trò chuyện sẽ xuất hiện tại đây</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {conversations.map((conv) => {
        const peerName = conv.peer?.name || "Người dùng";
        const initials = peerName.charAt(0).toUpperCase();
        const hasUnread = conv.unreadCount > 0;
        const timeAgo = conv.lastMessageAt
          ? formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })
          : "";

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
              hasUnread ? "bg-primary-50" : ""
            }`}
          >
            <Avatar className="w-10 h-10 shrink-0">
              <AvatarFallback className="bg-primary-200 text-primary-700 font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <p className={`truncate text-sm ${hasUnread ? "font-semibold text-black" : "font-medium text-gray-700"}`}>
                  {peerName}
                </p>
                {timeAgo && (
                  <span className="text-xs text-gray-400 ml-2 shrink-0">{timeAgo}</span>
                )}
              </div>

              <p className={`text-xs truncate mt-0.5 ${hasUnread ? "text-gray-800" : "text-gray-500"}`}>
                {conv.lastMessage ?? "Bắt đầu cuộc trò chuyện"}
              </p>
            </div>

            {hasUnread && (
              <span className="ml-1 min-w-[18px] h-[18px] rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ConversationList;
