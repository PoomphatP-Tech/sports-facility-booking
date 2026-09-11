import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./auth-middleware";
import { LoginEntryGuard } from "./login-entry-guard";
import type { User, UserRole } from "~/services/types";

const needsRegistrationDetails = (user: User) =>
  user.role === "member" &&
  (!user.firstName || !user.lastName || !user.dateOfBirth || !user.address);

type RoleGuardProps = {
  allow: UserRole[];
  children: React.ReactNode;
};

export function Guard({ allow, children }: RoleGuardProps) {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  if (!user) return <Navigate to="/auth/login" replace />;

  if (needsRegistrationDetails(user)) {
    return <Navigate to="/auth/register?step=3" replace />;
  }

  if (user.role === "admin" && !allow.includes("admin")) return <Navigate to="/admin" replace />;
  if (user.role === "member" && !allow.includes("member")) return <Navigate to="/" replace />;
  if (user.role === "staff" && !allow.includes("staff")) return <Navigate to="/staff/pending" replace />;

  return children;
}

export function GuestGuard() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const normalizedPath = pathname.replace(/\/+$/, "").toLowerCase();
  let destination: string | null = null;
  if (user) {
    if (needsRegistrationDetails(user)) {
      if (normalizedPath !== "/auth/register") destination = "/auth/register?step=3";
    } else if (user.role === "admin") {
      destination = "/admin";
    } else if (user.role === "staff") {
      destination = "/staff/pending";
    } else {
      destination = "/";
    }
  }

  const content = loading ? null : destination
    ? <Navigate to={destination} replace /> : <Outlet />;

  return normalizedPath === "/auth/login"
    ? <LoginEntryGuard>{content}</LoginEntryGuard>
    : content;
}
