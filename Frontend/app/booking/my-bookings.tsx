import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Badge, Button, Card, Spinner, Tab, Tabs } from "react-bootstrap";
import { bookingService } from "~/services/booking.service";
import type { MyBookingItem } from "~/services/types";

export default function MyBookings() {
    const navigate = useNavigate();

    const [upcoming, setUpcoming] = useState<MyBookingItem[]>([]);
    const [history, setHistory] = useState<MyBookingItem[]>([]);
    const [pendingRequests, setPendingRequests] = useState<MyBookingItem[]>([]);
    const [rejected, setRejected] = useState<MyBookingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [cancellingId, setCancellingId] = useState<number | null>(null);

    const loadBookings = async () => {
        try {
            setLoading(true);
            setErrorMsg("");
            const response = await bookingService.getMyBookings();
            if (response.status === "ok") {
                setUpcoming(response.data.upcoming);
                setHistory(response.data.history);
                setPendingRequests(response.data.pendingRequests);
                setRejected(response.data.rejected);
            } else {
                setErrorMsg(response.message || "Failed to load bookings");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to load bookings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadBookings();
    }, []);

    const handleCancel = async (bookingId: number) => {
        const confirmed = window.confirm(
            "Are you sure you want to cancel this booking?"
        );
        if (!confirmed) return;

        try {
            setCancellingId(bookingId);
            setErrorMsg("");
            setSuccessMsg("");
            const response = await bookingService.cancelBooking(bookingId);
            if (response.status === "ok") {
                setSuccessMsg(response.data?.message || "Booking cancelled");
                await loadBookings();
            } else {
                setErrorMsg(response.message || "Failed to cancel");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to cancel booking");
        } finally {
            setCancellingId(null);
        }
    };

    const handleCancelPending = async (requestId: number) => {
        const confirmed = window.confirm(
            "Are you sure you want to withdraw this pending request?"
        );
        if (!confirmed) return;

        try {
            setCancellingId(requestId);
            setErrorMsg("");
            setSuccessMsg("");
            const response = await bookingService.cancelPendingRequest(requestId);
            if (response.status === "ok") {
                setSuccessMsg(response.data?.message || "Request withdrawn");
                await loadBookings();
            } else {
                setErrorMsg(response.message || "Failed to withdraw request");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to withdraw request");
        } finally {
            setCancellingId(null);
        }
    };

    const statusBadge = (status: string) => {
        const variants: Record<string, string> = {
            upcoming: "primary",
            completed: "success",
            cancelled: "secondary",
            pending: "warning",
            rejected: "danger",
            alt_suggested: "info",
        };
        return (
            <Badge bg={variants[status] || "info"} text={status === "pending" ? "dark" : undefined}>
                {status}
            </Badge>
        );
    };

    const renderBookingCard = (item: MyBookingItem, showCancel: boolean) => (
        <Card
            key={item.bookingId || item.bookingRequestId}
            className="mb-3 shadow-sm"
        >
            <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                    <div>
                        <h5 className="mb-1">{item.facilityName}</h5>
                        <div>
                            <strong>{item.bookingDate}</strong> · {item.startTime} –{" "}
                            {item.endTime}
                        </div>
                        {item.intendedActivity && (
                            <div className="text-muted small mt-1">
                                {item.intendedActivity}
                            </div>
                        )}
                    </div>
                    <div className="text-end">
                        {statusBadge(item.bookingStatus || item.requestStatus || "unknown")}
                    </div>
                </div>
                {showCancel && item.bookingId && (
                    <div className="mt-3">
                        <Button
                            variant="outline-danger"
                            size="sm"
                            disabled={cancellingId === item.bookingId}
                            onClick={() => handleCancel(item.bookingId!)}
                        >
                            {cancellingId === item.bookingId
                                ? "Cancelling..."
                                : "Cancel Booking"}
                        </Button>
                    </div>
                )}
                {item.requestStatus === "alt_suggested" && item.bookingRequestId && (
                    <div className="mt-3">
                        <Alert variant="info" className="mb-2">
                            <strong>Staff suggested an alternative:</strong>{" "}
                            {item.altFacilityName || "Unknown facility"}
                        </Alert>
                        <div className="d-flex gap-2">
                            <Button
                                variant="success"
                                size="sm"
                                onClick={async () => {
                                    try {
                                        setErrorMsg("");
                                        setSuccessMsg("");
                                        const response = await bookingService.respondToAlternative(
                                            item.bookingRequestId!,
                                            true
                                        );
                                        if (response.status === "ok") {
                                            setSuccessMsg(response.data?.message || "Alternative accepted!");
                                            await loadBookings();
                                        } else {
                                            setErrorMsg(response.message || "Failed to accept");
                                        }
                                    } catch (err: any) {
                                        setErrorMsg(err?.message || "Failed to accept alternative");
                                    }
                                }}
                            >
                                Accept Alternative
                            </Button>
                            <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={async () => {
                                    const confirmed = window.confirm("Decline this alternative? The request will be closed.");
                                    if (!confirmed) return;
                                    try {
                                        setErrorMsg("");
                                        setSuccessMsg("");
                                        const response = await bookingService.respondToAlternative(
                                            item.bookingRequestId!,
                                            false
                                        );
                                        if (response.status === "ok") {
                                            setSuccessMsg(response.data?.message || "Alternative declined.");
                                            await loadBookings();
                                        } else {
                                            setErrorMsg(response.message || "Failed to decline");
                                        }
                                    } catch (err: any) {
                                        setErrorMsg(err?.message || "Failed to decline alternative");
                                    }
                                }}
                            >
                                Decline
                            </Button>
                        </div>
                    </div>
                )}
                {item.requestStatus === "pending" && item.bookingRequestId && (
                    <div className="mt-3">
                        <Button
                            variant="outline-danger"
                            size="sm"
                            disabled={cancellingId === item.bookingRequestId}
                            onClick={() => handleCancelPending(item.bookingRequestId!)}
                        >
                            {cancellingId === item.bookingRequestId
                                ? "Cancelling..."
                                : "Withdraw Request"}
                        </Button>
                    </div>
                )}
            </Card.Body>
        </Card>
    );

    const emptyState = (text: string) => (
        <Card className="text-center py-4">
            <Card.Body>
                <p className="text-muted mb-0">{text}</p>
            </Card.Body>
        </Card>
    );

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <Spinner animation="border" />
                <p className="mt-3">Loading your bookings...</p>
            </div>
        );
    }

    return (
        <div className="container py-4" style={{ maxWidth: "900px" }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">My Bookings</h2>
                <Button variant="primary" onClick={() => navigate("/")}>
                    Book a Facility
                </Button>
            </div>

            {errorMsg && (
                <Alert variant="danger" dismissible onClose={() => setErrorMsg("")}>
                    {errorMsg}
                </Alert>
            )}
            {successMsg && (
                <Alert variant="success" dismissible onClose={() => setSuccessMsg("")}>
                    {successMsg}
                </Alert>
            )}

            <Tabs defaultActiveKey="upcoming" className="mb-4">
                <Tab
                    eventKey="upcoming"
                    title={`Upcoming (${upcoming.length})`}
                >
                    {upcoming.length === 0
                        ? emptyState("No upcoming bookings")
                        : upcoming.map((b) => renderBookingCard(b, true))}
                </Tab>

                <Tab
                    eventKey="pending"
                    title={`Pending (${pendingRequests.length})`}
                >
                    {pendingRequests.length === 0
                        ? emptyState("No pending requests")
                        : pendingRequests.map((b) => renderBookingCard(b, false))}
                </Tab>

                <Tab
                    eventKey="history"
                    title={`History (${history.length + rejected.length})`}
                >
                    {history.length + rejected.length === 0
                        ? emptyState("No booking history")
                        : (
                            <>
                                {rejected.map((b) => renderBookingCard(b, false))}
                                {history.map((b) => renderBookingCard(b, false))}
                            </>
                        )}
                </Tab>
            </Tabs>
        </div>
    );
}