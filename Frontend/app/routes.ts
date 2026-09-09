import { type RouteConfig, route, layout } from "@react-router/dev/routes";

export default [
  layout("routes/member-layout.tsx", [
    route("", "facility/facility-list.tsx"),
    route("facilities/map", "facility/facilities-map.tsx"),
    route("equipment-reports", "equipment-report/equipment-report-list.tsx"),
    route("find-partners", "partner-matching/find-partners.tsx"),
    route("partner-requests", "partner-matching/partner-requests.tsx"),
    route("my-partner-profile", "partner-matching/my-partner-profile.tsx"),
    route("find-partners/:partnerId", "partner-matching/partner-profile.tsx"),
    route("booking/new/:facilityId", "booking/new-booking.tsx"),
    route("booking/my", "booking/my-bookings.tsx"),
  ]),

  route("profile", "profile/profile.tsx"),

  layout("routes/staff-layout.tsx", [
    route("staff/pending", "staff/pending-requests.tsx"),
    route("staff/upcoming", "staff/upcoming-bookings.tsx"),
    route(
      "equipment-reports-admin",
      "equipment-report/equipment-report-admin.tsx",
    ),
  ]),

  layout("routes/admin-layout.tsx", [
    route("admin", "admin/admin-page.tsx"),
    route("admin/accounts", "admin/admin-accounts.tsx"),
    route("admin/facility/create", "admin/create-facility.tsx", {
      id: "admin-facility-create",
    }),
    route("admin/facility/edit/:facilityId", "admin/create-facility.tsx", {
      id: "admin-facility-edit",
    }),
    route("admin/staff", "staff-management/staff-mangement.tsx"),
    route("admin/staff/create", "staff-management/create-staff.tsx", {
      id: "admin-staff-create",
    }),
    route("admin/staff/edit/:staffId", "staff-management/create-staff.tsx", {
      id: "admin-staff-edit",
    }),
  ]),

  layout("routes/auth-layout.tsx", [
    route("auth/login", "auth/login.tsx"),
    route("auth/register", "auth/register.tsx"),
    route("auth/forgot-password", "auth/forgot-password.tsx"),
  ]),
] satisfies RouteConfig;
