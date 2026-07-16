import type { ApplicationStatus, UserRole } from "@prisma/client";

const allApplicationStatuses = [
  "NEW",
  "IN_REVIEW",
  "CONTACTED",
  "CALL_SCHEDULED",
  "VISIT_SCHEDULED",
  "APPROVED",
  "REJECTED",
  "CLOSED"
] satisfies ApplicationStatus[];

const roleApplicationStatuses: Record<UserRole, ApplicationStatus[]> = {
  SUPER_ADMIN: allApplicationStatuses,
  ADMIN: [
    "CONTACTED",
    "CALL_SCHEDULED",
    "APPROVED",
    "REJECTED",
    "CLOSED"
  ],
  STAFF: [
    "CONTACTED",
    "CALL_SCHEDULED"
  ]
};

export function getAllowedApplicationStatuses(role: UserRole) {
  return roleApplicationStatuses[role];
}

export function canSetApplicationStatus(role: UserRole, status: ApplicationStatus) {
  return getAllowedApplicationStatuses(role).includes(status);
}
