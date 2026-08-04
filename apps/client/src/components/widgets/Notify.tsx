"use client";

import { Bell, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Notification } from "@shared/types";
import {
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} from "@/state/api";

interface NotifyProps {
  notifications: Notification[];
  userId: string;
}

const Notify = ({ notifications, userId }: NotifyProps) => {
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (notifications.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-gray-400">
        Chưa có thông báo nào
      </div>
    );
  }

  return (
    <div>
      {unreadCount > 0 && (
        <div className="px-4 py-2 flex justify-end">
          <button
            onClick={() => markAllAsRead(userId)}
            className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
          >
            <Check className="w-3 h-3" />
            Đánh dấu tất cả đã đọc
          </button>
        </div>
      )}
      <div className="divide-y max-h-96 overflow-y-auto">
        {notifications.map((item) => (
          <button
            key={item.id}
            onClick={() => !item.isRead && markAsRead(item.id)}
            className={`w-full px-4 py-3 flex gap-3 text-left hover:bg-gray-50 transition-colors ${
              item.isRead ? "" : "bg-primary-50"
            }`}
          >
            <div className="mt-1 shrink-0">
              <Bell className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-zinc-700 truncate">
                {item.title}
              </p>
              <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                {item.content}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {formatDistanceToNow(new Date(item.createdAt), {
                  addSuffix: true,
                  locale: vi,
                })}
              </p>
            </div>
            {!item.isRead && (
              <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Notify;