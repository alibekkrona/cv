"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import {
  addAnimalComment,
  addLostFoundComment,
  deleteAnimalComment,
  editAnimalComment,
  editLostFoundComment,
  registerAnimalView,
  reportAnimalComment,
  reportLostFoundComment,
  toggleLike,
  toggleLostFoundReportLike,
  updateAnimalCommentVisibility
} from "@/lib/services/social.service";
import { getOrCreateVisitorKey } from "@/lib/visitor";

export async function toggleAnimalLikeAction(formData: FormData) {
  const animalId = Number(formData.get("animalId"));
  const animalSlug = String(formData.get("animalSlug") ?? "");

  if (!Number.isInteger(animalId)) {
    throw new Error("Некорректное животное.");
  }

  const visitorKey = await getOrCreateVisitorKey();
  await toggleLike(animalId, visitorKey);

  if (animalSlug) {
    revalidatePath(`/animals/${animalSlug}`);
  }

  revalidatePath("/admin/animals");
}

export async function recordAnimalViewAction(formData: FormData) {
  const animalId = Number(formData.get("animalId"));
  const animalSlug = String(formData.get("animalSlug") ?? "");

  if (!Number.isInteger(animalId)) {
    throw new Error("Некорректное животное.");
  }

  await registerAnimalView(animalId, await getOrCreateVisitorKey());

  if (animalSlug) {
    revalidatePath(`/animals/${animalSlug}`);
  }

  revalidatePath("/admin/animals");
}

export async function addAnimalCommentAction(formData: FormData) {
  const animalId = Number(formData.get("animalId"));
  const animalSlug = String(formData.get("animalSlug") ?? "");
  const parentIdValue = formData.get("parentId");
  const parentId = parentIdValue ? Number(parentIdValue) : null;
  const body = String(formData.get("body") ?? "");

  if (!Number.isInteger(animalId)) {
    throw new Error("Некорректное животное.");
  }

  await addAnimalComment({
    animalId,
    body,
    parentId: Number.isInteger(parentId) ? parentId : null,
    visitorKey: await getOrCreateVisitorKey()
  });

  if (animalSlug) {
    revalidatePath(`/animals/${animalSlug}`);
    redirect(`/animals/${animalSlug}#comments`);
  }
}

export async function reportAnimalCommentAction(formData: FormData) {
  const commentId = Number(formData.get("commentId"));
  const animalId = Number(formData.get("animalId"));
  const animalSlug = String(formData.get("animalSlug") ?? "");

  if (!Number.isInteger(commentId)) {
    throw new Error("Некорректный комментарий.");
  }

  await reportAnimalComment(commentId, await getOrCreateVisitorKey());

  if (Number.isInteger(animalId)) {
    revalidatePath(`/admin/animals/${animalId}/edit`);
  }

  if (animalSlug) {
    revalidatePath(`/animals/${animalSlug}`);
    redirect(`/animals/${animalSlug}#comments`);
  }
}

export async function editAnimalCommentAction(formData: FormData) {
  const commentId = Number(formData.get("commentId"));
  const animalSlug = String(formData.get("animalSlug") ?? "");
  const body = String(formData.get("body") ?? "");

  if (!Number.isInteger(commentId)) {
    throw new Error("Некорректный комментарий.");
  }

  await editAnimalComment(commentId, body, await getOrCreateVisitorKey());

  if (animalSlug) {
    revalidatePath(`/animals/${animalSlug}`);
    redirect(`/animals/${animalSlug}#comments`);
  }
}

export async function toggleAnimalCommentVisibilityAction(formData: FormData) {
  await requirePermission("comments.hide");

  const commentId = Number(formData.get("commentId"));
  const animalId = Number(formData.get("animalId"));
  const isHidden = formData.get("isHidden") === "true";

  if (!Number.isInteger(commentId) || !Number.isInteger(animalId)) {
    throw new Error("Некорректный комментарий.");
  }

  await updateAnimalCommentVisibility(commentId, isHidden);

  revalidatePath(`/admin/animals/${animalId}/edit`);
}

export async function deleteAnimalCommentAction(formData: FormData) {
  await requirePermission("comments.delete");

  const commentId = Number(formData.get("commentId"));
  const animalId = Number(formData.get("animalId"));

  if (!Number.isInteger(commentId) || !Number.isInteger(animalId)) {
    throw new Error("Некорректный комментарий.");
  }

  await deleteAnimalComment(commentId);

  revalidatePath(`/admin/animals/${animalId}/edit`);
}

export async function toggleLostFoundLikeAction(formData: FormData) {
  const reportId = Number(formData.get("reportId"));
  const reportSlug = String(formData.get("reportSlug") ?? "");

  if (!Number.isInteger(reportId)) {
    throw new Error("Некорректное объявление.");
  }

  await toggleLostFoundReportLike(reportId, await getOrCreateVisitorKey());

  if (reportSlug) {
    revalidatePath(`/lost-found/${reportSlug}`);
  }
}

export async function addLostFoundCommentAction(formData: FormData) {
  const reportId = Number(formData.get("reportId"));
  const reportSlug = String(formData.get("reportSlug") ?? "");
  const parentIdValue = formData.get("parentId");
  const parentId = parentIdValue ? Number(parentIdValue) : null;
  const body = String(formData.get("body") ?? "");

  if (!Number.isInteger(reportId)) {
    throw new Error("Некорректное объявление.");
  }

  await addLostFoundComment({
    body,
    parentId: Number.isInteger(parentId) ? parentId : null,
    reportId,
    visitorKey: await getOrCreateVisitorKey()
  });

  if (reportSlug) {
    revalidatePath(`/lost-found/${reportSlug}`);
    redirect(`/lost-found/${reportSlug}#comments`);
  }
}

export async function editLostFoundCommentAction(formData: FormData) {
  const commentId = Number(formData.get("commentId"));
  const reportSlug = String(formData.get("reportSlug") ?? "");
  const body = String(formData.get("body") ?? "");

  if (!Number.isInteger(commentId)) {
    throw new Error("Некорректный комментарий.");
  }

  await editLostFoundComment(commentId, body, await getOrCreateVisitorKey());

  if (reportSlug) {
    revalidatePath(`/lost-found/${reportSlug}`);
    redirect(`/lost-found/${reportSlug}#comments`);
  }
}

export async function reportLostFoundCommentAction(formData: FormData) {
  const commentId = Number(formData.get("commentId"));
  const reportSlug = String(formData.get("reportSlug") ?? "");

  if (!Number.isInteger(commentId)) {
    throw new Error("Некорректный комментарий.");
  }

  await reportLostFoundComment(commentId, await getOrCreateVisitorKey());

  if (reportSlug) {
    revalidatePath(`/lost-found/${reportSlug}`);
    redirect(`/lost-found/${reportSlug}#comments`);
  }
}
