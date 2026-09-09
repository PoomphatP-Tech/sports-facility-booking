// ==================== Authentication ====================
export interface ApiError {
  message: string;
  nextStep?: RegistrationStep;
  state?: RegistrationStep;
}

export type RegistrationStep =
  | "credentials"
  | "verifyEmail"
  | "details"
  | "complete";

export type UserRole = "admin" | "member" | "staff";

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  address: string | null;
  role: UserRole;
  accountStatus?: string | null;
  // Member-specific (populated by GET /profile when role === 'member')
  memberId?: number | null;
  memberStatus?: string | null;
  membershipStart?: string | null;
  membershipExp?: string | null;
  profileImgUrl?: string | null;
  // Staff-specific (populated by GET /profile when role === 'staff' | 'admin')
  staffId?: number | null;
}

export interface RegisterCredentialsRequest {
  firebaseUid: string;
  email: string;
}

export interface RegisterCredentialsResponse {
  nextStep: RegistrationStep;
  message: string;
  user?: User;
}

export interface CompleteRegisterRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
}

export interface CompleteRegisterResponse {
  user: User;
}

export interface MeResponse {
  user: User;
}

export interface SessionStatusResponse {
  isLoggedIn: boolean;
  isPendingStep3: boolean;
  user: User | null;
}

export interface ForgotPasswordRequestRequest {
  email: string;
}

export interface ForgotPasswordRequestResponse {
  message: string;
}

// ==================== Facility ====================
export interface FacilityAvailableTime {
  day: string;
  startTime: string;
  endTime: string;
}

export interface FacilityCardItem {
  facilityId: number;
  name: string;
  description: string;
  usageGuideline: string | null;
  imageUrl: string | null;
  maxPeople: number;
  maxDurationMinutes: number | null;
  availableTime: FacilityAvailableTime | null;
  otherAvailableTimes: FacilityAvailableTime[];
  latitude?: number | null;
  longitude?: number | null;
}

export interface FacilityCardsResponse {
  status: "ok" | "error";
  data: FacilityCardItem[];
  message?: string;
  detail?: string;
}

// ==================== Booking ====================

export interface AvailableSlot {
  startTime: string;      // 'HH:MM'
  endTime: string;        // 'HH:MM'
  occupied: number;
  available: boolean;
}

export interface FacilitySchedule {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface FacilitySlots {
  facilityId: number;
  facilityName: string;
  maxPeople: number;
  maxDurationMinutes: number | null;
  usageGuideline: string | null;
  schedules: FacilitySchedule[];
  date: string;           // 'YYYY-MM-DD'
  slots: AvailableSlot[];
}

export interface FacilitySlotsResponse {
  status: 'ok' | 'error';
  data: FacilitySlots;
  message?: string;
}

export interface SubmitBookingRequestPayload {
  facilityId: number;
  slotDate: string;
  startTime: string;
  endTime: string;
  intendedActivity: string;
  customTime?: boolean;
  partnerMemberId?: number;
}

export interface SubmitBookingRequestResponse {
  status: 'ok' | 'error';
  data?: {
    bookingRequestId: number;
    bookingDetailId: number;
    status: string;
    createdAt: string;
  };
  message?: string;
  code?: string;
}

// ==================== Staff Pending Requests ====================

export interface PendingRequestMember {
  memberId: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface PendingRequestFacility {
  facilityId: number;
  name: string;
}

export interface PendingBookingRequest {
  bookingRequestId: number;
  bookingDetailId: number;
  requestStatus: string;
  createdAt: string;
  facility: PendingRequestFacility;
  bookingDate: string;
  startTime: string;
  endTime: string;
  intendedActivity: string | null;
  member: PendingRequestMember;
}

export interface PendingRequestsResponse {
  status: "ok" | "error";
  data: PendingBookingRequest[];
  message?: string;
}

// ==================== Approve / Reject ====================

export interface ApproveResponse {
  status: "ok" | "error";
  data?: {
    bookingRequestId: number;
    bookingId: number;
    bookingStatus: string;
    message: string;
  };
  message?: string;
  code?: string;
  conflicts?: string[];
}

export interface RejectResponse {
  status: "ok" | "error";
  data?: {
    bookingRequestId: number;
    message: string;
  };
  message?: string;
  code?: string;
}

// ==================== My Bookings ====================

export interface MyBookingItem {
  bookingId?: number;
  bookingRequestId?: number;
  bookingStatus?: string;
  requestStatus?: string;
  createdAt: string;
  facilityId: number;
  facilityName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  intendedActivity: string | null;
  altFacilityId?: string | null;
  altFacilityName?: string | null;
}

export interface MyBookingsData {
  upcoming: MyBookingItem[];
  history: MyBookingItem[];
  pendingRequests: MyBookingItem[];
  rejected: MyBookingItem[];
}

export interface MyBookingsResponse {
  status: "ok" | "error";
  data: MyBookingsData;
  message?: string;
}

export interface CancelBookingResponse {
  status: "ok" | "error";
  data?: { bookingId: number; message: string };
  message?: string;
  code?: string;
}

// ==================== Notifications ====================

export interface NotificationItem {
  notifId: number;
  message: string;
  isRead: boolean;
  type: string | null;
  sendingAt: string;
}

export interface NotificationsResponse {
  status: "ok" | "error";
  data: NotificationItem[];
  message?: string;
}

// ==================== Staff Upcoming / Complete ====================

export interface UpcomingBookingForStaff {
  bookingId: number;
  bookingStatus: string;
  createdAt: string;
  facility: PendingRequestFacility;
  bookingDate: string;
  startTime: string;
  endTime: string;
  intendedActivity: string | null;
  member: PendingRequestMember;
}

export interface UpcomingBookingsForStaffResponse {
  status: "ok" | "error";
  data: UpcomingBookingForStaff[];
  message?: string;
}

export interface CompleteBookingResponse {
  status: "ok" | "error";
  data?: { bookingId: number; message: string };
  message?: string;
  code?: string;
}

// ==================== Alternative Facility ====================

export interface AlternativeFacility {
  facilityId: number;
  name: string;
  description: string | null;
  maxPeople: number;
  occupiedCount: number;
  spotsLeft: number;
}

export interface AlternativesResponse {
  status: "ok" | "error";
  data: AlternativeFacility[];
  message?: string;
}

export interface SuggestAlternativeResponse {
  status: "ok" | "error";
  data?: {
    bookingRequestId: number;
    altFacilityId: number;
    altFacilityName: string;
    message: string;
  };
  message?: string;
}

export interface RespondAlternativeResponse {
  status: "ok" | "error";
  data?: {
    bookingRequestId: number;
    bookingId?: number;
    accepted: boolean;
    altFacilityName?: string;
    message: string;
  };
  message?: string;
  code?: string;
}