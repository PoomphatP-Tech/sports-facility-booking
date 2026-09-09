import { api } from "./http";
import type { NotificationsResponse, NotificationItem } from "./types";

type MarkReadResponse = { status: "ok"; message: string };

export const notificationService = {
  getNotifications: async (): Promise<NotificationItem[]> => {
    const { data } = await api.get<NotificationsResponse>("/notifications");
    return data.data;
  },

  markRead: async (notifId: number): Promise<void> => {
    await api.post<MarkReadResponse>(`/notifications/${notifId}/read`);
  },

  markAllRead: async (): Promise<void> => {
    await api.post<MarkReadResponse>("/notifications/read-all");
  },
};
