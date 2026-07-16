import { prisma } from "@/lib/prisma";

export async function findDonationSettings() {
  return prisma.donationSettings.findFirst({
    orderBy: { updatedAt: "desc" }
  });
}

export async function upsertDonationSettings(data: { publicDonationsEnabled: boolean }) {
  const existingSettings = await findDonationSettings();

  if (existingSettings) {
    return prisma.donationSettings.update({
      where: { id: existingSettings.id },
      data
    });
  }

  return prisma.donationSettings.create({ data });
}
