"use server";

import type { ApplicationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { canSetApplicationStatus } from "@/lib/auth/application-status-permissions";
import { requirePermission } from "@/lib/auth/permissions";
import {
  addApplicationComment,
  createApplication,
  updateApplicationAdminNote,
  updateApplicationStatus
} from "@/lib/services/applications.service";
import { adoptionApplicationSchema } from "@/lib/validation/application.schema";

export type AdoptionApplicationActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function submitAdoptionApplicationAction(
  _state: AdoptionApplicationActionState,
  formData: FormData
): Promise<AdoptionApplicationActionState> {
  const parsed = adoptionApplicationSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Проверьте выделенные поля.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  try {
    await createApplication(parsed.data);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Не удалось отправить заявку."
    };
  }

  revalidatePath("/admin/applications");
  revalidatePath("/admin");

  return {
    ok: true,
    message: "Заявка отправлена. Команда приюта увидит её в админке."
  };
}

const applicationStatuses = [
  "NEW",
  "IN_REVIEW",
  "CONTACTED",
  "CALL_SCHEDULED",
  "VISIT_SCHEDULED",
  "APPROVED",
  "REJECTED",
  "CLOSED"
] satisfies ApplicationStatus[];

export async function updateApplicationStatusAction(formData: FormData) {
  const user = await requirePermission("applications.manage");

  const id = Number(formData.get("id"));
  const status = formData.get("status");
  const statusNote = formData.get("statusNote");

  if (!Number.isInteger(id) || !applicationStatuses.includes(status as ApplicationStatus)) {
    throw new Error("Некорректное обновление статуса заявки.");
  }

  if (!canSetApplicationStatus(user.role, status as ApplicationStatus)) {
    throw new Error("Недостаточно прав для установки этого статуса заявки.");
  }

  await updateApplicationStatus(
    id,
    status as ApplicationStatus,
    typeof statusNote === "string" ? statusNote : null,
    user.id
  );
  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${id}`);
  revalidatePath("/admin");
}

export async function updateApplicationAdminNoteAction(formData: FormData) {
  await requirePermission("applications.manage");

  const id = Number(formData.get("id"));
  const adminNote = formData.get("adminNote");

  if (!Number.isInteger(id) || typeof adminNote !== "string") {
    throw new Error("Некорректное обновление заметки заявки.");
  }

  const normalizedNote = adminNote.trim() ? adminNote.trim() : null;

  await updateApplicationAdminNote(id, normalizedNote);
  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${id}`);
}

export async function addApplicationCommentAction(formData: FormData) {
  await requirePermission("applications.manage");

  const id = Number(formData.get("id"));
  const body = formData.get("body");
  const authorName = formData.get("authorName");

  if (!Number.isInteger(id) || typeof body !== "string") {
    throw new Error("Некорректный комментарий к заявке.");
  }

  await addApplicationComment(
    id,
    body,
    typeof authorName === "string" ? authorName : null
  );

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${id}`);
}
