import { useEffect, useState } from "react";
import {
    Alert,
    Badge,
    Button,
    Card,
    Form,
    ListGroup,
    Modal,
    Spinner,
} from "react-bootstrap";
import { bookingService } from "~/services/booking.service";
import type { PendingBookingRequest, AlternativeFacility } from "~/services/types";

export default function PendingRequests() {
    const [requests, setRequests] = useState<PendingBookingRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [processingId, setProcessingId] = useState<number | null>(null);

    // Reject
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    // Alternative
    const [altModalOpen, setAltModalOpen] = useState(false);
    const [altTargetId, setAltTargetId] = useState<number | null>(null);
    const [altFacilities, setAltFacilities] = useState<AlternativeFacility[]>([]);
    const [altLoading, setAltLoading] = useState(false);
    const [selectedAltId, setSelectedAltId] = useState<number | null>(null);

    const loadRequests = async () => {
        try {
            setLoading(true);
            setErrorMsg("");
            const response = await bookingService.getPendingRequests();
            if (response.status === "ok") {
                setRequests(response.data);
            } else {
                setErrorMsg(response.message || "Failed to load requests");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to load requests");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadRequests();
    }, []);

    const handleApprove = async (requestId: number) => {
        const confirmed = window.confirm("Are you sure you want to approve this booking request?");
        if (!confirmed) return;
        try {
            setProcessingId(requestId);
            setErrorMsg("");
            setSuccessMsg("");
            const response = await bookingService.approveRequest(requestId);
            if (response.status === "ok") {
                setSuccessMsg(response.data?.message || "Request approved!");
                setRequests((prev) => prev.filter((r) => r.bookingRequestId !== requestId));
            } else {
                setErrorMsg(response.message || "Failed to approve");
            }
        } catch (err: any) {
            setErrorMsg(err?.message || "Failed to approve request");
        } finally {
            setProcessingId(null);
        }
    };

    const openRejectModal = (requestId: number) => {
        setRejectTargetId(requestId);
        setRejectReason("");
        setRejectModalOpen(true);
    };

    const handleReject = async () => {
        if (rejectTargetId === null) return;
        try {
            setProcessingId(rejectTargetId);
            setErrorMsg("");
            setSuccessMsg("");
            setRejectModalOpen(false);
            const response = await bookingService.rejectRequest(rejectTargetId, rejectReason.trim());
            if (response.status === "ok") {
                setSuccessMsg(response.data?.message || "Request rejected.");
                setRequests((prev) => prev.filter((r) => r.bookingRequestId !== rejectTargetId));
            } else {
                setErrorMsg(response.message || "Failed to reject");
            }
        } catch (err: any) {
            setErrorMsg(err?.message || "Failed to reject request");
        } finally {
            setProcessingId(null);
            setRejectTargetId(null);
        }
    };

    // Alternative
    const openAltModal = async (requestId: number) => {
        setAltTargetId(requestId);
        setSelectedAltId(null);
        setAltModalOpen(true);
        setAltLoading(true);
        try {
            const response = await bookingService.searchAlternatives(requestId);
            if (response.status === "ok") {
                setAltFacilities(response.data);
            } else {
                setAltFacilities([]);
            }
        } catch {
            setAltFacilities([]);
        } finally {
            setAltLoading(false);
        }
    };

    const handleSuggestAlt = async () => {
        if (altTargetId === null || selectedAltId === null) return;
        try {
            setProcessingId(altTargetId);
            setErrorMsg("");
            setSuccessMsg("");
            setAltModalOpen(false);
            const response = await bookingService.suggestAlternative(altTargetId, selectedAltId);
            if (response.status === "ok") {
                setSuccessMsg(response.data?.message || "Alternative suggested!");
                setRequests((prev) => prev.filter((r) => r.bookingRequestId !== altTargetId));
            } else {
                setErrorMsg(response.message || "Failed to suggest alternative");
            }
        } catch (err: any) {
            setErrorMsg(err?.message || "Failed to suggest alternative");
        } finally {
            setProcessingId(null);
            setAltTargetId(null);
        }
    };

    const formatTimeAgo = (isoString: string) => {
        const then = new Date(isoString).getTime();
        const now = Date.now();
        const diffMinutes = Math.floor((now - then) / 60000);
        if (diffMinutes < 1) return "just now";
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours} hr ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    };

    if (loading) {
        return (
            <div className="container py-5 text-center">
                <Spinner animation="border" />
                <p className="mt-3">Loading pending requests...</p>
            </div>
        );
    }

    return (
        <div className="container py-4" style={{ maxWidth: "1000px" }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1">Pending Booking Requests</h2>
                    <p className="text-muted mb-0">Review and manage booking requests for your facilities</p>
                </div>
                <Badge bg="primary" pill style={{ fontSize: "1rem" }}>
                    {requests.length} pending
                </Badge>
            </div>

            {errorMsg && <Alert variant="danger" dismissible onClose={() => setErrorMsg("")}>{errorMsg}</Alert>}
            {successMsg && <Alert variant="success" dismissible onClose={() => setSuccessMsg("")}>{successMsg}</Alert>}

            {requests.length === 0 && !errorMsg && (
                <Card className="text-center py-5">
                    <Card.Body>
                        <h5 className="text-muted mb-2">No pending requests</h5>
                        <p className="text-muted mb-0">All requests for your facilities have been handled.</p>
                    </Card.Body>
                </Card>
            )}

            {requests.map((req) => {
                const isProcessing = processingId === req.bookingRequestId;
                return (
                    <Card key={req.bookingRequestId} className="mb-3 shadow-sm">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                    <h5 className="mb-1">{req.facility.name}</h5>
                                    <div className="text-muted small">
                                        Request #{req.bookingRequestId} · submitted {formatTimeAgo(req.createdAt)}
                                    </div>
                                </div>
                                <Badge bg="warning" text="dark">Pending</Badge>
                            </div>
                            <hr />
                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <div className="text-muted small">Requested by</div>
                                    <div><strong>{req.member.firstName} {req.member.lastName}</strong></div>
                                    <div className="small text-muted">{req.member.email}</div>
                                </div>
                                <div className="col-md-6 mb-3">
                                    <div className="text-muted small">Booking time</div>
                                    <div><strong>{req.bookingDate}</strong></div>
                                    <div>{req.startTime} – {req.endTime}</div>
                                </div>
                                <div className="col-12">
                                    <div className="text-muted small">Intended activity</div>
                                    <div>{req.intendedActivity || "(not specified)"}</div>
                                </div>
                            </div>
                            <div className="mt-3 d-flex gap-2">
                                <Button variant="success" size="sm" disabled={isProcessing} onClick={() => handleApprove(req.bookingRequestId)}>
                                    {isProcessing ? "Processing..." : "Approve"}
                                </Button>
                                <Button variant="danger" size="sm" disabled={isProcessing} onClick={() => openRejectModal(req.bookingRequestId)}>
                                    Reject
                                </Button>
                                <Button variant="outline-info" size="sm" disabled={isProcessing} onClick={() => openAltModal(req.bookingRequestId)}>
                                    Suggest Alternative
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                );
            })}

            <Modal show={rejectModalOpen} onHide={() => setRejectModalOpen(false)} centered>
                <Modal.Header closeButton><Modal.Title>Reject Booking Request</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Reason for rejection (optional)</Form.Label>
                        <Form.Control as="textarea" rows={3} placeholder="e.g. Court reserved for maintenance" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} maxLength={500} />
                        <Form.Text className="text-muted">This reason will be sent to the member.</Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleReject}>Confirm Reject</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={altModalOpen} onHide={() => setAltModalOpen(false)} centered size="lg">
                <Modal.Header closeButton><Modal.Title>Suggest Alternative Facility</Modal.Title></Modal.Header>
                <Modal.Body>
                    {altLoading ? (
                        <div className="text-center py-3"><Spinner animation="border" /><p className="mt-2">Searching available facilities...</p></div>
                    ) : altFacilities.length === 0 ? (
                        <Alert variant="warning">No alternative facilities available for this time slot.</Alert>
                    ) : (
                        <>
                            <p className="text-muted">Select a facility to suggest to the member:</p>
                            <ListGroup>
                                {altFacilities.map((f) => (
                                    <ListGroup.Item
                                        key={f.facilityId}
                                        active={selectedAltId === f.facilityId}
                                        onClick={() => setSelectedAltId(f.facilityId)}
                                        style={{ cursor: "pointer" }}
                                        className="d-flex justify-content-between align-items-center"
                                    >
                                        <div>
                                            <strong>{f.name}</strong>
                                            {f.description && <div className="small text-muted">{f.description}</div>}
                                        </div>
                                        <Badge bg={f.spotsLeft <= 2 ? "warning" : "success"} text={f.spotsLeft <= 2 ? "dark" : undefined}>
                                            {f.spotsLeft}/{f.maxPeople} spots left
                                        </Badge>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setAltModalOpen(false)}>Cancel</Button>
                    <Button variant="primary" disabled={selectedAltId === null} onClick={handleSuggestAlt}>
                        Suggest This Facility
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}