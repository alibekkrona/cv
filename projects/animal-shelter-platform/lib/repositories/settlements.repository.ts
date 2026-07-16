import { prisma } from "@/lib/prisma";

export async function findActiveSettlementsByRegionSlug(regionSlug: string) {
  return prisma.settlement.findMany({
    where: {
      isActive: true,
      region: {
        slug: regionSlug
      }
    },
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" }
    ],
    select: {
      id: true,
      name: true,
      slug: true,
      type: true
    }
  });
}

export async function findDefaultSettlementBySlug(slug: string) {
  return prisma.settlement.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true
    }
  });
}
