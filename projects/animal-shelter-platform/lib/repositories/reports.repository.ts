import { prisma } from "@/lib/prisma";

export async function findPublishedReports() {
  return prisma.reportDocument.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" }
  });
}
