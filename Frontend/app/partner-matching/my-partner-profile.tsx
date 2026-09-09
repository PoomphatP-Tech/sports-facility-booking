import { useEffect, useState } from "react";
import {
  partnerMatchingService,
  type MyPartnerProfile,
  type SkillLevel,
} from "~/services/partner-matching.service";
import "./partner-matching.css";

type FormState = {
  bio: string;
  sport: string;
  skillLevel: SkillLevel;
  availability: string;
  preferredTime: string;
};

const EMPTY_FORM: FormState = {
  bio: "",
  sport: "",
  skillLevel: "beginner",
  availability: "",
  preferredTime: "",
};

const AVAILABILITY_OPTIONS = [
  "Weekdays",
  "Weekends",
  "Both weekdays and weekends",
  "Flexible",
];

const PREFERRED_TIME_OPTIONS = ["Morning", "Afternoon", "Evening", "Flexible"];

export default function MyPartnerProfile() {
  const [profile, setProfile] = useState<MyPartnerProfile | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const result = await partnerMatchingService.getMyProfile();
        if (result.data) {
          setProfile(result.data);
          setForm({
            bio: result.data.bio ?? "",
            sport: result.data.sport ?? "",
            skillLevel: (result.data.skill_level as SkillLevel) ?? "beginner",
            availability: result.data.availability ?? "",
            preferredTime: result.data.preferred_time ?? "",
          });
        }
      } catch {
        setLoadError("Failed to load your partner profile. Please refresh.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!form.sport.trim()) {
      setErrorMsg("Sport is required.");
      return;
    }
    if (!form.availability) {
      setErrorMsg("Availability is required.");
      return;
    }
    if (!form.preferredTime) {
      setErrorMsg("Preferred time is required.");
      return;
    }

    setSaving(true);
    try {
      const result = await partnerMatchingService.saveMyProfile({
        bio: form.bio,
        sport: form.sport,
        skillLevel: form.skillLevel,
        availability: form.availability,
        preferredTime: form.preferredTime,
      });
      setProfile(result.data);
      setSuccessMsg(
        profile
          ? "Profile updated! Other members can now see your updated profile in Find Partners."
          : "Profile created! Other members can now find you in Find Partners."
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to save profile. Please try again.";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="partner-matching-page">
        <div className="partner-matching-page-header">
          <h1>My Partner Profile</h1>
          <p>Loading your profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="partner-matching-page">
      <div className="partner-matching-page-header">
        <h1>My Partner Profile</h1>
        <p>
          {profile
            ? "Update your profile to appear in Find Partners."
            : "Create your profile to appear in Find Partners for other members."}
        </p>
      </div>

      <section className="partner-request-section">
        {loadError && (
          <p style={{ color: "#dc2626", marginBottom: "1rem" }}>{loadError}</p>
        )}

        {successMsg && (
          <div
            style={{
              background: "#dcfce7",
              color: "#166534",
              border: "1px solid #bbf7d0",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              fontWeight: 600,
            }}
          >
            {successMsg}
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              borderRadius: "0.5rem",
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1.25rem" }}>
          {/* Sport */}
          <div>
            <label className="partner-profile-label" htmlFor="sport">
              Sport <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              id="sport"
              name="sport"
              className="partner-matching-search"
              style={{ width: "100%", display: "block" }}
              placeholder="e.g. Badminton, Tennis, Swimming"
              value={form.sport}
              onChange={handleChange}
              maxLength={100}
              required
            />
          </div>

          {/* Skill Level */}
          <div>
            <label className="partner-profile-label" htmlFor="skillLevel">
              Skill Level <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              id="skillLevel"
              name="skillLevel"
              className="partner-matching-select"
              style={{ width: "100%", display: "block" }}
              value={form.skillLevel}
              onChange={handleChange}
              required
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Availability */}
          <div>
            <label className="partner-profile-label" htmlFor="availability">
              Availability <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              id="availability"
              name="availability"
              className="partner-matching-select"
              style={{ width: "100%", display: "block" }}
              value={form.availability}
              onChange={handleChange}
              required
            >
              <option value="">Select availability…</option>
              {AVAILABILITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Preferred Time */}
          <div>
            <label className="partner-profile-label" htmlFor="preferredTime">
              Preferred Time <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              id="preferredTime"
              name="preferredTime"
              className="partner-matching-select"
              style={{ width: "100%", display: "block" }}
              value={form.preferredTime}
              onChange={handleChange}
              required
            >
              <option value="">Select preferred time…</option>
              {PREFERRED_TIME_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Bio */}
          <div>
            <label className="partner-profile-label" htmlFor="bio">
              Bio <span style={{ color: "#6b7280", fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              id="bio"
              name="bio"
              className="partner-matching-search"
              style={{ width: "100%", display: "block", resize: "vertical", minHeight: "6rem" }}
              placeholder="Tell other members about yourself and what you're looking for in a partner..."
              value={form.bio}
              onChange={handleChange}
              maxLength={500}
            />
            <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>
              {form.bio.length}/500
            </div>
          </div>

          <div className="partner-card-actions">
            <button
              type="submit"
              className="partner-primary-btn"
              disabled={saving}
            >
              {saving ? "Saving…" : profile ? "Update Profile" : "Create Profile"}
            </button>

            {profile && (
              <a href="/find-partners" className="partner-secondary-btn">
                View Find Partners
              </a>
            )}
          </div>
        </form>
      </section>

    </main>
  );
}
