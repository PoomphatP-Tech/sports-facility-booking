import { useEffect, useState } from "react";
import { Alert, Button, Form, Modal, Spinner } from "react-bootstrap";
import { Link } from "react-router";
import { useAuth } from "~/auth/auth-middleware";
import { profileService } from "~/services/profile.service";
import {
  partnerMatchingService,
  type MyPartnerProfile,
} from "~/services/partner-matching.service";
import type { ApiError, User } from "~/services/types";
import profileIcon from "~/image/profile.png";
import "./profile.css";

type ProfileForm = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const fmt = (val: string | null | undefined) => val?.trim() || "—";

const fmtDate = (val: string | null | undefined) => {
  if (!val) return "—";
  // YYYY-MM-DD → readable date
  const d = new Date(val + "T00:00:00");
  return isNaN(d.getTime()) ? val : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

export default function Profile() {
  const { user: authUser } = useAuth();

  const [profile, setProfile] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState("");

  const [partnerProfile, setPartnerProfile] = useState<MyPartnerProfile | null>(null);
  const [loadingPartnerProfile, setLoadingPartnerProfile] = useState(false);
  const [partnerProfileLoadError, setPartnerProfileLoadError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    address: "",
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const load = async () => {
      setLoadingProfile(true);
      setProfileLoadError("");
      try {
        const { user } = await profileService.getProfile();
        setProfile(user);
        setForm({
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          dateOfBirth: user.dateOfBirth ?? "",
          address: user.address ?? "",
        });
      } catch {
        setProfileLoadError("Failed to load profile. Please refresh the page.");
      } finally {
        setLoadingProfile(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (profile?.role !== "member") return;
    const loadPartnerProfile = async () => {
      setLoadingPartnerProfile(true);
      setPartnerProfileLoadError("");
      try {
        const result = await partnerMatchingService.getMyProfile();
        setPartnerProfile(result.data);
      } catch {
        setPartnerProfileLoadError("Failed to load partner profile.");
      } finally {
        setLoadingPartnerProfile(false);
      }
    };
    void loadPartnerProfile();
  }, [profile?.role]);

  const passwordMismatch =
    passwordForm.confirmPassword.length > 0 &&
    passwordForm.newPassword !== passwordForm.confirmPassword;

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = () => {
    setSuccessMessage("");
    setErrorMessage("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setForm({
      firstName: profile?.firstName ?? "",
      lastName: profile?.lastName ?? "",
      dateOfBirth: profile?.dateOfBirth ?? "",
      address: profile?.address ?? "",
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage("");
    try {
      const { user: updated } = await profileService.updateProfile(form);
      setProfile(updated);
      setForm({
        firstName: updated.firstName ?? "",
        lastName: updated.lastName ?? "",
        dateOfBirth: updated.dateOfBirth ?? "",
        address: updated.address ?? "",
      });
      setIsEditing(false);
      setSuccessMessage("Profile updated successfully.");
    } catch (error) {
      setErrorMessage((error as ApiError).message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return;
    setIsChangingPassword(true);
    setPasswordError("");
    try {
      await profileService.updatePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
      );
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSuccessMessage("Password changed successfully.");
    } catch (error) {
      setPasswordError((error as ApiError).message || "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="profile-page" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-wrapper">
        <aside className="profile-sidebar">
          <div className="profile-avatar-wrap">
            {profile?.profileImgUrl ? (
              <img src={profile.profileImgUrl} alt="avatar" className="profile-avatar" />
            ) : (
              <img src={profileIcon} alt="avatar" className="profile-avatar" />
            )}
          </div>
          <p className="profile-sidebar-name">
            {profile?.firstName || authUser?.firstName || "—"}{" "}
            {profile?.lastName || authUser?.lastName || ""}
          </p>
          <p className="profile-sidebar-email">
            {profile?.email || authUser?.email}
          </p>
          <span className={`profile-role-badge profile-role-badge--${profile?.role || authUser?.role}`}>
            {profile?.role || authUser?.role}
          </span>

          <hr className="profile-sidebar-divider" />

          <Button
            variant="outline-warning"
            className="w-100"
            onClick={() => setShowPasswordModal(true)}
          >
            Change Password
          </Button>
        </aside>

        <main className="profile-main">
          {profileLoadError && (
            <Alert variant="danger" className="mb-3">{profileLoadError}</Alert>
          )}
          {successMessage && (
            <Alert variant="success" dismissible onClose={() => setSuccessMessage("")} className="mb-3">
              {successMessage}
            </Alert>
          )}
          {errorMessage && (
            <Alert variant="danger" dismissible onClose={() => setErrorMessage("")} className="mb-3">
              {errorMessage}
            </Alert>
          )}

          {/* Personal Information — editable */}
          <div className="profile-card">
            <div className="profile-card-header">
              <h2 className="profile-card-title">Personal Information</h2>
              {!isEditing ? (
                <Button variant="outline-primary" size="sm" onClick={handleEdit}>
                  Edit
                </Button>
              ) : (
                <div className="d-flex gap-2">
                  <Button variant="outline-secondary" size="sm" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    form="profile-form"
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving ? <Spinner animation="border" size="sm" /> : "Save"}
                  </Button>
                </div>
              )}
            </div>

            <Form id="profile-form" onSubmit={handleSave} className="profile-fields-grid">
              <div className="profile-field">
                <label className="profile-label">First Name</label>
                {isEditing ? (
                  <Form.Control
                    value={form.firstName}
                    onChange={handleProfileChange}
                    name="firstName"
                    required
                  />
                ) : (
                  <p className="profile-value">{fmt(form.firstName)}</p>
                )}
              </div>

              <div className="profile-field">
                <label className="profile-label">Last Name</label>
                {isEditing ? (
                  <Form.Control
                    value={form.lastName}
                    onChange={handleProfileChange}
                    name="lastName"
                  />
                ) : (
                  <p className="profile-value">{fmt(form.lastName)}</p>
                )}
              </div>

              <div className="profile-field">
                <label className="profile-label">Date of Birth</label>
                {isEditing ? (
                  <Form.Control
                    type="date"
                    value={form.dateOfBirth}
                    onChange={handleProfileChange}
                    name="dateOfBirth"
                    max={new Date().toISOString().split("T")[0]}
                  />
                ) : (
                  <p className="profile-value">{fmtDate(form.dateOfBirth)}</p>
                )}
              </div>

              <div className="profile-field">
                <label className="profile-label">Email</label>
                <p className="profile-value profile-value--muted">
                  {profile?.email || authUser?.email}
                </p>
              </div>

              <div className="profile-field profile-field--full">
                <label className="profile-label">Address</label>
                {isEditing ? (
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={form.address}
                    onChange={handleProfileChange}
                    name="address"
                  />
                ) : (
                  <p className="profile-value">{fmt(form.address)}</p>
                )}
              </div>
            </Form>
          </div>

          {/* Partner Matching Profile — members only */}
          {profile?.role === "member" && (
            <div className="profile-card" style={{ marginTop: "1.5rem" }}>
              <div className="profile-card-header">
                <h2 className="profile-card-title">Partner Matching Profile</h2>
                {partnerProfile && (
                  <Button as={Link} to="/my-partner-profile" variant="outline-primary" size="sm">
                    Edit Partner Profile
                  </Button>
                )}
              </div>

              {loadingPartnerProfile ? (
                <div className="d-flex justify-content-center py-3">
                  <Spinner animation="border" size="sm" />
                </div>
              ) : partnerProfileLoadError ? (
                <Alert variant="danger" className="mb-0">{partnerProfileLoadError}</Alert>
              ) : partnerProfile ? (
                <div className="profile-fields-grid">
                  <div className="profile-field">
                    <label className="profile-label">Preferred Sport</label>
                    <p className="profile-value">{fmt(partnerProfile.sport)}</p>
                  </div>

                  <div className="profile-field">
                    <label className="profile-label">Skill Level</label>
                    <p className="profile-value">
                      {partnerProfile.skill_level
                        ? partnerProfile.skill_level.charAt(0).toUpperCase() + partnerProfile.skill_level.slice(1)
                        : "—"}
                    </p>
                  </div>

                  <div className="profile-field">
                    <label className="profile-label">Availability</label>
                    <p className="profile-value">{fmt(partnerProfile.availability)}</p>
                  </div>

                  <div className="profile-field">
                    <label className="profile-label">Preferred Time</label>
                    <p className="profile-value">{fmt(partnerProfile.preferred_time)}</p>
                  </div>

                  {partnerProfile.bio && (
                    <div className="profile-field profile-field--full">
                      <label className="profile-label">Bio</label>
                      <p className="profile-value">{partnerProfile.bio}</p>
                    </div>
                  )}

                  <div className="profile-field profile-field--full">
                    <label className="profile-label">Status</label>
                    <p className="profile-value">
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          borderRadius: "999px",
                          padding: "0.25rem 0.75rem",
                          background: "#dcfce7",
                          color: "#166534",
                        }}
                      >
                        Active — visible to other members
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "0.5rem 0" }}>
                  <p className="profile-value profile-value--muted" style={{ marginBottom: "1rem" }}>
                    You have not created a partner matching profile yet.
                  </p>
                  <Button as={Link} to="/my-partner-profile" variant="primary" size="sm">
                    Create Partner Profile
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Change Password</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleChangePassword}>
          <Modal.Body className="d-flex flex-column gap-3">
            {passwordError && <Alert variant="danger">{passwordError}</Alert>}
            <Form.Group>
              <Form.Label>Current Password</Form.Label>
              <Form.Control
                type="password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                name="currentPassword"
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Confirm New Password</Form.Label>
              <Form.Control
                type="password"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                isInvalid={passwordMismatch}
                required
              />
              <Form.Control.Feedback type="invalid">
                Passwords do not match.
              </Form.Control.Feedback>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              type="button"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={passwordMismatch || isChangingPassword}
            >
              {isChangingPassword ? <Spinner animation="border" size="sm" /> : "Update Password"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
