import { useEffect, useState, type FormEvent } from "react";
import {
  equipmentReportService,
  type EquipmentReportItem,
} from "../services/equipment-report.service";
import { facilityService } from "../services/facility.service";
import type { FacilityCardItem } from "../services/types";
import "./equipment-report.css";

export default function EquipmentReportList() {
  const [reports, setReports] = useState<EquipmentReportItem[]>([]);
  const [facilities, setFacilities] = useState<FacilityCardItem[]>([]);
  const [facilityId, setFacilityId] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await equipmentReportService.getMyReports();
      setReports(response.data);
    } catch (error) {
      console.error(error);
      alert("Failed to load equipment reports");
    } finally {
      setLoading(false);
    }
  };

  const loadFacilities = async () => {
    try {
      setLoadingFacilities(true);
      const response = await facilityService.getFacilityCards();
      setFacilities(response.data);
    } catch (error) {
      console.error(error);
      alert("Failed to load facilities");
    } finally {
      setLoadingFacilities(false);
    }
  };

  useEffect(() => {
    void loadReports();
    void loadFacilities();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!facilityId || !description.trim()) {
      alert("Please select a facility and enter a description");
      return;
    }

    try {
      setSubmitting(true);

      await equipmentReportService.createReport({
        facilityId: Number(facilityId),
        description: description.trim(),
      });

      setFacilityId("");
      setDescription("");
      await loadReports();

      alert("Report submitted successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="equipment-report-page">
      <div className="equipment-report-page-header">
        <h1>Equipment Reports</h1>
        <p>Submit an equipment issue report and track your report status</p>
      </div>

      <section className="equipment-report-section">
        <h2>Submit New Report</h2>

        <form className="equipment-report-form" onSubmit={handleSubmit}>
          <div className="equipment-report-field">
            <label htmlFor="equipment-facility-id">Facility</label>
            <select
              id="equipment-facility-id"
              className="equipment-report-input"
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              disabled={loadingFacilities}
            >
              <option value="">
                {loadingFacilities ? "Loading facilities..." : "Select a facility"}
              </option>

              {facilities.map((facility) => (
                <option key={facility.facilityId} value={facility.facilityId}>
                  {facility.name}
                </option>
              ))}
            </select>
          </div>

          <div className="equipment-report-field">
            <label htmlFor="equipment-description">Problem Description</label>
            <textarea
              id="equipment-description"
              className="equipment-report-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the equipment issue"
            />
          </div>

          <button
            className="equipment-report-submit"
            type="submit"
            disabled={submitting || loadingFacilities}
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
        </form>
      </section>

      <section className="equipment-report-section">
        <h2>My Reports</h2>

        {loading ? (
          <p className="equipment-report-empty">Loading reports...</p>
        ) : reports.length === 0 ? (
          <p className="equipment-report-empty">No equipment reports yet.</p>
        ) : (
          <div className="equipment-report-list">
            {reports.map((report) => (
              <div key={report.report_id} className="equipment-report-card">
                <p>
                  <strong>Facility:</strong>{" "}
                  {report.facility_name || `Facility #${report.facility_id}`}
                </p>
                <p>
                  <strong>Description:</strong> {report.description}
                </p>
                <p>
                  <strong>Status:</strong> {report.status}
                </p>
                <p>
                  <strong>Created:</strong>{" "}
                  {new Date(report.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}