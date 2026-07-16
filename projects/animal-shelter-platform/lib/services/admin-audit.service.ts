import type { Prisma } from "@prisma/client";
import {
  findAdminAuditLogFilterOptions,
  findAdminAuditLogs,
  insertAdminAuditLog,
  type AdminAuditLogFilters
} from "@/lib/repositories/admin-audit.repository";

export async function recordAdminAuditLog(input: {
  action: string;
  actorUserId?: number | null;
  after?: Prisma.InputJsonValue | null;
  before?: Prisma.InputJsonValue | null;
  entityId?: number | null;
  entityType: string;
}) {
  return insertAdminAuditLog({
    action: input.action,
    actorUserId: input.actorUserId,
    afterJson: input.after,
    beforeJson: input.before,
    entityId: input.entityId,
    entityType: input.entityType
  });
}

export async function listAdminAuditLogs(filters: AdminAuditLogFilters = {}) {
  return findAdminAuditLogs(filters);
}

export async function getAdminAuditLogFilterOptions() {
  return findAdminAuditLogFilterOptions();
}
