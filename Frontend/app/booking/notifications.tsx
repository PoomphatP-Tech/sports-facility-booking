import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, ListGroup, Spinner } from "react-bootstrap";
import { bookingService } from "~/services/booking.service";
import type { NotificationItem } from "~/services/types";

export default function Notifications() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    const loadNotifications = async () => {
        try {
            setLoading(true);
            setErrorMsg("");
            const response = await bookingService.getNotifications();
            if (response.status === "ok") {
                setNotifications(response.data);
            } else {
                setErrorMsg(response.message || "Failed to load notifications");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadNotifications();
    }, []);

    const handleMarkRead = async (notifId: number) => {
        try {
            await bookingService.markNotificationRead(notifId);
            setNotifications((prev) =>
                prev.map((n) => (n.notifId === notifId ? { ...n, isRead: true } : n))
            );
        } catch {
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await bookingService.markAllNotificationsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        } catch {
        }
    };

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const formatTime = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const typeBadge = (type: string | null) => {
        const variants: Record<string, { bg: string; label: string }> = {
            booking_approved: { bg: "success", label: "Approved" },
            booking_rejected: { bg: "danger", label: "Rejected" },
            booking_cancelled: { bg: "secondary", label: "Cancelled" },
            alt_suggested: { bg: "info", label: "Alternative Suggested" },
        };
        const config = type && variants[type] ? variants[type] : { bg: "info", label: type || "Info" };
        return <Badge bg={config.bg}>{config.label}</Badge>;
    };

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <Spinner animation="border" />
                <p className="mt-3">Loading notifications...</p>
            </div>
        );
    }

    return (
        <div className="container py-4" style={{ maxWidth: "800px" }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">Notifications</h2>
                    {unreadCount > 0 && (
                        <span className="text-muted">{unreadCount} unread</span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <Button variant="outline-primary" size="sm" onClick={handleMarkAllRead}>
                        Mark all as read
                    </Button>
                )}
            </div>

            {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

            {notifications.length === 0 && (
                <Card className="text-center py-5">
                    <Card.Body>
                        <h5 className="text-muted">No notifications yet</h5>
                        <p className="text-muted mb-0">
                            You'll receive notifications when your bookings are approved or
                            rejected.
                        </p>
                    </Card.Body>
                </Card>
            )}

            <ListGroup>
                {notifications.map((n) => (
                    <ListGroup.Item
                        key={n.notifId}
                        className={`d-flex justify-content-between align-items-start ${
                            !n.isRead ? "bg-light border-start border-primary border-3" : ""
                        }`}
                        style={{ cursor: !n.isRead ? "pointer" : "default" }}
                        onClick={() => !n.isRead && handleMarkRead(n.notifId)}
                    >
                        <div className="me-3" style={{ flex: 1 }}>
                            <div className="d-flex align-items-center gap-2 mb-1">
                                {typeBadge(n.type)}
                                {!n.isRead && (
                                    <Badge bg="primary" pill style={{ fontSize: "0.6rem" }}>
                                        NEW
                                    </Badge>
                                )}
                            </div>
                            <div>{n.message}</div>
                            <div className="text-muted small mt-1">{formatTime(n.sendingAt)}</div>
                        </div>
                    </ListGroup.Item>
                ))}
            </ListGroup>
        </div>
    );
}