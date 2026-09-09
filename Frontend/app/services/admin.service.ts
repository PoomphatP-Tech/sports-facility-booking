import { api } from "./http";

export interface AdminItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accountStatus: string;
  createdAt: string;
}

export interface CreateAdminRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface UpdateAdminRequest {
  firstName: string;
  lastName: string;
  email?: string;
}

export const adminService = {
  getAll: async (): Promise<AdminItem[]> => {
    const { data } = await api.get<{ data: AdminItem[] }>("/admins");
    return data.data;
  },

  create: async (body: CreateAdminRequest): Promise<AdminItem> => {
    const { data } = await api.post<{ data: AdminItem }>("/admins", body);
    return data.data;
  },

  update: async (adminId: string, body: UpdateAdminRequest): Promise<AdminItem> => {
    const { data } = await api.put<{ data: AdminItem }>(`/admins/${adminId}`, body);
    return data.data;
  },

  delete: async (adminId: string): Promise<void> => {
    await api.delete(`/admins/${adminId}`);
  },
};
