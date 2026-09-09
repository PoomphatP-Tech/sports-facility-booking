import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from "react-bootstrap";
import { bookingService } from "~/services/booking.service";
import { partnerMatchingService, type PartnerItem } from "~/services/partner-matching.service";
import type { AvailableSlot, FacilitySlots } from "~/services/types";
import "./new-booking.css";

const DAY_LABEL: Record<string, string> = {
    sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed",
    thu: "Thu", fri: "Fri", sat: "Sat",
};

const getToday = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const fmtDuration = (minutes: number) =>
    minutes % 60 === 0 && minutes >= 60
        ? `${minutes / 60} hr${minutes / 60 > 1 ? "s" : ""}`
        : `${minutes} min`;

export default function NewBooking() {
    const { facilityId } = useParams<{ facilityId: string }>();
    const navigate = useNavigate();

    const [facilityData, setFacilityData] = useState<FacilitySlots | null>(null);
    const [selectedDate, setSelectedDate] = useState(getToday());
    const [selectedSlots, setSelectedSlots] = useState<AvailableSlot[]>([]);
    const [activity, setActivity] = useState("");

    const [loadingSlots, setLoadingSlots] = useState(false);
    const [partners, setPartners] = useState<PartnerItem[]>([]);
    const [partnersLoading, setPartnersLoading] = useState(false);
    const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const fetchSlots = async (date: string) => {
        if (!facilityId) return;
        setLoadingSlots(true);
        setSelectedSlots([]);
        setErrorMsg("");
        try {
            const response = await bookingService.getAvailableSlots(parseInt(facilityId, 10), date);
            if (response.status === "ok") {
                setFacilityData(response.data);
            } else {
                setErrorMsg(response.message || "Failed to load slots");
            }
        } catch (err: unknown) {
            setErrorMsg((err as { message?: string }).message || "Failed to load slots");
        } finally {
            setLoadingSlots(false);
        }
    };

    useEffect(() => {
        const loadPartners = async () => {
            try {
                setPartnersLoading(true);
                const response = await partnerMatchingService.getPartners();
                setPartners(response.data ?? []);
            } catch {
                // Non-critical: partner list failure should not block booking
            } finally {
                setPartnersLoading(false);
            }
        };
        void loadPartners();
    }, []);

    useEffect(() => { void fetchSlots(selectedDate); }, [facilityId]);

    const handleDateChange = (date: string) => {
        setSelectedDate(date);
        void fetchSlots(date);
    };

    const toggleSlot = (slot: AvailableSlot) => {
        if (!slot.available) return;
        setSelectedSlots((prev) => {
            const exists = prev.some((s) => s.startTime === slot.startTime);
            const next = exists
                ? prev.filter((s) => s.startTime !== slot.startTime)
                : [...prev, slot].sort((a, b) => a.startTime.localeCompare(b.startTime));
            return next;
        });
    };

    const isConsecutive = (slots: AvailableSlot[]) => {
        for (let i = 1; i < slots.length; i++) {
            if (slots[i].startTime !== slots[i - 1].endTime) return false;
        }
        return true;
    };

    const startTime = selectedSlots[0]?.startTime ?? "";
    const endTime = selectedSlots[selectedSlots.length - 1]?.endTime ?? "";
    const maxOccupied = selectedSlots.length > 0
        ? Math.max(...selectedSlots.map((s) => s.occupied))
        : 0;

    const handleSubmit = async () => {
        if (!facilityData || selectedSlots.length === 0 || !activity.trim()) return;

        if (!isConsecutive(selectedSlots)) {
            setErrorMsg("Please select consecutive time slots.");
            return;
        }

        setSubmitting(true);
        setErrorMsg("");
        try {
            const response = await bookingService.submitBookingRequest({
                facilityId: facilityData.facilityId,
                slotDate: selectedDate,
                startTime,
                endTime,
                intendedActivity: activity.trim(),
                ...(selectedPartnerId != null && { partnerMemberId: selectedPartnerId }),
            });
            if (response.status === "ok") {
                setSuccessMsg("Booking request submitted! Waiting for staff approval.");
                setTimeout(() => navigate("/"), 3000);
            } else {
                setErrorMsg(response.message || "Failed to submit");
            }
        } catch (err: unknown) {
            setErrorMsg((err as { message?: string }).message || "Failed to submit booking request");
        } finally {
            setSubmitting(false);
        }
    };

    if (!facilityData && loadingSlots) {
        return (
            <div className="container py-5 text-center">
                <Spinner animation="border" />
                <p className="mt-3">Loading facility data...</p>
            </div>
        );
    }

    return (
        <div className="container py-4" style={{ maxWidth: 1100 }}>
            <Button variant="link" className="px-0 mb-3" onClick={() => navigate("/")}>
                ← Back to facilities
            </Button>

            <h2>Book Facility</h2>
            <p className="text-muted">Complete your booking request</p>

            {errorMsg && (
                <Alert variant="danger" dismissible onClose={() => setErrorMsg("")}>
                    {errorMsg}
                </Alert>
            )}
            {successMsg && <Alert variant="success">{successMsg}</Alert>}

            <Row>
                {/* LEFT — booking details */}
                <Col lg={8}>
                    <Card className="mb-4">
                        <Card.Body>
                            <Card.Title className="mb-4">Booking Details</Card.Title>

                            <Form.Group className="mb-4">
                                <Form.Label>Facility Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={facilityData?.facilityName ?? ""}
                                    disabled
                                />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label>Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={selectedDate}
                                    min={getToday()}
                                    onChange={(e) => handleDateChange(e.target.value)}
                                />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label>
                                    Select Time Slot
                                    {selectedSlots.length > 1 && (
                                        <span className="text-muted ms-2" style={{ fontSize: "0.8rem" }}>
                                            ({selectedSlots.length} slots — {startTime} to {endTime})
                                        </span>
                                    )}
                                </Form.Label>

                                {loadingSlots ? (
                                    <div className="py-3 text-center">
                                        <Spinner animation="border" size="sm" />
                                        <span className="ms-2 text-muted">Loading slots…</span>
                                    </div>
                                ) : !facilityData || facilityData.slots.length === 0 ? (
                                    <p className="text-muted">Facility is closed on the selected day.</p>
                                ) : (
                                    <div className="booking-slot-grid">
                                        {facilityData.slots.map((slot) => {
                                            const isSelected = selectedSlots.some(
                                                (s) => s.startTime === slot.startTime
                                            );
                                            return (
                                                <button
                                                    key={slot.startTime}
                                                    type="button"
                                                    className={[
                                                        "booking-slot-btn",
                                                        !slot.available ? "booking-slot-btn--full" : "",
                                                        isSelected ? "booking-slot-btn--selected" : "",
                                                    ].join(" ")}
                                                    disabled={!slot.available}
                                                    onClick={() => toggleSlot(slot)}
                                                >
                                                    {!slot.available && (
                                                        <span className="booking-slot-badge">FULL</span>
                                                    )}
                                                    {slot.startTime} – {slot.endTime}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label>Intended Activity</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="e.g., Recreational badminton, Training session"
                                    value={activity}
                                    onChange={(e) => setActivity(e.target.value)}
                                    maxLength={500}
                                />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <Form.Label>
                                    Select a Partner{" "}
                                    <span className="text-muted fw-normal">(optional)</span>
                                </Form.Label>
                                <Form.Select
                                    value={selectedPartnerId ?? ""}
                                    onChange={(e) =>
                                        setSelectedPartnerId(
                                            e.target.value === "" ? null : parseInt(e.target.value, 10)
                                        )
                                    }
                                    disabled={partnersLoading}
                                >
                                    <option value="">
                                        {partnersLoading ? "Loading partners…" : "No partner — individual booking"}
                                    </option>
                                    {partners.map((p) => (
                                        <option key={p.member_id} value={p.member_id}>
                                            {[p.first_name, p.last_name].filter(Boolean).join(" ")}
                                            {p.sport && p.sport !== "Not specified" ? ` — ${p.sport}` : ""}
                                            {p.skill_level && p.skill_level !== "Not specified"
                                                ? ` · ${p.skill_level}`
                                                : ""}
                                            {p.availability && p.availability !== "Not specified"
                                                ? ` · ${p.availability}`
                                                : ""}
                                            {p.preferred_time && p.preferred_time !== "Not specified"
                                                ? ` · ${p.preferred_time}`
                                                : ""}
                                        </option>
                                    ))}
                                </Form.Select>
                                <Form.Text className="text-muted">
                                    Selecting a partner sends them a match request linked to this booking.
                                </Form.Text>
                            </Form.Group>

                            <div className="d-flex align-items-center gap-3 mt-4">
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={handleSubmit}
                                    disabled={
                                        selectedSlots.length === 0 ||
                                        !activity.trim() ||
                                        submitting
                                    }
                                >
                                    {submitting ? (
                                        <Spinner animation="border" size="sm" />
                                    ) : (
                                        "Submit Booking Request"
                                    )}
                                </Button>
                                <Button
                                    variant="link"
                                    className="text-muted"
                                    onClick={() => navigate("/")}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* RIGHT — summary */}
                <Col lg={4}>
                    <Card className="shadow-sm">
                        <Card.Body>
                            <Card.Title className="mb-3">Booking Summary</Card.Title>

                            <div className="mb-3">
                                <div className="text-muted small">Facility</div>
                                <div className="fw-bold">{facilityData?.facilityName ?? "—"}</div>
                            </div>

                            <div className="mb-3">
                                <div className="text-muted small">Date</div>
                                <div className="fw-bold">{selectedDate}</div>
                            </div>

                            {selectedSlots.length > 0 && (
                                <div className="mb-3">
                                    <div className="text-muted small">Time</div>
                                    <div className="fw-bold">
                                        {startTime} – {endTime}
                                    </div>
                                    {selectedSlots.length > 1 && !isConsecutive(selectedSlots) && (
                                        <div className="text-danger small mt-1">
                                            Slots must be consecutive
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedSlots.length > 0 && facilityData && (
                                <div className="mb-3">
                                    {maxOccupied < facilityData.maxPeople ? (
                                        <Alert variant="success" className="py-2 mb-0">
                                            <strong>Available</strong>
                                            <div className="small">
                                                {facilityData.maxPeople - maxOccupied}/{facilityData.maxPeople} spots left · Pending staff approval
                                            </div>
                                        </Alert>
                                    ) : (
                                        <Alert variant="danger" className="py-2 mb-0">
                                            <strong>Full</strong>
                                            <div className="small">No spots available</div>
                                        </Alert>
                                    )}
                                </div>
                            )}

                            {selectedPartnerId != null && (() => {
                                const p = partners.find((x) => x.member_id === selectedPartnerId);
                                return p ? (
                                    <div className="mb-3">
                                        <div className="text-muted small">Partner</div>
                                        <div className="fw-bold">
                                            {[p.first_name, p.last_name].filter(Boolean).join(" ")}
                                        </div>
                                        {p.sport && p.sport !== "Not specified" && (
                                            <div className="small text-muted">
                                                {p.sport}
                                                {p.skill_level && p.skill_level !== "Not specified"
                                                    ? ` · ${p.skill_level}`
                                                    : ""}
                                            </div>
                                        )}
                                    </div>
                                ) : null;
                            })()}

                            {facilityData && (
                                <>
                                    <hr />

                                    <div className="mb-2">
                                        <div className="text-muted small">Max People</div>
                                        <div>{facilityData.maxPeople} people</div>
                                    </div>

                                    {facilityData.maxDurationMinutes && (
                                        <div className="mb-2">
                                            <div className="text-muted small">Max Duration Per Person</div>
                                            <div>{fmtDuration(facilityData.maxDurationMinutes)}</div>
                                        </div>
                                    )}

                                    {facilityData.schedules.length > 0 && (
                                        <div className="mb-2">
                                            <div className="text-muted small mb-1">Opening Hours</div>
                                            {facilityData.schedules.map((s) => (
                                                <div key={s.dayOfWeek} className="d-flex justify-content-between small">
                                                    <span className="fw-medium">{DAY_LABEL[s.dayOfWeek] ?? s.dayOfWeek}</span>
                                                    <span>{s.startTime} – {s.endTime}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {facilityData.usageGuideline && (
                                        <div className="mb-2 mt-2">
                                            <div className="text-muted small mb-1">Usage Guidelines</div>
                                            <ul className="small ps-3 mb-0">
                                                {facilityData.usageGuideline
                                                    .split(/\n|•|;/)
                                                    .map((g) => g.trim())
                                                    .filter(Boolean)
                                                    .map((g) => (
                                                        <li key={g}>{g}</li>
                                                    ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
