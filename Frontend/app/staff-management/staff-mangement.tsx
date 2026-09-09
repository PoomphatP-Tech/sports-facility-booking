import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Button, Badge, Table, Spinner } from "react-bootstrap";
import { staffManagementService, type StaffMember } from "~/services/staff-management.service";
import "./staff-mangament.css";

export default function StaffManagement() {
    const navigate = useNavigate();
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchStaffList = async () => {
        try {
            setErrorMessage("");
            const response = await staffManagementService.getAllStaff();
            setStaffList(response.data);
        } catch {
            setErrorMessage("Failed to load staff list.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { void fetchStaffList(); }, []);

    const handleDelete = async (staffId: number) => {
        if (!window.confirm("Are you sure you want to delete this staff member?")) return;
        try {
            await staffManagementService.deleteStaff(staffId);
            setStaffList((prev) => prev.filter((s) => s.staffId !== staffId));
        } catch {
            alert("Failed to delete staff.");
        }
    };

    const handleToggleStatus = async (staffId: number, currentStatus: StaffMember["status"]) => {
        const newStatus = currentStatus === "active" ? "suspended" : "active";
        try {
            await staffManagementService.updateStaffStatus(staffId, newStatus);
            setStaffList((prev) =>
                prev.map((s) => s.staffId === staffId ? { ...s, status: newStatus } : s)
            );
        } catch {
            alert("Failed to update staff status.");
        }
    };

    return (
        <main className="staff-page">
            <div className="staff-page-header">
                <div>
                    <h1>Staff Management</h1>
                    <p>Manage staff accounts and their facility assignments.</p>
                </div>
                <Button variant="primary" onClick={() => navigate("/admin/staff/create")}>
                    Create New Staff
                </Button>
            </div>

            {errorMessage ? (
                <Alert variant="danger" className="mb-3" style={{ maxWidth: "72rem", margin: "0 auto 1rem" }}>
                    {errorMessage}
                </Alert>
            ) : null}

            <div className="staff-table-wrapper">
                {isLoading ? (
                    <div className="staff-empty-row">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading...
                    </div>
                ) : (
                    <Table className="staff-table" hover responsive>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Username</th>
                                <th>Staff Name</th>
                                <th>Facility</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="staff-empty-row">
                                        No staff members found.
                                    </td>
                                </tr>
                            ) : (
                                staffList.map((staff, index) => (
                                    <tr key={staff.staffId}>
                                        <td className="staff-cell-index">{index + 1}</td>
                                        <td className="staff-cell-username">{staff.username}</td>
                                        <td>{staff.name}</td>
                                        <td>
                                            {staff.facilities.length > 0
                                                ? staff.facilities.map((f) => f.facility).join(", ")
                                                : <span className="text-muted">—</span>
                                            }
                                        </td>
                                        <td>
                                            <Badge
                                                bg={staff.status === "active" ? "success" : "secondary"}
                                                className="staff-status-badge"
                                            >
                                                {staff.status === "active" ? "Active" : "Suspended"}
                                            </Badge>
                                        </td>
                                        <td>
                                            <div className="staff-action-buttons">
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => navigate(`/admin/staff/edit/${staff.staffId}`, { state: staff })}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    variant={staff.status === "active" ? "outline-warning" : "outline-success"}
                                                    size="sm"
                                                    onClick={() => handleToggleStatus(staff.staffId, staff.status)}
                                                >
                                                    {staff.status === "active" ? "Suspend" : "Activate"}
                                                </Button>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(staff.staffId)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                )}
            </div>
        </main>
    );
}
