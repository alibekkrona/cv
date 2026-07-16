import type { UserRole } from "@prisma/client";

export const adminRoleLabels: Record<UserRole, string> = {
  ADMIN: "Администратор",
  STAFF: "Сотрудник",
  SUPER_ADMIN: "Супер-админ"
};
