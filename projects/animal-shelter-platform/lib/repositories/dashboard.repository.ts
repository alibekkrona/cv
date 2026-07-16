import { prisma } from "@/lib/prisma";

export async function getAdminDashboardSnapshot() {
  const [
    totalAnimals,
    availableAnimals,
    draftAnimals,
    totalApplications,
    newApplications,
    contactedApplications,
    needsRequiringAttention,
    recentApplications
  ] = await Promise.all([
    prisma.animal.count(),
    prisma.animal.count({ where: { status: "AVAILABLE" } }),
    prisma.animal.count({ where: { status: "DRAFT" } }),
    prisma.adoptionApplication.count(),
    prisma.adoptionApplication.count({ where: { status: "NEW" } }),
    prisma.adoptionApplication.count({
      where: {
        status: {
          in: ["CONTACTED", "CALL_SCHEDULED", "VISIT_SCHEDULED"]
        }
      }
    }),
    prisma.need.count({
      where: {
        status: {
          in: ["FUNDED", "ANIMAL_ADOPTED"]
        }
      }
    }),
    prisma.adoptionApplication.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        applicantName: true,
        status: true,
        type: true,
        createdAt: true,
        animal: {
          select: {
            name: true,
            slug: true
          }
        }
      }
    })
  ]);

  return {
    totalAnimals,
    availableAnimals,
    draftAnimals,
    totalApplications,
    newApplications,
    contactedApplications,
    needsRequiringAttention,
    recentApplications
  };
}
