import { Outlet } from "react-router";
import { Guard } from "../auth/guard";

export default function AdminLayout() {
  return (
    <Guard allow={["admin"]}>
      <Outlet />
    </Guard>
  );
}