import { api } from "./http";

export type PartnerRequestStatus = "pending" | "accepted" | "rejected";
export type SkillLevel = "beginner" | "intermediate" | "advanced";

export interface PartnerItem {
  member_id: number;
  user_id?: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  sport?: string | null;
  skill_level?: string | null;
  availability?: string | null;
  preferred_time?: string | null;
  bio?: string | null;
}

export interface PartnersResponse {
  message: string;
  data: PartnerItem[];
}

export interface IncomingPartnerRequestItem {
  request_matching_id: number;
  status: PartnerRequestStatus;
  created_at: string;
  sender_user_id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  booking_request_id?: number | null;
  booking_request_status?: string | null;
  booking_date?: string | null;
  booking_start_time?: string | null;
  booking_end_time?: string | null;
  booking_intended_activity?: string | null;
  booking_facility_name?: string | null;
}

export interface IncomingPartnerRequestResponse {
  message: string;
  data: IncomingPartnerRequestItem[];
}

export interface MyPartnerProfile {
  partner_profile_id: number;
  bio: string | null;
  availability: string;
  preferred_time: string;
  sport: string | null;
  skill_level: SkillLevel | null;
  is_active: boolean;
  created_at: string;
}

export interface MyPartnerProfileResponse {
  message: string;
  data: MyPartnerProfile | null;
}

export interface SaveMyProfilePayload {
  bio?: string;
  sport: string;
  skillLevel: SkillLevel;
  availability: string;
  preferredTime: string;
}

export const partnerMatchingService = {
  getPartners: async () => {
    const { data } = await api.get<PartnersResponse>(
      "/partner-matching/partners"
    );
    return data;
  },

  createMatchRequest: async (receiverMemberId: number) => {
    const { data } = await api.post("/partner-matching/requests", {
      receiverMemberId,
    });
    return data;
  },

  getIncomingRequests: async () => {
    const { data } = await api.get<IncomingPartnerRequestResponse>(
      "/partner-matching/requests/incoming"
    );
    return data;
  },

  updateRequestStatus: async (
    requestId: number,
    status: "accepted" | "rejected"
  ) => {
    const { data } = await api.patch(
      `/partner-matching/requests/${requestId}/status`,
      { status }
    );
    return data;
  },

  getMyProfile: async () => {
    const { data } = await api.get<MyPartnerProfileResponse>(
      "/partner-matching/profile"
    );
    return data;
  },

  saveMyProfile: async (payload: SaveMyProfilePayload) => {
    const { data } = await api.put<MyPartnerProfileResponse>(
      "/partner-matching/profile",
      payload
    );
    return data;
  },
};