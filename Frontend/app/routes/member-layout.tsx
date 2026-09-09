import { Outlet } from "react-router";
import { Guard } from "../auth/guard";

export default function MemberLayout() {
  return (
    <Guard allow={["member"]}>
      <Outlet />
    </Guard>
  );
}