import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router";
import FacilityCard from "./facility-card";
import "./facility.css";
import "../admin/admin-page.css";
import { Alert, Button, Form } from "react-bootstrap";

import { facilityService } from "~/services/facility.service";
import type { FacilityCardItem } from "~/services/types";

export type Opening = { day: string; startTime: Date; endTime: Date };

export type FacilityItem = {
    facilityId: number;
    name: string;
    description: string;
    openings: Opening[];
    maxPeople: number;
    maxDurationMinutes: number | null;
    usageGuidelines: string[];
    imageUrl: string;
    openTime: Date;
    closeTime: Date;
};

const TIME_RANGES = [
    { id: "all", label: "Any time" },
    { id: "morning", label: "Morning (06:00-12:00)", start: "06:00", end: "12:00" },
    { id: "afternoon", label: "Afternoon (12:00-16:00)", start: "12:00", end: "16:00" },
    { id: "evening", label: "Evening (16:00-20:00)", start: "16:00", end: "20:00" },
    { id: "night", label: "Night (20:00-22:00)", start: "20:00", end: "22:00" },
];

const getMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();

const timeStrToMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
};

const timeStrToDate = (t: string): Date => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
};

const mapCard = (card: FacilityCardItem): FacilityItem => {
    const capitalize = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
    const usageGuidelines = card.usageGuideline
        ? card.usageGuideline.split(/\n|•|;/).map((g) => g.trim()).filter(Boolean)
        : ["No usage guideline available"];

    const allSchedules = card.availableTime
        ? [card.availableTime, ...card.otherAvailableTimes]
        : card.otherAvailableTimes;

    return {
        facilityId: card.facilityId,
        name: card.name,
        description: card.description || "No description available",
        openings: allSchedules.map((t) => ({
            day: capitalize(t.day),
            startTime: timeStrToDate(t.startTime),
            endTime: timeStrToDate(t.endTime),
        })),
        maxPeople: card.maxPeople,
        maxDurationMinutes: card.maxDurationMinutes ?? null,
        usageGuidelines,
        imageUrl: card.imageUrl ?? "",
        openTime: card.availableTime ? timeStrToDate(card.availableTime.startTime) : new Date(0),
        closeTime: card.availableTime ? timeStrToDate(card.availableTime.endTime) : new Date(0),
    };
};

export default function FacilityList() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const isAdmin = pathname.startsWith("/admin");
    const [facilities, setFacilities] = useState<FacilityItem[]>([]);
    const [showFetchAlert, setShowFetchAlert] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTimeRange, setSelectedTimeRange] = useState("all");
    const [minCapacity, setMinCapacity] = useState(1);
    const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(false);

    const fetchFacilities = async () => {
        try {
            setShowFetchAlert(false);
            const response = await facilityService.getFacilityCards();
            if (response.status !== "ok") throw new Error(response.message || "Failed to fetch facilities");
            setFacilities(response.data.map(mapCard));
        } catch {
            setShowFetchAlert(true);
            setFacilities([]);
        }
    };

    useEffect(() => { void fetchFacilities(); }, []);

    const filteredFacilities = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return facilities.filter((facility) => {
            const matchesCapacity = facility.maxPeople >= minCapacity;
            const matchesTimeWindow = selectedTimeRange === "all" || (() => {
                const range = TIME_RANGES.find((r) => r.id === selectedTimeRange);
                if (!range?.start || !range?.end) return true;
                return getMinutes(facility.openTime) <= timeStrToMinutes(range.start)
                    && getMinutes(facility.closeTime) >= timeStrToMinutes(range.end);
            })();
            const matchesSearch =
                !query ||
                facility.name.toLowerCase().includes(query) ||
                facility.description.toLowerCase().includes(query);
            return matchesSearch && matchesTimeWindow && matchesCapacity;
        });
    }, [facilities, minCapacity, searchQuery, selectedTimeRange]);

    const handleDelete = async (facilityId: number) => {
        const confirmed = window.confirm("Do you want to delete this facility?");
        if (!confirmed) return;
        try {
            await facilityService.deleteFacility(facilityId);
            setFacilities((prev) => prev.filter((f) => f.facilityId !== facilityId));
        } catch (error) {
            console.error(error);
            alert("Failed to delete facility");
        }
    };

    const handleResetFilters = () => {
        setSearchQuery("");
        setSelectedTimeRange("all");
        setMinCapacity(1);
    };

    return (
        <main className="facility-page">
            <div className="facility-page-header">
                <div>
                    <h1>Browse Facilities</h1>
                    <p>Find and reserve sports facilities easily</p>
                </div>
                <div className="d-flex gap-2">
                    {!isAdmin && (
                        <Button variant="outline-secondary" as={Link as any} to="/facilities/map">
                            View on Map
                        </Button>
                    )}
                    {isAdmin && (
                        <Button variant="primary" onClick={() => navigate("/admin/facility/create")}>
                            Create Facility
                        </Button>
                    )}
                </div>
            </div>

            <div className="facility-toolbar">
                {showFetchAlert ? (
                    <Alert variant="warning" dismissible onClose={() => setShowFetchAlert(false)} className="mb-0">
                        Unable to load latest facility data.
                    </Alert>
                ) : null}
                <div className="facility-filter-row">
                    <input
                        className="facility-search"
                        placeholder="Search facilities"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button variant="primary" onClick={() => setIsAdvancedFiltersOpen((open) => !open)}>
                        {isAdvancedFiltersOpen ? "Hide filters" : "More filters"}
                    </Button>
                </div>

                {isAdvancedFiltersOpen ? (
                    <div className="facility-advanced-filters">
                        <div className="facility-filter-field">
                            <label htmlFor="facility-time-range">Time range</label>
                            <Form.Select
                                id="facility-time-range"
                                value={selectedTimeRange}
                                onChange={(e) => setSelectedTimeRange(e.target.value)}
                            >
                                {TIME_RANGES.map((range) => (
                                    <option key={range.id} value={range.id}>{range.label}</option>
                                ))}
                            </Form.Select>
                        </div>

                        <div className="facility-filter-field">
                            <label htmlFor="facility-capacity">Min max-people</label>
                            <Form.Select
                                id="facility-capacity"
                                value={minCapacity}
                                onChange={(e) => setMinCapacity(Number(e.target.value))}
                            >
                                <option value={1}>Any capacity</option>
                                <option value={4}>4+ people</option>
                                <option value={8}>8+ people</option>
                                <option value={12}>12+ people</option>
                                <option value={16}>16+ people</option>
                            </Form.Select>
                        </div>

                        <Button variant="outline-primary" type="button" onClick={handleResetFilters}>
                            Reset filters
                        </Button>
                    </div>
                ) : null}
            </div>

            <div className="facility-list-container">
                {filteredFacilities.map((facility) => (
                    isAdmin ? (
                        <div key={facility.facilityId} className="admin-card-wrapper">
                            <div className="admin-card-actions">
                                <Button
                                    variant="warning"
                                    size="sm"
                                    onClick={() => navigate(`/admin/facility/edit/${facility.facilityId}`, { state: facility })}
                                >
                                    Edit
                                </Button>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => handleDelete(facility.facilityId)}
                                >
                                    Delete
                                </Button>
                            </div>
                            <FacilityCard
                                facilityId={facility.facilityId}
                                name={facility.name}
                                description={facility.description}
                                openings={facility.openings}
                                maxPeople={facility.maxPeople}
                                maxDurationMinutes={facility.maxDurationMinutes}
                                usageGuidelines={facility.usageGuidelines}
                                imageUrl={facility.imageUrl}
                            />
                        </div>
                    ) : (
                        <FacilityCard
                            key={facility.facilityId}
                            facilityId={facility.facilityId}
                            name={facility.name}
                            description={facility.description}
                            openings={facility.openings}
                            maxPeople={facility.maxPeople}
                            maxDurationMinutes={facility.maxDurationMinutes}
                            usageGuidelines={facility.usageGuidelines}
                            imageUrl={facility.imageUrl}
                        />
                    )
                ))}
            </div>

            {filteredFacilities.length === 0 ? (
                <p className="facility-empty-state">No facilities matched your filters.</p>
            ) : null}
        </main>
    );
}
