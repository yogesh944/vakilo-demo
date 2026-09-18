import { Bell, Check, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { apiRequest } from "../services/api";

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationPanelProps {
  token: string | null;
}

export default function NotificationPanel({
  token,
}: NotificationPanelProps) {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const loadNotifications = async () => {
    if (!token) return;

    try {
      setLoading(true);

      const data =
        await apiRequest<NotificationItem[]>(
          "/notifications/",
          {
            token,
          }
        );

      setNotifications(
        Array.isArray(data) ? data : []
      );

      const unread =
        data.filter(
          (item) => !item.is_read
        ).length;

      setUnreadCount(unread);

    } catch (error) {
      console.error(
        "Failed to load notifications:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!token) return;

    try {
      const data =
        await apiRequest<{ unread: number }>(
          "/notifications/unread-count",
          {
            token,
          }
        );

      setUnreadCount(
        data?.unread ?? 0
      );

    } catch (error) {
      console.error(
        "Failed to load unread count:",
        error
      );
    }
  };

  useEffect(() => {
    if (!token) return;

    void loadUnreadCount();

    const interval =
      window.setInterval(() => {
        void loadUnreadCount();
      }, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [token]);

  const handleOpen = () => {
    const nextState = !open;

    setOpen(nextState);

    if (nextState) {
      void loadNotifications();
    }
  };

  const markAsRead = async (
    notificationId: number
  ) => {
    if (!token) return;

    try {
      await apiRequest(
        `/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          token,
        }
      );

      setNotifications(
        (previous) =>
          previous.map((notification) =>
            notification.id ===
            notificationId
              ? {
                  ...notification,
                  is_read: true,
                }
              : notification
          )
      );

      setUnreadCount(
        (previous) =>
          Math.max(0, previous - 1)
      );

    } catch (error) {
      console.error(
        "Failed to mark notification as read:",
        error
      );
    }
  };

  const deleteNotification = async (
    notificationId: number
  ) => {
    if (!token) return;

    try {
      const notification =
        notifications.find(
          (item) =>
            item.id === notificationId
        );

      await apiRequest(
        `/notifications/${notificationId}`,
        {
          method: "DELETE",
          token,
        }
      );

      setNotifications(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !== notificationId
          )
      );

      if (
        notification &&
        !notification.is_read
      ) {
        setUnreadCount(
          (previous) =>
            Math.max(0, previous - 1)
        );
      }

    } catch (error) {
      console.error(
        "Failed to delete notification:",
        error
      );
    }
  };

  return (
    <div className="relative">

      {/* =====================================================
          BELL
      ===================================================== */}

      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative rounded-full p-2.5 text-[#55504A] transition hover:bg-[#F0EBE1]"
      >
        <Bell size={19} />

        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C9A227] px-1 text-[10px] font-bold text-[#171717]">
            {unreadCount > 99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </button>


      {/* =====================================================
          PANEL
      ===================================================== */}

      {open && (
        <>
          {/* Mobile/background overlay */}

          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />

          <div className="absolute right-0 top-14 z-50 w-[350px] max-w-[calc(100vw-2rem)] border border-[#D7CFBF] bg-[#FBF9F4] shadow-xl">

            {/* Header */}

            <div className="flex items-center justify-between border-b border-[#D7CFBF] px-5 py-4">

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                  Updates
                </p>

                <h3 className="mt-1 font-serif text-lg font-semibold">
                  Notifications
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1.5 text-[#77716A] hover:bg-[#F0EBE1]"
              >
                <X size={17} />
              </button>

            </div>


            {/* Content */}

            <div className="max-h-[420px] overflow-y-auto">

              {loading && (
                <div className="px-5 py-10 text-center text-sm text-[#77716A]">
                  Loading notifications...
                </div>
              )}


              {!loading &&
                notifications.length === 0 && (
                  <div className="px-5 py-10 text-center">

                    <Bell
                      size={28}
                      className="mx-auto text-[#A39B8E]"
                    />

                    <p className="mt-3 font-serif font-semibold">
                      No notifications
                    </p>

                    <p className="mt-1 text-xs text-[#77716A]">
                      You're all caught up.
                    </p>

                  </div>
                )}


              {!loading &&
                notifications.map(
                  (notification) => (
                    <div
                      key={notification.id}
                      className={`border-b border-[#E1DBD0] px-5 py-4 transition hover:bg-[#F5F1E9] ${
                        notification.is_read
                          ? ""
                          : "bg-[#F7F2E7]"
                      }`}
                    >

                      <div className="flex gap-3">

                        {/* Unread indicator */}

                        <div
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            notification.is_read
                              ? "bg-transparent"
                              : "bg-[#C9A227]"
                          }`}
                        />

                        <div className="min-w-0 flex-1">

                          <p className="text-sm font-semibold">
                            {notification.title}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-[#66615A]">
                            {notification.message}
                          </p>

                          <p className="mt-2 text-[10px] text-[#999187]">
                            {new Date(
                              notification.created_at
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </p>

                          <div className="mt-3 flex items-center gap-3">

                            {!notification.is_read && (
                              <button
                                type="button"
                                onClick={() =>
                                  void markAsRead(
                                    notification.id
                                  )
                                }
                                className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#8A6D1D]"
                              >
                                <Check size={13} />
                                Mark read
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                void deleteNotification(
                                  notification.id
                                )
                              }
                              className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#77716A] hover:text-red-600"
                            >
                              <Trash2 size={13} />
                              Delete
                            </button>

                          </div>

                        </div>

                      </div>

                    </div>
                  )
                )}

            </div>

          </div>
        </>
      )}

    </div>
  );
}