import { GuestGuard } from "~/auth/guard";

export default function AuthLayout() {
  return <GuestGuard />;
}
