import { prisma } from "@/lib/prisma";

export async function findDesignSettings() {
  return prisma.designSettings.findFirst({
    orderBy: { updatedAt: "desc" }
  });
}

export async function upsertDesignSettings(activeTheme: string) {
  const existingSettings = await findDesignSettings();

  if (existingSettings) {
    return prisma.designSettings.update({
      where: { id: existingSettings.id },
      data: { activeTheme }
    });
  }

  return prisma.designSettings.create({
    data: { activeTheme }
  });
}
