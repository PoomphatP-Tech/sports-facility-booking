import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Alert, Button, Spinner } from "react-bootstrap";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { facilityService } from "~/services/facility.service";
import type { FacilityCardItem } from "~/services/types";

// Fix Leaflet's broken default marker icons when bundled with Vite.
// The bundler hashes asset filenames so Leaflet's internal _getIconUrl path resolution fails.
// We override it here with stable CDN URLs (no API key required).
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// University of Southampton Jubilee Sports Centre — default map centre
const CENTRE: [number, number] = [50.9346, -1.3947];

export default function FacilitiesMap() {
    const [facilities, setFacilities] = useState<FacilityCardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    // Guard: only render the MapContainer after the component has mounted in the browser.
    // Leaflet requires DOM APIs that are unavailable during SSR.
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const response = await facilityService.getFacilityCards();
                if (response.status === "ok") {
                    setFacilities(response.data);
                } else {
                    setError(response.message ?? "Failed to load facilities.");
                }
            } catch {
                setError("Failed to load facilities. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, []);

    const mapped = facilities.filter(
        (f) => f.latitude != null && f.longitude != null
    );

    return (
        <div className="container py-4" style={{ maxWidth: "1200px" }}>
            <div className="d-flex align-items-center justify-content-between mb-1">
                <div>
                    <h2 className="mb-0">Facilities Map</h2>
                    <p className="text-muted mt-1 mb-0">
                        Interactive map of the sports centre facilities — click a marker to
                        see details and book.
                    </p>
                </div>
                <Button variant="outline-secondary" as={Link as any} to="/">
                    ← Back to Facilities
                </Button>
            </div>

            <hr className="mb-4" />

            {loading && (
                <div className="text-center py-5">
                    <Spinner animation="border" />
                    <p className="mt-3 text-muted">Loading facilities…</p>
                </div>
            )}

            {!loading && error && <Alert variant="danger">{error}</Alert>}

            {!loading && !error && mapped.length === 0 && (
                <Alert variant="info">
                    No facilities have map coordinates configured yet. Contact an
                    administrator to add location data.
                </Alert>
            )}

            {!loading && !error && mapped.length > 0 && (
                <>
                    <p className="text-muted small mb-2">
                        Showing {mapped.length} of {facilities.length} facilit
                        {facilities.length === 1 ? "y" : "ies"} on the map.
                    </p>

                    {mounted && (
                        <div
                            style={{
                                height: "580px",
                                borderRadius: "0.5rem",
                                overflow: "hidden",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                            }}
                        >
                            <MapContainer
                                center={CENTRE}
                                zoom={17}
                                style={{ height: "100%", width: "100%" }}
                                scrollWheelZoom={true}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />

                                {mapped.map((f) => (
                                    <Marker
                                        key={f.facilityId}
                                        position={[f.latitude!, f.longitude!]}
                                    >
                                        <Popup minWidth={200}>
                                            <strong style={{ fontSize: "1rem" }}>{f.name}</strong>

                                            {f.description && (
                                                <p
                                                    className="mb-1 mt-1"
                                                    style={{ fontSize: "0.82rem", color: "#555" }}
                                                >
                                                    {f.description}
                                                </p>
                                            )}

                                            <div
                                                style={{
                                                    fontSize: "0.8rem",
                                                    color: "#666",
                                                    marginBottom: "0.5rem",
                                                }}
                                            >
                                                <span>Capacity: {f.maxPeople} people</span>
                                                {f.maxDurationMinutes != null && (
                                                    <span> · Max {f.maxDurationMinutes} min</span>
                                                )}
                                            </div>

                                            <Link
                                                to={`/booking/new/${f.facilityId}`}
                                                style={{
                                                    display: "block",
                                                    textAlign: "center",
                                                    padding: "0.3rem 0.6rem",
                                                    background: "#0d6efd",
                                                    color: "#fff",
                                                    borderRadius: "0.375rem",
                                                    textDecoration: "none",
                                                    fontSize: "0.85rem",
                                                }}
                                            >
                                                Book Now
                                            </Link>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
