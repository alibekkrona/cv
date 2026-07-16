"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createLostFoundReport,
  updateLostFoundReport
} from "@/lib/services/lost-found.service";
import { lostFoundReportSchema } from "@/lib/validation/lost-found.schema";

export async function submitLostFoundReportAction(formData: FormData) {
  const parsed = lostFoundReportSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    throw new Error("Некорректные данные объявления.");
  }

  await createLostFoundReport(parsed.data, { defaultStatus: "SUBMITTED" });

  revalidatePath("/admin/lost-found");

  redirect("/lost-found?submitted=1");
}

export async function saveLostFoundReportAction(formData: FormData) {
  const user = await requirePermission("lostFound.manage");

  const parsed = lostFoundReportSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    throw new Error("Некорректные данные объявления.");
  }

  let reportId: number;

  if (parsed.data.id) {
    reportId = Number(parsed.data.id);
    await updateLostFoundReport(reportId, parsed.data, user.id);
  } else {
    const report = await createLostFoundReport(parsed.data, { actorUserId: user.id });
    reportId = report.id;
  }

  revalidatePath("/lost-found");
  revalidatePath("/admin/lost-found");
  revalidatePath(`/admin/lost-found/${reportId}/edit`);

  redirect(`/admin/lost-found/${reportId}/edit?saved=1`);
}
