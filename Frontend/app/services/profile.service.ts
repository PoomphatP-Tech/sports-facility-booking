import { api } from "./http";
import { authService } from "./auth.service";
import type { User } from "./types";

interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
}

interface ProfileResponse {
  user: User;
}

export const profileService = {
  getProfile: async (): Promise<ProfileResponse> => {
    const { data } = await api.get<ProfileResponse>("/profile");
    return data;
  },

  updateProfile: async (body: UpdateProfileRequest): Promise<ProfileResponse> => {
    const { data } = await api.put<ProfileResponse>("/profile", body);
    return data;
  },

  updatePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await authService.changePassword(currentPassword, newPassword);
  },
};
