import "server-only";

import { findDonationSettings, upsertDonationSettings } from "@/lib/repositories/donation-settings.repository";

export async function getDonationSettings() {
  return findDonationSettings();
}

export async function arePublicDonationsEnabled() {
  const settings = await findDonationSettings();
  return settings?.publicDonationsEnabled ?? false;
}

export async function saveDonationSettings(input: { publicDonationsEnabled: boolean }) {
  return upsertDonationSettings(input);
}
