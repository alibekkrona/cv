import "server-only";

import type { UserRole } from "@prisma/client";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";

export type AdminPermission =
  | "admin.dashboard"
  | "animals.manage"
  | "applications.manage"
  | "auditLog.view"
  | "comments.hide"
  | "comments.delete"
  | "design.manage"
  | "donations.view"
  | "lostFound.manage"
  | "needs.createDraft"
  | "needs.manage"
  | "needAudits.manage"
  | "settings.manage"
  | "statistics.view"
  | "super.manage";

const rolePermissions: Record<UserRole, Set<AdminPermission>> = {
  SUPER_ADMIN: new Set([
    "admin.dashboard",
    "animals.manage",
    "applications.manage",
    "auditLog.view",
    "comments.hide",
    "comments.delete",
    "design.manage",
    "donations.view",
    "lostFound.manage",
    "needs.createDraft",
    "needs.manage",
    "needAudits.manage",
    "settings.manage",
    "statistics.view",
    "super.manage"
  ]),
  ADMIN: new Set([
    "admin.dashboard",
    "animals.manage",
    "applications.manage",
    "auditLog.view",
    "comments.hide",
    "comments.delete",
    "design.manage",
    "donations.view",
    "lostFound.manage",
    "needs.createDraft",
    "needs.manage",
    "needAudits.manage",
    "settings.manage",
    "statistics.view"
  ]),
  STAFF: new Set([
    "admin.dashboard",
    "animals.manage",
    "applications.manage",
    "comments.hide",
    "lostFound.manage",
    "needs.createDraft"
  ])
};

export function hasPermission(role: UserRole, permission: AdminPermission) {
  return rolePermissions[role].has(permission);
}

export async function requirePermission(permission: AdminPermission) {
  const user = await requireAdmin();

  if (!hasPermission(user.role, permission)) {
    notFound();
  }

  return user;
}
