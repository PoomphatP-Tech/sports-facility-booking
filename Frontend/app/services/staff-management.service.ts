import { api } from "./http";

export type StaffFacility = {
  facilityId: number;
  facility: string;
};

export type StaffMember = {
  staffId: number;
  userId: number;
  username: string;
  name: string;
  status: "active" | "suspended";
  facilities: StaffFacility[];
};

export type StaffListResponse = {
  status: "ok";
  data: StaffMember[];
};

export type StaffResponse = {
  status: "ok";
  message: string;
  data: { staffId: number; userId?: number };
};

export type CreateStaffPayload = {
  username: string;
  name: string;
  password: string;
  facilityIds: number[];
};

// Use different Payload with create because password is not required
export type UpdateStaffPayload = {
  username: string;
  name: string;
  password?: string; // No required for update
  facilityIds: number[];
};

type RawStaffMember = {
  staff_id: number;
  user_id: number;
  username: string;
  name: string;
  status: "active" | "suspended";
  facilities: StaffFacility[];
};

const mapStaff = (raw: RawStaffMember): StaffMember => ({
  staffId: raw.staff_id,
  userId: raw.user_id,
  username: raw.username,
  name: raw.name,
  status: raw.status,
  facilities: raw.facilities,
});

export const staffManagementService = {
  getAllStaff: async () => {
    const { data } = await api.get<{ status: "ok"; data: RawStaffMember[] }>("/staff-management");
    return { ...data, data: data.data.map(mapStaff) } as StaffListResponse;
  },

  createStaff: async (payload: CreateStaffPayload) => {
    const { data } = await api.post<StaffResponse>("/staff-management", payload);
    return data;
  },

  updateStaff: async (staffId: number, payload: UpdateStaffPayload) => {
    const { data } = await api.put<StaffResponse>(`/staff-management/${staffId}`, payload);
    return data;
  },

  deleteStaff: async (staffId: number) => {
    const { data } = await api.delete<StaffResponse>(`/staff-management/${staffId}`);
    return data;
  },

  updateStaffStatus: async (staffId: number, status: "active" | "suspended") => {
    const { data } = await api.patch<{ status: "ok"; message: string }>(`/staff-management/${staffId}/status`,
      { status }
    );
    return data;
  },
};
