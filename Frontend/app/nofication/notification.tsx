import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Dropdown } from "react-bootstrap";
import type { NotificationItem } from "~/services/types";
import { notificationService } from "~/services/notification.service";
import notificationIcon from "~/image/notification.png";
import "./notification.css";

export default function NotificationBell() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    useEffect(() => {
        notificationService.getNotifications()
            .then(setNotifications)
            .catch(() => {});
    }, []);

    const unread = notifications.filter((n) => !n.isRead);
    const read = notifications.filter((n) => n.isRead);
    const unreadCount = unread.length;

    const handleMarkRead = async (notifId: number) => {
        try {
            await notificationService.markRead(notifId);
            setNotifications((prev) =>
                prev.map((n) => n.notifId === notifId ? { ...n, isRead: true } : n)
            );
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationService.markAllRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch (error) {
            console.error("Failed to mark all notifications as read:", error);
        }
    };

    return (
        <Dropdown>
            <Dropdown.Toggle as="div" className="notification-toggle" bsPrefix="notification-toggle">
                <div className="notification-bell-wrapper">
                    <img src={notificationIcon} alt="Notifications" className="notification-bell-icon" />
                    {unreadCount > 0 && (
                        <span className="notification-badge">
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </div>
            </Dropdown.Toggle>

            <Dropdown.Menu align="end" className="notification-dropdown">
                <div className="notification-header">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <button type="button" className="notification-mark-all" onClick={handleMarkAllRead}>
                            Mark all as read
                        </button>
                    )}
                </div>

                {notifications.length === 0 ? (
                    <div className="notification-empty">No notifications yet.</div>
                ) : (
                    <>
                        {unread.length > 0 && (
                            <>
                                <div className="notification-section-label">Unread</div>
                                {unread.map((n) => (
                                    <div
                                        key={n.notifId}
                                        className="notification-item notification-item--unread"
                                        onClick={() => { void handleMarkRead(n.notifId); navigate("/booking/my"); }}
                                    >
                                        <p className="notification-message">{n.message}</p>
                                        <span className="notification-time">
                                            {new Date(n.sendingAt).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </>
                        )}
                        {read.length > 0 && (
                            <>
                                <div className="notification-section-label">Read</div>
                                {read.map((n) => (
                                    <div key={n.notifId} className="notification-item notification-item--read" onClick={() => navigate("/booking/my")}>
                                        <p className="notification-message">{n.message}</p>
                                        <span className="notification-time">
                                            {new Date(n.sendingAt).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </>
                        )}
                    </>
                )}
            </Dropdown.Menu>
        </Dropdown>
    );
}
