import type { ApplicationStatus } from "@prisma/client";
import {
  countApplicationsByStatusForAdmin,
  findApplicationForAdminById,
  findApplicationsForAdmin,
  insertApplication,
  insertApplicationComment,
  updateApplicationAdminNoteById,
  updateApplicationStatusWithHistoryById
} from "@/lib/repositories/applications.repository";
import type { AdminApplicationFilters } from "@/lib/repositories/applications.repository";
import { findAnimalSpeciesById } from "@/lib/repositories/animals.repository";
import type { AdoptionApplicationFormInput } from "@/lib/validation/application.schema";

export async function createApplication(input: AdoptionApplicationFormInput) {
  if (input.type === "WALKING") {
    if (!input.animalId) {
      throw new Error("Прогулку можно оформить только для конкретной собаки.");
    }

    const animal = await findAnimalSpeciesById(input.animalId);

    if (animal?.species !== "DOG") {
      throw new Error("Прогулка доступна только для собак.");
    }
  }

  return insertApplication({
    type: input.type,
    applicantName: input.applicantName,
    phone: input.phone,
    email: input.email || null,
    messenger: input.messenger || null,
    city: input.city || null,
    cityRef: input.cityId ? { connect: { id: Number(input.cityId) } } : undefined,
    housingType: input.housingType || null,
    hasChildren: input.hasChildren ?? null,
    hasAnimals: input.hasAnimals ?? null,
    message: input.message || null,
    statusEvents: {
      create: {
        toStatus: "NEW",
        note: "Заявка создана"
      }
    },
    animal: input.animalId
      ? {
          connect: {
            id: input.animalId
          }
        }
      : undefined
  });
}

export async function listApplicationsForAdmin(filters: AdminApplicationFilters = {}) {
  return findApplicationsForAdmin(filters);
}

export async function getApplicationStatusCountsForAdmin(filters: Omit<AdminApplicationFilters, "status"> = {}) {
  return countApplicationsByStatusForAdmin(filters);
}

export async function getApplicationForAdmin(id: number) {
  if (!Number.isInteger(id)) {
    throw new Error("Invalid application id.");
  }

  return findApplicationForAdminById(id);
}

export async function updateApplicationStatus(id: number, status: ApplicationStatus, note?: string | null, actorUserId?: number) {
  if (!Number.isInteger(id)) {
    throw new Error("Invalid application id.");
  }

  return updateApplicationStatusWithHistoryById(id, status, note, actorUserId);
}

export async function updateApplicationAdminNote(id: number, adminNote: string | null) {
  if (!Number.isInteger(id)) {
    throw new Error("Invalid application id.");
  }

  return updateApplicationAdminNoteById(id, adminNote);
}

export async function addApplicationComment(id: number, body: string, authorName?: string | null) {
  if (!Number.isInteger(id)) {
    throw new Error("Invalid application id.");
  }

  const normalizedBody = body.trim();

  if (!normalizedBody) {
    throw new Error("Application comment is empty.");
  }

  return insertApplicationComment({
    body: normalizedBody,
    authorName: authorName?.trim() || null,
    application: {
      connect: { id }
    }
  });
}
