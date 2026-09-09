import axios from "axios";
import { api } from "./http";
import type { FacilityCardsResponse, FacilityCardItem } from "./types";

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

interface ImgbbResponse {
  data: { url: string; display_url: string };
  success: boolean;
  status: number;
}

export type FacilityPayload = {
  name: string;
  description: string;
  usageGuideline: string;
  imageUrl?: string | null;
  maxPeople: number;
  maxDurationMinutes?: number | null;
  schedules: Array<{
    dayOfWeek: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
    startTime: string;
    endTime: string;
  }>;
};

export type CreateFacilityResponse = {
  status: "ok";
  message: string;
  data: FacilityCardItem;
};

export type UpdateFacilityResponse = {
  status: "ok";
  message: string;
  data: FacilityCardItem;
};

export const facilityService = {
  getFacilityCards: async () => {
    const { data } = await api.get<FacilityCardsResponse>("/facilities/cards");
    return data;
  },

  updateFacility: async (
    facilityId: number,
    payload: FacilityPayload
  ) => {
    const { data } = await api.put<UpdateFacilityResponse>(`/facilities/${facilityId}`, payload);

    return data;
  },

  deleteFacility: async (facilityId: number) => {
    const { data } = await api.delete(`/facilities/${facilityId}`);

    return data;
  },

  createFacility: async (payload: FacilityPayload) => {
    const { data } = await api.post<CreateFacilityResponse>("/facilities", payload);
    return data;
  },

  uploadImage: async (file: File): Promise<string> => {
    const key = import.meta.env.VITE_IMGBB_API_KEY as string;
    const base64 = await toBase64(file);

    const form = new FormData();
    form.append("image", base64);

    const { data } = await axios.post<ImgbbResponse>(
      `https://api.imgbb.com/1/upload?key=${key}`,
      form
    );

    return data.data.url;
  },
};