import { findPublishedReports } from "@/lib/repositories/reports.repository";

export async function listPublishedReports() {
  return findPublishedReports();
}
