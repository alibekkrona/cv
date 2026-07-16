import type { ApplicationStatus, ApplicationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminApplicationAnimalFilter = "WITH_ANIMAL" | "WITHOUT_ANIMAL";

export type AdminApplicationFilters = {
  animal?: AdminApplicationAnimalFilter;
  cityId?: number;
  query?: string;
  status?: ApplicationStatus;
  type?: ApplicationType;
};

export async function insertApplication(data: Prisma.AdoptionApplicationCreateInput) {
  return prisma.adoptionApplication.create({ data });
}

export async function findApplicationsForAdmin(filters: AdminApplicationFilters = {}) {
  return prisma.adoptionApplication.findMany({
    where: buildApplicationWhere(filters),
    orderBy: { createdAt: "desc" },
    include: {
      cityRef: true,
      animal: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      comments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          body: true,
          createdAt: true
        }
      },
      statusEvents: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          actor: {
            select: {
              email: true,
              name: true
            }
          },
          note: true,
          toStatus: true,
          createdAt: true
        }
      }
    }
  });
}

export async function findApplicationForAdminById(id: number) {
  return prisma.adoptionApplication.findUnique({
    where: { id },
    include: {
      cityRef: true,
      animal: {
        select: {
          id: true,
          slug: true,
          name: true,
          species: true,
          sex: true,
          ageMonths: true,
          size: true,
          breed: true,
          color: true,
          status: true,
          photos: {
            orderBy: [
              { isCover: "desc" },
              { position: "asc" },
              { id: "asc" }
            ],
            select: {
              alt: true,
              id: true,
              isCover: true,
              url: true
            },
            take: 1
          }
        }
      },
      statusEvents: {
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: {
              email: true,
              name: true
            }
          }
        }
      },
      comments: {
        orderBy: { createdAt: "desc" }
      }
    }
  });
}

export async function countApplicationsForAdmin(filters: AdminApplicationFilters = {}) {
  return prisma.adoptionApplication.count({
    where: buildApplicationWhere(filters)
  });
}

export async function countApplicationsByStatusForAdmin(filters: Omit<AdminApplicationFilters, "status"> = {}) {
  const statuses: ApplicationStatus[] = [
    "NEW",
    "IN_REVIEW",
    "CONTACTED",
    "CALL_SCHEDULED",
    "VISIT_SCHEDULED",
    "APPROVED",
    "REJECTED",
    "CLOSED"
  ];

  const counts = await Promise.all(
    statuses.map(async (status) => [
      status,
      await countApplicationsForAdmin({ ...filters, status })
    ] as const)
  );

  return Object.fromEntries(counts) as Record<ApplicationStatus, number>;
}

export async function updateApplicationStatusById(id: number, status: ApplicationStatus) {
  return updateApplicationStatusWithHistoryById(id, status);
}

export async function updateApplicationStatusWithHistoryById(
  id: number,
  status: ApplicationStatus,
  note?: string | null,
  actorUserId?: number
) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.adoptionApplication.findUnique({
      where: { id },
      select: {
        animalId: true,
        status: true
      }
    });

    if (!application) {
      throw new Error("Application not found.");
    }

    if (application.status === status && !note?.trim()) {
      return tx.adoptionApplication.findUniqueOrThrow({
        where: { id }
      });
    }

    const updatedApplication = await tx.adoptionApplication.update({
      where: { id },
      data: { status }
    });

    await tx.adoptionApplicationStatusEvent.create({
      data: {
        actorUserId: actorUserId ?? null,
        applicationId: id,
        fromStatus: application.status,
        toStatus: status,
        note: note?.trim() || null
      }
    });

    await tx.adminAuditLog.create({
      data: {
        action: "APPLICATION_STATUS_CHANGED",
        actorUserId: actorUserId ?? null,
        afterJson: { status },
        beforeJson: { status: application.status },
        entityId: id,
        entityType: "AdoptionApplication"
      }
    });

    if (status === "APPROVED" && application.animalId) {
      const affectedNeeds = await tx.need.findMany({
        where: {
          animalId: application.animalId,
          scope: "ANIMAL",
          status: {
            in: ["DRAFT", "ACTIVE", "FUNDED", "PAUSED"]
          }
        },
        select: {
          id: true,
          status: true
        }
      });

      if (affectedNeeds.length) {
        await tx.need.updateMany({
          where: {
            id: {
              in: affectedNeeds.map((need) => need.id)
            }
          },
          data: {
            status: "ANIMAL_ADOPTED",
            statusChangedAt: new Date(),
            statusChangedByUserId: actorUserId ?? null
          }
        });

        await tx.adminAuditLog.createMany({
          data: affectedNeeds.map((need) => ({
            action: "NEED_STATUS_CHANGED",
            actorUserId: actorUserId ?? null,
            afterJson: { status: "ANIMAL_ADOPTED" },
            beforeJson: { status: need.status },
            entityId: need.id,
            entityType: "Need"
          }))
        });
      }
    }

    return updatedApplication;
  });
}

export async function updateApplicationAdminNoteById(id: number, adminNote: string | null) {
  return prisma.adoptionApplication.update({
    where: { id },
    data: { adminNote }
  });
}

export async function insertApplicationComment(data: Prisma.AdoptionApplicationCommentCreateInput) {
  return prisma.adoptionApplicationComment.create({ data });
}

function buildApplicationWhere(filters: AdminApplicationFilters) {
  const clauses: Prisma.AdoptionApplicationWhereInput[] = [];
  const query = filters.query?.trim();

  if (filters.status) {
    clauses.push({ status: filters.status });
  }

  if (filters.type) {
    clauses.push({ type: filters.type });
  }

  if (filters.cityId) {
    clauses.push({ cityId: filters.cityId });
  }

  if (filters.animal === "WITH_ANIMAL") {
    clauses.push({ animalId: { not: null } });
  }

  if (filters.animal === "WITHOUT_ANIMAL") {
    clauses.push({ animalId: null });
  }

  if (query) {
    clauses.push({
      OR: [
        { applicantName: { contains: query } },
        { phone: { contains: query } },
        { email: { contains: query } },
        { messenger: { contains: query } },
        { city: { contains: query } },
        { cityRef: { name: { contains: query } } },
        { housingType: { contains: query } },
        { message: { contains: query } },
        { adminNote: { contains: query } },
        {
          animal: {
            is: {
              name: { contains: query }
            }
          }
        }
      ]
    });
  }

  return clauses.length ? { AND: clauses } : undefined;
}
