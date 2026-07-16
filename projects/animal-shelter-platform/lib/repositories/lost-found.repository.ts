import type { LostFoundStatus, LostFoundType, Prisma, Species } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LostFoundFilters = {
  cityId?: number;
  page?: number;
  pageSize?: number;
  query?: string;
  species?: Species;
  status?: LostFoundStatus;
  type?: LostFoundType;
};

export async function findPublishedLostFoundReports(filters: Omit<LostFoundFilters, "status"> = {}) {
  return prisma.lostFoundReport.findMany({
    where: buildLostFoundWhere({ ...filters, status: "PUBLISHED" }),
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: {
      cityRef: true,
      photos: {
        orderBy: [{ isCover: "desc" }, { position: "asc" }, { id: "asc" }],
        take: 1
      }
    }
  });
}

export async function findPublishedLostFoundReportsPage(filters: Omit<LostFoundFilters, "status"> = {}) {
  const where = buildLostFoundWhere({ ...filters, status: "PUBLISHED" });
  const pageSize = filters.pageSize ?? 24;
  const requestedPage = filters.page ?? 1;
  const requestedSkip = (Math.max(requestedPage, 1) - 1) * pageSize;
  const [total, requestedItems] = await Promise.all([
    prisma.lostFoundReport.count({ where }),
    prisma.lostFoundReport.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: requestedSkip,
      take: pageSize,
      include: {
        cityRef: true,
        photos: {
          orderBy: [{ isCover: "desc" }, { position: "asc" }, { id: "asc" }],
          take: 1
        }
      }
    })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  const items = page === requestedPage
    ? requestedItems
    : await prisma.lostFoundReport.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          cityRef: true,
          photos: {
            orderBy: [{ isCover: "desc" }, { position: "asc" }, { id: "asc" }],
            take: 1
          }
        }
      });

  return { items, page, pageSize, total, totalPages };
}

export async function findLostFoundReportBySlug(slug: string) {
  return prisma.lostFoundReport.findFirst({
    where: {
      slug,
      status: "PUBLISHED"
    },
    include: {
      photos: {
        orderBy: [{ isCover: "desc" }, { position: "asc" }, { id: "asc" }]
      },
      cityRef: true
    }
  });
}

export async function findLostFoundReportsForAdmin(filters: LostFoundFilters = {}) {
  return prisma.lostFoundReport.findMany({
    where: buildLostFoundWhere(filters),
    orderBy: { updatedAt: "desc" },
    include: {
      cityRef: true,
      photos: {
        orderBy: [{ isCover: "desc" }, { position: "asc" }, { id: "asc" }],
        take: 1
      }
    }
  });
}

export async function findLostFoundReportsForAdminPage(filters: LostFoundFilters = {}) {
  const where = buildLostFoundWhere(filters);
  const pageSize = filters.pageSize ?? 25;
  const requestedPage = filters.page ?? 1;
  const requestedSkip = (Math.max(requestedPage, 1) - 1) * pageSize;
  const [total, requestedItems] = await Promise.all([
    prisma.lostFoundReport.count({ where }),
    prisma.lostFoundReport.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: requestedSkip,
      take: pageSize,
      include: {
        cityRef: true,
        photos: {
          orderBy: [{ isCover: "desc" }, { position: "asc" }, { id: "asc" }],
          take: 1
        }
      }
    })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  const items = page === requestedPage
    ? requestedItems
    : await prisma.lostFoundReport.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          cityRef: true,
          photos: {
            orderBy: [{ isCover: "desc" }, { position: "asc" }, { id: "asc" }],
            take: 1
          }
        }
      });

  return { items, page, pageSize, total, totalPages };
}

export async function findLostFoundReportForAdmin(id: number) {
  return prisma.lostFoundReport.findUnique({
    where: { id },
    include: {
      photos: {
        orderBy: [{ isCover: "desc" }, { position: "asc" }, { id: "asc" }]
      },
      cityRef: true
    }
  });
}

export async function findLostFoundAuditSnapshotById(id: number) {
  return prisma.lostFoundReport.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      type: true,
      status: true,
      species: true,
      title: true,
      publishedAt: true,
      cityId: true,
      updatedAt: true
    }
  });
}

export async function findLostFoundSlugConflict(slug: string, excludeId?: number) {
  return prisma.lostFoundReport.findFirst({
    where: {
      slug,
      id: excludeId ? { not: excludeId } : undefined
    },
    select: {
      id: true
    }
  });
}

export async function insertLostFoundReport(data: Prisma.LostFoundReportCreateInput) {
  return prisma.lostFoundReport.create({ data });
}

export async function updateLostFoundReportById(id: number, data: Prisma.LostFoundReportUpdateInput) {
  return prisma.lostFoundReport.update({
    where: { id },
    data
  });
}

function buildLostFoundWhere(filters: LostFoundFilters) {
  const clauses: Prisma.LostFoundReportWhereInput[] = [];
  const query = filters.query?.trim();

  if (filters.type) {
    clauses.push({ type: filters.type });
  }

  if (filters.status) {
    clauses.push({ status: filters.status });
  }

  if (filters.species) {
    clauses.push({ species: filters.species });
  }

  if (filters.cityId) {
    clauses.push({ cityId: filters.cityId });
  }

  if (query) {
    clauses.push({
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
        { city: { contains: query } },
        { cityRef: { name: { contains: query } } },
        { district: { contains: query } },
        { locationText: { contains: query } },
        { contactName: { contains: query } },
        { contactPhone: { contains: query } },
        { contactEmail: { contains: query } },
        { adminNote: { contains: query } }
      ]
    });
  }

  return clauses.length ? { AND: clauses } : undefined;
}
