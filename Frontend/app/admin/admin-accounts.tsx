import { useEffect, useState } from "react";
import { Alert, Badge, Button, Form, Modal, Spinner, Table } from "react-bootstrap";
import { useAuth } from "~/auth/auth-middleware";
import { adminService, type AdminItem } from "~/services/admin.service";
import type { ApiError } from "~/services/types";

type FormState = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
};

const ROOT_ADMIN_EMAIL = "admin@sport.com";

const emptyForm = (): FormState => ({
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
});

export default function AdminAccounts() {
  const { user: currentUser } = useAuth();
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const isEdit = editTarget !== null;

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const data = await adminService.getAll();
      setAdmins(data);
    } catch (err) {
      setError((err as ApiError).message || "Failed to load admins.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchAdmins(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (admin: AdminItem) => {
    setEditTarget(admin);
    setForm({ email: admin.email, password: "", confirmPassword: "", firstName: admin.firstName, lastName: admin.lastName });
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!isEdit && form.password !== form.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit) {
        const updated = await adminService.update(editTarget.id, {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
        });
        setAdmins((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        setSuccessMessage("Admin updated.");
      } else {
        const created = await adminService.create(form);
        setAdmins((prev) => [...prev, created]);
        setSuccessMessage("Admin created.");
      }
      setShowModal(false);
    } catch (err) {
      setFormError((err as ApiError).message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (admin: AdminItem) => {
    if (!window.confirm(`Delete admin "${admin.email}"?`)) return;
    try {
      await adminService.delete(admin.id);
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
      setSuccessMessage("Admin deleted.");
    } catch (err) {
      setError((err as ApiError).message || "Failed to delete admin.");
    }
  };

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Admin Accounts</h2>
        <Button variant="primary" onClick={openCreate}>+ Add Admin</Button>
      </div>

      {successMessage && (
        <Alert variant="success" dismissible onClose={() => setSuccessMessage("")}>{successMessage}</Alert>
      )}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>{error}</Alert>
      )}

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Table bordered hover responsive>
          <thead className="table-light">
            <tr>
              <th>#</th>
              <th>Email</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted">No admin accounts found.</td></tr>
            ) : (
              admins.map((admin, i) => {
                const isRoot = admin.email === ROOT_ADMIN_EMAIL;
                const isSelf = admin.id === currentUser?.id;
                const isLocked = isRoot || isSelf;
                return (
                  <tr key={admin.id} style={isLocked ? { opacity: 0.5, backgroundColor: "#f8f9fa" } : undefined}>
                    <td>{i + 1}</td>
                    <td>
                      {admin.email}
                      {isRoot && <span className="ms-2 text-muted" style={{ fontSize: "0.75rem" }}>(root)</span>}
                    </td>
                    <td>{admin.firstName || "—"}</td>
                    <td>{admin.lastName || "—"}</td>
                    <td>
                      <Badge bg={admin.accountStatus === "active" ? "success" : "secondary"}>
                        {admin.accountStatus}
                      </Badge>
                    </td>
                    <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button size="sm" variant="warning" onClick={() => openEdit(admin)} disabled={isLocked}>Edit</Button>
                        <Button size="sm" variant="danger" onClick={() => handleDelete(admin)} disabled={isLocked}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isEdit ? "Edit Admin" : "Add Admin"}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="d-flex flex-column gap-3">
            {formError && <Alert variant="danger">{formError}</Alert>}

            <Form.Group>
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Form.Group>

            {!isEdit && (
              <>
                <Form.Group>
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                </Form.Group>
                <Form.Group>
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    required
                  />
                </Form.Group>
              </>
            )}

            <Form.Group>
              <Form.Label>First Name</Form.Label>
              <Form.Control
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" type="button" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? <Spinner animation="border" size="sm" /> : isEdit ? "Save" : "Create"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
