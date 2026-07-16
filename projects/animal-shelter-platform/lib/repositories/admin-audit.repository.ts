import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminAuditLogInput = {
  action: string;
  actorUserId?: number | null;
  afterJson?: Prisma.InputJsonValue | null;
  beforeJson?: Prisma.InputJsonValue | null;
  entityId?: number | null;
  entityType: string;
};

export async function insertAdminAuditLog(data: AdminAuditLogInput) {
  return prisma.adminAuditLog.create({
    data: {
      action: data.action,
      actor: data.actorUserId ? { connect: { id: data.actorUserId } } : undefined,
      afterJson: data.afterJson ?? undefined,
      beforeJson: data.beforeJson ?? undefined,
      entityId: data.entityId ?? null,
      entityType: data.entityType
    }
  });
}

export type AdminAuditLogFilters = {
  action?: string;
  actorUserId?: number;
  entityId?: number;
  entityType?: string;
  page?: number;
  pageSize?: number;
};

export async function findAdminAuditLogs(filters: AdminAuditLogFilters = {}) {
  const pageSize = filters.pageSize ?? 30;
  const requestedPage = filters.page ?? 1;
  const where: Prisma.AdminAuditLogWhereInput = {
    action: filters.action,
    actorUserId: filters.actorUserId,
    entityId: filters.entityId,
    entityType: filters.entityType
  };
  const requestedSkip = (Math.max(requestedPage, 1) - 1) * pageSize;

  const [total, initialLogs] = await prisma.$transaction([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: requestedSkip,
      take: pageSize,
      include: {
        actor: {
          select: {
            email: true,
            id: true,
            name: true
          }
        }
      }
    })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);

  if (page !== requestedPage && total > 0) {
    const logs = await prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        actor: {
          select: {
            email: true,
            id: true,
            name: true
          }
        }
      }
    });

    return { logs, page, pageSize, total, totalPages };
  }

  return { logs: initialLogs, page, pageSize, total, totalPages };
}

export async function findAdminAuditLogFilterOptions() {
  const [actions, entityTypes, actors] = await Promise.all([
    prisma.adminAuditLog.findMany({
      distinct: ["action"],
      orderBy: { action: "asc" },
      select: { action: true }
    }),
    prisma.adminAuditLog.findMany({
      distinct: ["entityType"],
      orderBy: { entityType: "asc" },
      select: { entityType: true }
    }),
    prisma.user.findMany({
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        email: true,
        id: true,
        name: true
      }
    })
  ]);

  return {
    actions: actions.map((item) => item.action),
    actors,
    entityTypes: entityTypes.map((item) => item.entityType)
  };
}
