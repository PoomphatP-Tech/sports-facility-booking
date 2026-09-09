import FacilityList from "~/facility/facility-list";

export type { FacilityItem as FacilityAdminItem } from "~/facility/facility-list";

export default function AdminPage() {
    return <FacilityList />;
}
