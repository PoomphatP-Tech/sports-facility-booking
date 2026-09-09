import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  partnerMatchingService,
  type PartnerItem,
} from "../services/partner-matching.service";
import "./partner-matching.css";

export default function FindPartners() {
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState("All");
  const [selectedSkill, setSelectedSkill] = useState("All");
  const [sendingMemberId, setSendingMemberId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPartners = async () => {
    try {
      setLoading(true);
      const response = await partnerMatchingService.getPartners();
      console.log("[DEBUG] partners response:", JSON.stringify(response.data?.[0]));
      setPartners(response.data);
    } catch (error) {
      console.error(error);
      alert("Failed to load partners. Please make sure you are logged in.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPartners();
  }, []);

  const getPartnerName = (partner: PartnerItem) => {
    const fullName = `${partner.first_name ?? ""} ${
      partner.last_name ?? ""
    }`.trim();

    return fullName || partner.email || `Member #${partner.member_id}`;
  };

  const formatSkillLevel = (skill?: string | null) => {
    if (!skill) return "Not specified";
    return skill.charAt(0).toUpperCase() + skill.slice(1);
  };

  const getSport = (partner: PartnerItem) => {
    return partner.sport || "Not specified";
  };

  const getAvailability = (partner: PartnerItem) => {
    return partner.availability || "Not specified";
  };

  const getPreferredTime = (partner: PartnerItem) => {
    return partner.preferred_time || "Not specified";
  };

  const getBio = (partner: PartnerItem) => {
    return (
      partner.bio ||
      `Looking for partners for ${getSport(partner).toLowerCase()}.`
    );
  };

  const sports = useMemo(
    () => [
      "All",
      ...new Set(
        partners
          .map((partner) => partner.sport)
          .filter((sport): sport is string => Boolean(sport))
      ),
    ],
    [partners]
  );

  const skillLevels = useMemo(
    () => [
      "All",
      ...new Set(partners.map((partner) => formatSkillLevel(partner.skill_level))),
    ],
    [partners]
  );

  const filteredPartners = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return partners.filter((partner) => {
      const name = getPartnerName(partner).toLowerCase();
      const sport = getSport(partner).toLowerCase();
      const skill = formatSkillLevel(partner.skill_level);
      const bio = getBio(partner).toLowerCase();

      const matchesSport =
        selectedSport === "All" || getSport(partner) === selectedSport;

      const matchesSkill = selectedSkill === "All" || skill === selectedSkill;

      const matchesSearch =
        !query ||
        name.includes(query) ||
        sport.includes(query) ||
        skill.toLowerCase().includes(query) ||
        bio.includes(query);

      return matchesSport && matchesSkill && matchesSearch;
    });
  }, [partners, searchQuery, selectedSport, selectedSkill]);

  const handleSendMatchRequest = async (partner: PartnerItem) => {
    try {
      setSendingMemberId(partner.member_id);

      await partnerMatchingService.createMatchRequest(partner.member_id);

      alert(`Match request sent to ${getPartnerName(partner)}`);
    } catch (error) {
      console.error(error);
      alert("Failed to send match request. Please make sure you are logged in.");
    } finally {
      setSendingMemberId(null);
    }
  };

  return (
    <main className="partner-matching-page">
      <div className="partner-matching-page-header">
        <h1>Find Partners</h1>
        <p>Browse and connect with members looking for sports partners</p>
      </div>

      <div className="partner-matching-toolbar">
        <div className="partner-matching-filter-row">
          <input
            className="partner-matching-search"
            placeholder="Search partners"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="partner-matching-select"
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
          >
            {sports.map((sport) => (
              <option key={sport} value={sport}>
                {sport}
              </option>
            ))}
          </select>

          <select
            className="partner-matching-select"
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value)}
          >
            {skillLevels.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="partner-empty-state">Loading partners...</p>
      ) : (
        <>
          <div className="partner-matching-list">
            {filteredPartners.map((partner) => (
              <div key={partner.member_id} className="partner-card">
                <h3>{getPartnerName(partner)}</h3>
                <p>{getBio(partner)}</p>

                <div className="partner-card-tags">
                  <span className="partner-card-tag">{getSport(partner)}</span>
                  <span className="partner-card-tag">
                    {formatSkillLevel(partner.skill_level)}
                  </span>
                  <span className="partner-card-tag">
                    {getAvailability(partner)}
                  </span>
                  <span className="partner-card-tag">
                    {getPreferredTime(partner)}
                  </span>
                </div>

                <p>
                  <strong>Sport:</strong> {getSport(partner)}
                </p>
                <p>
                  <strong>Skill Level:</strong>{" "}
                  {formatSkillLevel(partner.skill_level)}
                </p>
                <p>
                  <strong>Availability:</strong> {getAvailability(partner)}
                </p>
                <p>
                  <strong>Preferred Time:</strong> {getPreferredTime(partner)}
                </p>

                <div className="partner-card-actions">
                  <button
                    className="partner-primary-btn"
                    onClick={() => void handleSendMatchRequest(partner)}
                    disabled={sendingMemberId === partner.member_id}
                  >
                    {sendingMemberId === partner.member_id
                      ? "Sending..."
                      : "Send Match Request"}
                  </button>

                  <Link
                    to={`/find-partners/${partner.member_id}`}
                    className="partner-secondary-btn"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {filteredPartners.length === 0 ? (
            <p className="partner-empty-state">
              No partners matched your search or filters.
            </p>
          ) : null}
        </>
      )}
    </main>
  );
}