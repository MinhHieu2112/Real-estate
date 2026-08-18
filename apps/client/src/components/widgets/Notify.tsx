"use client";

import { Bell, Check, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Notification } from "@shared/types";
import {
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllNotificationsMutation,
} from "@/state/api";
import { toast } from "sonner";

interface NotifyProps {
  notifications: Notification[];
  userId: string;
}

const Notify = ({ notifications, userId }: NotifyProps) => {
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const [deleteAllNotifications] = useDeleteAllNotificationsMutation();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleDeleteSingle = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await deleteNotification(id).unwrap();
      toast.success("Đã xóa thông báo");
    } catch {
      toast.error("Không thể xóa thông báo");
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllNotifications().unwrap();
      toast.success("Đã xóa tất cả thông báo");
    } catch {
      toast.error("Không thể xóa tất cả thông báo");
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-sm text-gray-400">
        Chưa có thông báo nào
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 py-2 flex items-center justify-between border-b text-xs">
        {unreadCount > 0 ? (
          <button
            onClick={() => markAllAsRead(userId)}
            className="flex items-center gap-1 text-primary-600 hover:underline font-medium"
          >
            <Check className="w-3 h-3" />
            Đánh dấu tất cả đã đọc
          </button>
        ) : (
          <span className="text-gray-400">Tất cả đã đọc</span>
        )}

        <button
          onClick={handleDeleteAll}
          className="flex items-center gap-1 text-red-500 hover:underline font-medium ml-auto"
        >
          <Trash2 className="w-3 h-3" />
          Xóa tất cả
        </button>
      </div>

      <div className="divide-y max-h-96 overflow-y-auto">
        {notifications.map((item) => (
          <div
            key={item.id}
            onClick={() => !item.isRead && markAsRead(item.id)}
            className={`group w-full px-4 py-3 flex gap-3 text-left hover:bg-gray-50 transition-colors cursor-pointer relative ${
              item.isRead ? "" : "bg-primary-50"
            }`}
          >
            <div className="mt-1 shrink-0">
              <Bell className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
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

            <div className="flex flex-col items-end justify-between shrink-0">
              <button
                onClick={(e) => handleDeleteSingle(e, item.id)}
                title="Xóa thông báo"
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity rounded hover:bg-gray-200/50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              {!item.isRead && (
                <div className="w-2 h-2 mb-1 bg-blue-500 rounded-full shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notify;