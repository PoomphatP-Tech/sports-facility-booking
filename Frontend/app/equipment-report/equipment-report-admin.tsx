import { useEffect, useState } from "react";
import { useAuth } from "~/auth/auth-middleware";
import {
  equipmentReportService,
  type EquipmentReportItem,
  type EquipmentReportStatus,
} from "../services/equipment-report.service";
import "./equipment-report.css";

export default function EquipmentReportAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<EquipmentReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState<{ [id: number]: string }>({});

  const isStaff = user?.role === "staff" || user?.role === "admin";

  const loadReports = async () => {
    setLoadingReports(true);
    setError("");
    try {
      const result = await equipmentReportService.getAllReports();
      setReports(result.data ?? []);
    } catch {
      setError("Failed to load equipment reports.");
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (!authLoading && isStaff) {
      void loadReports();
    } else if (!authLoading) {
      setLoadingReports(false);
    }
  }, [authLoading, isStaff]);

  const handleStatusChange = async (
    reportId: number,
    nextStatus: EquipmentReportStatus
  ) => {
    setUpdatingId(reportId);
    setUpdateError((prev) => ({ ...prev, [reportId]: "" }));
    try {
      const result = await equipmentReportService.updateReportStatus(reportId, nextStatus);
      setReports((prev) =>
        prev.map((r) =>
          r.report_id === reportId
            ? { ...r, status: result.data.status }
            : r
        )
      );
    } catch {
      setUpdateError((prev) => ({
        ...prev,
        [reportId]: "Failed to update status.",
      }));
    } finally {
      setUpdatingId(null);
    }
  };

  if (authLoading || loadingReports) {
    return <main className="equipment-report-page">Loading...</main>;
  }

  if (!isStaff) {
    return (
      <main className="equipment-report-page">
        <div className="equipment-report-page-header">
          <h1>Access Denied</h1>
          <p>Only staff can access this page.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="equipment-report-page">
      <div className="equipment-report-page-header">
        <h1>Equipment Report Management</h1>
        <p>Review submitted equipment issues and update repair status</p>
      </div>

      <section className="equipment-report-section">
        <h2>All Reports</h2>

        {error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : reports.length === 0 ? (
          <p className="equipment-report-empty">No equipment reports yet.</p>
        ) : (
          <div className="equipment-report-list">
            {reports.map((report) => {
              const reporterName =
                [report.first_name, report.last_name].filter(Boolean).join(" ").trim() ||
                report.email ||
                "Unknown";

              return (
                <div key={report.report_id} className="equipment-report-card">
                  <p>
                    <strong>Report ID:</strong> {report.report_id}
                  </p>
                  <p>
                    <strong>Facility:</strong>{" "}
                    {report.facility_name || `Facility #${report.facility_id}`}
                  </p>
                  <p>
                    <strong>Reported by:</strong> {reporterName}
                  </p>
                  <p>
                    <strong>Description:</strong> {report.description}
                  </p>
                  <p>
                    <strong>Created:</strong>{" "}
                    {new Date(report.created_at).toLocaleString()}
                  </p>

                  {report.image_urls && report.image_urls.length > 0 && (
                    <div style={{ marginBottom: "0.5rem" }}>
                      <strong>Images:</strong>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                        {report.image_urls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer">
                            <img
                              src={url}
                              alt="equipment"
                              style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 4 }}
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="equipment-report-status-row">
                    <strong>Status:</strong>
                    <select
                      className="equipment-report-select"
                      value={report.status}
                      disabled={updatingId === report.report_id}
                      onChange={(e) =>
                        void handleStatusChange(
                          report.report_id,
                          e.target.value as EquipmentReportStatus
                        )
                      }
                    >
                      <option value="noted">noted</option>
                      <option value="inProgress">inProgress</option>
                      <option value="resolved">resolved</option>
                    </select>
                    {updatingId === report.report_id && (
                      <span style={{ fontSize: "0.8rem", color: "#666", marginLeft: "0.5rem" }}>
                        Saving…
                      </span>
                    )}
                  </div>

                  {updateError[report.report_id] && (
                    <p style={{ color: "red", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                      {updateError[report.report_id]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
