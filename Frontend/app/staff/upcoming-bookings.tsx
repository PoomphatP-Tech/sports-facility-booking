import { useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Spinner } from "react-bootstrap";
import { bookingService } from "~/services/booking.service";
import type { UpcomingBookingForStaff } from "~/services/types";

export default function UpcomingBookings() {
    const [bookings, setBookings] = useState<UpcomingBookingForStaff[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [processingId, setProcessingId] = useState<number | null>(null);

    const loadBookings = async () => {
        try {
            setLoading(true);
            setErrorMsg("");
            const response = await bookingService.getUpcomingBookingsForStaff();
            if (response.status === "ok") {
                setBookings(response.data);
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

    const handleComplete = async (bookingId: number) => {
        const confirmed = window.confirm(
            "Mark this session as completed? This cannot be undone."
        );
        if (!confirmed) return;

        try {
            setProcessingId(bookingId);
            setErrorMsg("");
            setSuccessMsg("");
            const response = await bookingService.completeBooking(bookingId);
            if (response.status === "ok") {
                setSuccessMsg(response.data?.message || "Booking marked as completed");
                setBookings((prev) => prev.filter((b) => b.bookingId !== bookingId));
            } else {
                setErrorMsg(response.message || "Failed to complete booking");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to complete booking");
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <Spinner animation="border" />
                <p className="mt-3">Loading upcoming bookings...</p>
            </div>
        );
    }

    return (
        <div className="container py-4" style={{ maxWidth: "1000px" }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">Upcoming Bookings</h2>
                    <p className="text-muted mb-0">
                        Mark sessions as completed after they finish
                    </p>
                </div>
                <Badge bg="primary" pill style={{ fontSize: "1rem" }}>
                    {bookings.length} upcoming
                </Badge>
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

            {bookings.length === 0 && !errorMsg && (
                <Card className="text-center py-5">
                    <Card.Body>
                        <h5 className="text-muted mb-2">No upcoming bookings</h5>
                        <p className="text-muted mb-0">
                            No approved bookings to manage right now.
                        </p>
                    </Card.Body>
                </Card>
            )}

            {bookings.map((b) => {
                const isProcessing = processingId === b.bookingId;
                return (
                    <Card key={b.bookingId} className="mb-3 shadow-sm">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <h5 className="mb-1">{b.facility.name}</h5>
                                    <div className="text-muted small">
                                        Booking #{b.bookingId}
                                    </div>
                                </div>
                                <Badge bg="primary">Upcoming</Badge>
                            </div>

                            <hr />

                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <div className="text-muted small">Member</div>
                                    <div>
                                        <strong>
                                            {b.member.firstName} {b.member.lastName}
                                        </strong>
                                    </div>
                                    <div className="small text-muted">{b.member.email}</div>
                                </div>

                                <div className="col-md-6 mb-3">
                                    <div className="text-muted small">Session time</div>
                                    <div>
                                        <strong>{b.bookingDate}</strong>
                                    </div>
                                    <div>
                                        {b.startTime} – {b.endTime}
                                    </div>
                                </div>

                                <div className="col-12">
                                    <div className="text-muted small">Activity</div>
                                    <div>{b.intendedActivity || "(not specified)"}</div>
                                </div>
                            </div>

                            <div className="mt-3">
                                <Button
                                    variant="success"
                                    size="sm"
                                    disabled={isProcessing}
                                    onClick={() => handleComplete(b.bookingId)}
                                >
                                    {isProcessing ? "Processing..." : "Mark as Completed"}
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                );
            })}
        </div>
    );
}