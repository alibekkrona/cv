import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function findContactSettings() {
  return prisma.contactSettings.findFirst({
    orderBy: { updatedAt: "desc" }
  });
}

export async function upsertContactSettings(data: Prisma.ContactSettingsCreateInput) {
  const existingSettings = await findContactSettings();

  if (existingSettings) {
    return prisma.contactSettings.update({
      where: { id: existingSettings.id },
      data
    });
  }

  return prisma.contactSettings.create({ data });
}
