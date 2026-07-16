import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function findVisitHours() {
  return prisma.shelterVisitHour.findMany({
    orderBy: [
      { dayOfWeek: "asc" },
      { opensAt: "asc" }
    ]
  });
}

export async function findWalkingHours() {
  return prisma.shelterWalkingHour.findMany({
    orderBy: [
      { dayOfWeek: "asc" },
      { opensAt: "asc" }
    ]
  });
}

export async function replaceVisitHours(entries: Prisma.ShelterVisitHourCreateManyInput[]) {
  return prisma.$transaction(async (tx) => {
    await tx.shelterVisitHour.deleteMany();

    if (!entries.length) {
      return [];
    }

    await tx.shelterVisitHour.createMany({ data: entries });

    return tx.shelterVisitHour.findMany({
      orderBy: [
        { dayOfWeek: "asc" },
        { opensAt: "asc" }
      ]
    });
  });
}

export async function replaceWalkingHours(entries: Prisma.ShelterWalkingHourCreateManyInput[]) {
  return prisma.$transaction(async (tx) => {
    await tx.shelterWalkingHour.deleteMany();

    if (!entries.length) {
      return [];
    }

    await tx.shelterWalkingHour.createMany({ data: entries });

    return tx.shelterWalkingHour.findMany({
      orderBy: [
        { dayOfWeek: "asc" },
        { opensAt: "asc" }
      ]
    });
  });
}
