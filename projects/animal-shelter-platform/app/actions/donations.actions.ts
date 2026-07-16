"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { arePublicDonationsEnabled } from "@/lib/services/donation-settings.service";
import { createDonationPayment, createNeed, deleteNeed, saveNeedAudit, updateNeed } from "@/lib/services/donations.service";
import { donationFormSchema } from "@/lib/validation/donations.schema";
import { needAuditFormSchema, needFormSchema } from "@/lib/validation/need.schema";

export async function createDonationAction(formData: FormData) {
  if (!await arePublicDonationsEnabled()) {
    throw new Error("Донаты сейчас отключены на сайте.");
  }

  const parsed = donationFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    throw new Error("Некорректные данные доната.");
  }

  const { payment } = await createDonationPayment(parsed.data);
  revalidateDonationPaths();
  redirect(`/donations/pay/${payment.publicId}`);
}

export async function saveNeedAuditAction(formData: FormData) {
  const user = await requirePermission("needAudits.manage");

  const parsed = needAuditFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    throw new Error("Некорректные данные отчета.");
  }

  await saveNeedAudit(parsed.data, user.id);
  revalidateDonationPaths();
  redirect(`/admin/needs/${parsed.data.needId}/edit?auditSaved=1`);
}

export async function saveNeedAction(formData: FormData) {
  const user = await requirePermission("needs.createDraft");
  const parsed = needFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    throw new Error("Некорректные данные потребности.");
  }

  const canManageNeeds = hasPermission(user.role, "needs.manage");

  if (!canManageNeeds && parsed.data.id) {
    throw new Error("Недостаточно прав для редактирования потребности.");
  }

  const input = canManageNeeds
    ? parsed.data
    : {
        ...parsed.data,
        isUrgent: false,
        raisedAmount: 0,
        status: "DRAFT" as const
      };
  const need = input.id
    ? await updateNeed(input.id, input, user.id)
    : await createNeed(input, user.id);

  revalidateDonationPaths();
  if (!canManageNeeds) {
    redirect("/admin/needs?saved=1");
  }
  redirect(`/admin/needs/${need.id}/edit?saved=1`);
}

export async function deleteNeedAction(formData: FormData) {
  await requirePermission("needs.manage");

  const id = Number(formData.get("id"));

  if (!Number.isInteger(id)) {
    throw new Error("Некорректная потребность.");
  }

  await deleteNeed(id);
  revalidateDonationPaths();
  redirect("/admin/needs");
}

function revalidateDonationPaths() {
  revalidatePath("/");
  revalidatePath("/needs");
  revalidatePath("/admin/needs");
  revalidatePath("/admin/donations");
  revalidatePath("/animals");
}
