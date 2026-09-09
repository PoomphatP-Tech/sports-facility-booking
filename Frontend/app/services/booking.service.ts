import { api } from "./http";
import type {
    FacilitySlotsResponse,
    SubmitBookingRequestPayload,
    SubmitBookingRequestResponse,
    PendingRequestsResponse,
    ApproveResponse,
    RejectResponse,
    MyBookingsResponse,
    CancelBookingResponse,
    NotificationsResponse,
    UpcomingBookingsForStaffResponse,
    CompleteBookingResponse,
    AlternativesResponse,
    SuggestAlternativeResponse,
    RespondAlternativeResponse,
} from "./types";

export const bookingService = {
    async getAvailableSlots(facilityId: number, date: string): Promise<FacilitySlotsResponse> {
        const response = await api.get<FacilitySlotsResponse>(
            `/bookings/facilities/${facilityId}/slots?date=${date}`
        );
        return response.data;
    },

    // submit booking request
    async submitBookingRequest(
        payload: SubmitBookingRequestPayload
    ): Promise<SubmitBookingRequestResponse> {
        const response = await api.post<SubmitBookingRequestResponse>(
            `/bookings/requests`,
            payload
        );
        return response.data;
    },

    // Employees obtain the list pending approval
    async getPendingRequests(): Promise<PendingRequestsResponse> {
        const response = await api.get<PendingRequestsResponse>(
            `/bookings/staff/pending`
        );
        return response.data;
    },

    // Staff Approve
    async approveRequest(requestId: number): Promise<ApproveResponse> {
        const response = await api.post<ApproveResponse>(
            `/bookings/requests/${requestId}/approve`,
            {}
        );
        return response.data;
    },

    // Staff Reject
    async rejectRequest(
        requestId: number,
        reason: string
    ): Promise<RejectResponse> {
        const response = await api.post<RejectResponse>(
            `/bookings/requests/${requestId}/reject`,
            { reason }
        );
        return response.data;
    },

    async getMyBookings(): Promise<MyBookingsResponse> {
        const response = await api.get<MyBookingsResponse>(`/bookings/my`);
        return response.data;
    },

    async cancelBooking(bookingId: number): Promise<CancelBookingResponse> {
        const response = await api.post<CancelBookingResponse>(
            `/bookings/${bookingId}/cancel`,
            {}
        );
        return response.data;
    },

    async getNotifications(): Promise<NotificationsResponse> {
        const response = await api.get<NotificationsResponse>(
            `/bookings/notifications`
        );
        return response.data;
    },

    async markNotificationRead(notifId: number): Promise<any> {
        const response = await api.post(`/bookings/notifications/${notifId}/read`);
        return response.data;
    },

    async markAllNotificationsRead(): Promise<any> {
        const response = await api.post(`/bookings/notifications/read-all`);
        return response.data;
    },

    async getUpcomingBookingsForStaff(): Promise<UpcomingBookingsForStaffResponse> {
        const response = await api.get<UpcomingBookingsForStaffResponse>(
            `/bookings/staff/upcoming`
        );
        return response.data;
    },

    async completeBooking(bookingId: number): Promise<CompleteBookingResponse> {
        const response = await api.post<CompleteBookingResponse>(
            `/bookings/${bookingId}/complete`,
            {}
        );
        return response.data;
    },

    async cancelPendingRequest(requestId: number): Promise<CancelBookingResponse> {
        const response = await api.post<CancelBookingResponse>(
            `/bookings/requests/${requestId}/cancel`,
            {}
        );
        return response.data;
    },

    async searchAlternatives(requestId: number): Promise<AlternativesResponse> {
        const response = await api.get<AlternativesResponse>(
            `/bookings/requests/${requestId}/alternatives`
        );
        return response.data;
    },

    async suggestAlternative(
        requestId: number,
        altFacilityId: number
    ): Promise<SuggestAlternativeResponse> {
        const response = await api.post<SuggestAlternativeResponse>(
            `/bookings/requests/${requestId}/suggest-alternative`,
            { altFacilityId }
        );
        return response.data;
    },

    async respondToAlternative(
        requestId: number,
        accept: boolean
    ): Promise<RespondAlternativeResponse> {
        const response = await api.post<RespondAlternativeResponse>(
            `/bookings/requests/${requestId}/respond-alternative`,
            { accept }
        );
        return response.data;
    },
};