import { Outlet } from "react-router";
import { Guard } from "../auth/guard";

export default function StaffLayout() {
  return (
    <Guard allow={["staff"]}>
      <Outlet />
    </Guard>
  );
}