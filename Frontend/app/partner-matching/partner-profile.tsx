import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  partnerMatchingService,
  type PartnerItem,
} from "~/services/partner-matching.service";
import "./partner-matching.css";

const formatName = (partner: PartnerItem) => {
  const fullName = `${partner.first_name ?? ""} ${partner.last_name ?? ""}`.trim();
  return fullName || partner.email || "Unknown member";
};

const formatValue = (value?: string | null) => {
  if (!value) return "Not specified";
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function PartnerProfile() {
  const params = useParams();
  const partnerId = Number(params.partnerId);

  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const partner = useMemo(
    () => partners.find((item) => item.member_id === partnerId),
    [partners, partnerId]
  );

  useEffect(() => {
    const loadPartner = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await partnerMatchingService.getPartners();
        setPartners(response.data ?? []);
      } catch (err) {
        console.error("Failed to load partner profile:", err);
        setError("Failed to load partner profile. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadPartner();
  }, []);

  const handleSendRequest = async () => {
    if (!partner) return;

    try {
      await partnerMatchingService.createMatchRequest(partner.member_id);
      alert(`Match request sent to ${formatName(partner)}.`);
    } catch (err) {
      console.error("Failed to send match request:", err);
      alert("Failed to send match request. Please try again.");
    }
  };

  if (loading) {
    return (
      <main className="partner-matching-page">
        <div className="partner-matching-page-header">
          <h1>Partner Profile</h1>
          <p>Loading partner profile...</p>
        </div>
      </main>
    );
  }

  if (error || !partner) {
    return (
      <main className="partner-matching-page">
        <div className="partner-matching-page-header">
          <h1>Partner Profile</h1>
          <p>{error || "Partner not found."}</p>
        </div>

        <section className="partner-request-section">
          <Link to="/find-partners" className="partner-secondary-btn">
            Back to Find Partners
          </Link>
        </section>
      </main>
    );
  }

  const name = formatName(partner);
  const sport = formatValue(partner.sport);
  const skillLevel = formatValue(partner.skill_level);
  const availability = formatValue(partner.availability);
  const preferredTime = formatValue(partner.preferred_time);
  const bio = partner.bio || "No bio provided.";

  return (
    <main className="partner-matching-page">
      <div className="partner-matching-page-header">
        <h1>{name}</h1>
        <p>View detailed partner information before sending a match request</p>
      </div>

      <section className="partner-request-section">
        <h2>Profile Details</h2>

        <div className="partner-request-card">
          <p>
            <strong>Name:</strong> {name}
          </p>
          <p>
            <strong>Sport:</strong> {sport}
          </p>
          <p>
            <strong>Skill Level:</strong> {skillLevel}
          </p>
          <p>
            <strong>Availability:</strong> {availability}
          </p>
          <p>
            <strong>Preferred Time:</strong> {preferredTime}
          </p>
          <p>
            <strong>Bio:</strong> {bio}
          </p>

          <div className="partner-card-tags">
            <span className="partner-card-tag">{sport}</span>
            <span className="partner-card-tag">{skillLevel}</span>
            <span className="partner-card-tag">{availability}</span>
            <span className="partner-card-tag">{preferredTime}</span>
          </div>

          <div className="partner-card-actions" style={{ marginTop: "1rem" }}>
            <button className="partner-primary-btn" onClick={handleSendRequest}>
              Send Match Request
            </button>

            <Link to="/find-partners" className="partner-secondary-btn">
              Back
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}