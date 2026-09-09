import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Modal } from "react-bootstrap";
import Card from "react-bootstrap/Card";
import type { Opening } from "./facility-list";
import maximumIcon from "~/image/maimum.png";
import "./facility.css";

type FacilityCardProps = {
    facilityId: number;
    name: string;
    description: string;
    openings: Opening[];
    maxPeople: number;
    maxDurationMinutes: number | null;
    usageGuidelines: string[];
    imageUrl: string;
};

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const getTodayOpening = (openings: Opening[]): Opening | null => {
    const today = DAY_ABBR[new Date().getDay()];
    return openings.find((o) => o.day === today) ?? null;
};

const fmtTime = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength).trimEnd()}...`;
};

export default function FacilityCard({
    facilityId,
    name,
    description,
    openings,
    maxPeople,
    maxDurationMinutes,
    usageGuidelines,
    imageUrl,
}: FacilityCardProps) {
    const navigate = useNavigate();
    const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [activeDetailType, setActiveDetailType] = useState<"description" | "guidelines">("description");

    const todayOpening = getTodayOpening(openings);
    const descriptionPreview = truncateText(description, 95);
    const guidelinePreviewText = truncateText(usageGuidelines.join(" • "), 90);
    const hasDescriptionOverflow = description.length > 95;
    const hasGuidelineOverflow = usageGuidelines.join(" • ").length > 90;

    const handleOpenDetailModal = (detailType: "description" | "guidelines") => {
        setActiveDetailType(detailType);
        setIsDetailModalOpen(true);
    };

    return (
        <>
            <Card className="card-container">
                <Card.Img className="facility-card-image" src={imageUrl} />
                <Card.Body className="facility-card-body">
                    <Card.Title className="facility-card-title">{name}</Card.Title>
                    <Card.Text className="facility-card-description">
                        {descriptionPreview}
                        {hasDescriptionOverflow ? (
                            <button
                                type="button"
                                className="facility-inline-more-btn"
                                onClick={() => handleOpenDetailModal("description")}
                            >
                                View more
                            </button>
                        ) : null}
                    </Card.Text>

                    <div className="facility-card-meta">
                        <div className="facility-meta-row">
                            <span className="facility-meta-dot" />
                            <span>Availability</span>
                        </div>
                        <div className="facility-meta-value">
                            {todayOpening
                                ? `${todayOpening.day}  ${fmtTime(todayOpening.startTime)} – ${fmtTime(todayOpening.endTime)}`
                                : <span style={{ color: "#dc3545", fontWeight: 600 }}>Closed today</span>
                            }
                        </div>
                        <button
                            type="button"
                            className="facility-opening-more-btn"
                            onClick={() => setIsOpeningModalOpen(true)}
                        >
                            View other days
                        </button>
                    </div>

                    <div className="facility-card-meta">
                        <div className="facility-meta-row">
                            <span className="facility-meta-icon">#</span>
                            <span>Max people</span>
                        </div>
                        <div className="facility-meta-value">{maxPeople} people</div>
                    </div>

                    {maxDurationMinutes && (
                        <div className="facility-card-meta">
                            <div className="facility-meta-row">
                                <img src={maximumIcon} alt="max duration" style={{ width: 20 }} />
                                <span>Max Duration</span>
                            </div>
                            <div className="facility-meta-value">
                                {maxDurationMinutes >= 60 && maxDurationMinutes % 60 === 0
                                    ? `${maxDurationMinutes / 60} hr${maxDurationMinutes / 60 > 1 ? "s" : ""}`
                                    : `${maxDurationMinutes} min`}
                            </div>
                        </div>
                    )}

                    <div className="facility-card-meta">
                        <div className="facility-meta-row">
                            <span className="facility-meta-icon">i</span>
                            <span>Usage Guidelines</span>
                        </div>
                        <div className="facility-meta-value">
                            {guidelinePreviewText}
                            {hasGuidelineOverflow ? (
                                <button
                                    type="button"
                                    className="facility-inline-more-btn"
                                    onClick={() => handleOpenDetailModal("guidelines")}
                                >
                                    View more
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <div className="facility-card-actions">
                        <Button variant="primary" onClick={() => navigate(`/booking/new/${facilityId}`)}>
                            Book Now
                        </Button>
                    </div>
                </Card.Body>
            </Card>

            <Modal show={isOpeningModalOpen} onHide={() => setIsOpeningModalOpen(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{name} Opening Days</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <ul className="facility-guideline-list">
                        {openings.map((o, i) => (
                            <li key={`${o.day}-${i}`}>
                                {`${o.day}  ${fmtTime(o.startTime)} – ${fmtTime(o.endTime)}`}
                            </li>
                        ))}
                    </ul>
                </Modal.Body>
            </Modal>

            <Modal show={isDetailModalOpen} onHide={() => setIsDetailModalOpen(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {activeDetailType === "description" ? `${name} Description` : `${name} Usage Guidelines`}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {activeDetailType === "description" ? (
                        <p className="mb-0">{description}</p>
                    ) : (
                        <ul className="facility-guideline-list">
                            {usageGuidelines.map((g) => (
                                <li key={g}>{g}</li>
                            ))}
                        </ul>
                    )}
                </Modal.Body>
            </Modal>
        </>
    );
}
