import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { Alert, Button, Form, Spinner } from "react-bootstrap";
import { staffManagementService } from "~/services/staff-management.service";
import { facilityService } from "~/services/facility.service";
import "./staff-mangament.css";

type FacilityOption = { facilityId: number; name: string };

type StaffFormState = {
    username: string;
    name: string;
    password: string;
};

type StaffEditState = {
    staffId: number;
    username: string;
    name: string;
    facilities: { facilityId: number; facility: string }[];
    status: string;
};

const buildInitialState = (editData: StaffEditState | null): StaffFormState => {
    if (editData) {
        return { username: editData.username, name: editData.name, password: "" };
    }
    return { username: "", name: "", password: "" };
};

const buildInitialFacilityIds = (editData: StaffEditState | null): number[] => {
    if (editData && editData.facilities.length > 0) {
        return editData.facilities.map((f) => f.facilityId);
    }
    return [0];
};

export default function CreateStaff() {
    const navigate = useNavigate();
    const { staffId } = useParams<{ staffId: string }>();
    const location = useLocation();
    const isEdit = Boolean(staffId);
    const editData = (location.state as StaffEditState | null) ?? null;

    const [form, setForm] = useState<StaffFormState>(() => buildInitialState(editData));
    const [selectedFacilityIds, setSelectedFacilityIds] = useState<number[]>(
        () => buildInitialFacilityIds(editData)
    );
    const [confirmPassword, setConfirmPassword] = useState("");
    const [facilities, setFacilities] = useState<FacilityOption[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const passwordMismatch = confirmPassword.length > 0 && form.password !== confirmPassword;
    const hasUnselected = selectedFacilityIds.includes(0);

    useEffect(() => {
        const fetchFacilities = async () => {
            try {
                const response = await facilityService.getFacilityCards();
                if (response.status === "ok") {
                    setFacilities(response.data.map((f) => ({ facilityId: f.facilityId, name: f.name })));
                }
            } catch {
                // non-critical — form still usable
            }
        };
        void fetchFacilities();
    }, []);

    const setField = <K extends keyof StaffFormState>(key: K, value: StaffFormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleAddFacility = () => {
        setSelectedFacilityIds((prev) => [...prev, 0]);
    };

    const handleChangeFacility = (index: number, value: number) => {
        setSelectedFacilityIds((prev) => prev.map((id, i) => (i === index ? value : id)));
    };

    const handleRemoveFacility = (index: number) => {
        setSelectedFacilityIds((prev) => prev.filter((_, i) => i !== index));
    };

    const availableToAdd = facilities.filter((f) => !selectedFacilityIds.includes(f.facilityId));

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (form.password !== confirmPassword) return;

        const facilityIds = selectedFacilityIds.filter((id) => id !== 0);
        setIsSubmitting(true);
        setErrorMessage("");

        try {
            if (isEdit && staffId) {
                await staffManagementService.updateStaff(Number(staffId), {
                    username: form.username,
                    name: form.name,
                    password: form.password || undefined,
                    facilityIds,
                });
            } else {
                await staffManagementService.createStaff({
                    username: form.username,
                    name: form.name,
                    password: form.password,
                    facilityIds,
                });
            }
            navigate("/admin/staff");
        } catch {
            setErrorMessage(isEdit ? "Failed to update staff." : "Failed to create staff.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="staff-page">
            <div className="create-staff-header">
                <h1>{isEdit ? "Edit Staff" : "Create New Staff"}</h1>
                <Button variant="outline-secondary" onClick={() => navigate("/admin/staff")}>
                    Back
                </Button>
            </div>

            {errorMessage ? (
                <Alert variant="danger" style={{ maxWidth: "48rem", margin: "0 auto 1rem" }}>
                    {errorMessage}
                </Alert>
            ) : null}

            <form onSubmit={handleSubmit} className="create-staff-form">
                <section className="create-staff-section">
                    <h2>Account Information</h2>

                    <div className="create-staff-field">
                        <label htmlFor="cs-username">Username</label>
                        <Form.Control
                            id="cs-username"
                            type="text"
                            placeholder="e.g. john.doe"
                            value={form.username}
                            onChange={(e) => setField("username", e.target.value)}
                            required
                        />
                    </div>

                    <div className="create-staff-field">
                        <label htmlFor="cs-name">Staff Name</label>
                        <Form.Control
                            id="cs-name"
                            type="text"
                            placeholder="e.g. John Doe"
                            value={form.name}
                            onChange={(e) => setField("name", e.target.value)}
                            required
                        />
                    </div>

                    <div className="create-staff-field">
                        <label htmlFor="cs-password">
                            {isEdit ? "New Password (leave blank to keep current)" : "Password"}
                        </label>
                        <Form.Control
                            id="cs-password"
                            type="password"
                            placeholder={isEdit ? "Leave blank to keep current password" : "Enter password"}
                            value={form.password}
                            onChange={(e) => setField("password", e.target.value)}
                            required={!isEdit}
                        />
                    </div>

                    <div className="create-staff-field">
                        <label htmlFor="cs-confirm-password">Confirm Password</label>
                        <Form.Control
                            id="cs-confirm-password"
                            type="password"
                            placeholder="Re-enter password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            isInvalid={passwordMismatch}
                            required={!isEdit || form.password.length > 0}
                        />
                        <Form.Control.Feedback type="invalid">
                            Passwords do not match.
                        </Form.Control.Feedback>
                    </div>
                </section>

                <section className="create-staff-section">
                    <div className="create-staff-section-header">
                        <h2>Facility Assignment</h2>
                        <Button
                            type="button"
                            variant="outline-primary"
                            size="sm"
                            onClick={handleAddFacility}
                            disabled={availableToAdd.length === 0 || hasUnselected}
                        >
                            + Add Facility
                        </Button>
                    </div>

                    {selectedFacilityIds.map((selectedId, index) => (
                        <div key={index} className="create-staff-facility-row">
                            <Form.Select
                                value={selectedId}
                                onChange={(e) => handleChangeFacility(index, Number(e.target.value))}
                            >
                                <option value={0} disabled>— Please select —</option>
                                {facilities.map((f) => (
                                    <option
                                        key={f.facilityId}
                                        value={f.facilityId}
                                        disabled={selectedFacilityIds.includes(f.facilityId) && f.facilityId !== selectedId}
                                    >
                                        {f.name}
                                    </option>
                                ))}
                            </Form.Select>
                            {selectedFacilityIds.length > 1 ? (
                                <Button
                                    type="button"
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleRemoveFacility(index)}
                                >
                                    Remove
                                </Button>
                            ) : null}
                        </div>
                    ))}
                </section>

                <div className="create-staff-submit-row">
                    <Button variant="outline-secondary" type="button" onClick={() => navigate("/admin/staff")}>
                        Cancel
                    </Button>
                    <Button variant="primary" type="submit" disabled={isSubmitting}>
                        {isSubmitting
                            ? <Spinner animation="border" size="sm" />
                            : isEdit ? "Save Changes" : "Create Staff"
                        }
                    </Button>
                </div>
            </form>
        </main>
    );
}
