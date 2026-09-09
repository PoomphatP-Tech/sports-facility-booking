import { api } from "./http";

export type EquipmentReportStatus = "noted" | "inProgress" | "resolved";

export interface EquipmentReportItem {
  report_id: number;
  description: string;
  status: EquipmentReportStatus;
  created_at: string;
  facility_id?: number | null;
  facility_name?: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  image_urls?: string[];
}

export interface EquipmentReportResponse {
  message: string;
  data: EquipmentReportItem[];
}

export interface CreateEquipmentReportPayload {
  facilityId: number;
  description: string;
}

export const equipmentReportService = {
  getMyReports: async () => {
    const { data } = await api.get<EquipmentReportResponse>("/equipment-reports/mine");
    return data;
  },

  getAllReports: async () => {
    const { data } = await api.get<EquipmentReportResponse>("/equipment-reports");
    return data;
  },

  createReport: async (payload: CreateEquipmentReportPayload) => {
    const { data } = await api.post("/equipment-reports", payload);
    return data;
  },

  updateReportStatus: async (reportId: number, status: EquipmentReportStatus) => {
    const { data } = await api.patch<{ message: string; data: EquipmentReportItem }>(
      `/equipment-reports/${reportId}/status`,
      { status }
    );
    return data;
  },
};