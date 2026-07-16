import { getAdminDashboardSnapshot } from "@/lib/repositories/dashboard.repository";

export async function getAdminDashboard() {
  return getAdminDashboardSnapshot();
}
