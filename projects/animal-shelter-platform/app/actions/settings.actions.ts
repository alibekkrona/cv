"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { saveContactSettings } from "@/lib/services/contact-settings.service";
import { saveDonationSettings } from "@/lib/services/donation-settings.service";
import { saveVisitHours, saveWalkingHours, weekdays } from "@/lib/services/visit-hours.service";
import { contactSettingsFormSchema } from "@/lib/validation/contact-settings.schema";

export async function saveContactSettingsAction(formData: FormData) {
  await requirePermission("settings.manage");

  const parsed = contactSettingsFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Проверьте данные настроек.";
    throw new Error(firstError);
  }

  await saveContactSettings(parsed.data);

  revalidatePath("/contacts");
  revalidatePath("/admin/settings");

  redirect("/admin/settings?saved=1");
}

export async function saveVisitHoursAction(formData: FormData) {
  await requirePermission("settings.manage");

  await saveVisitHours(
    weekdays.map(({ dayOfWeek }) => ({
      closesAt: String(formData.get(`closesAt-${dayOfWeek}`) ?? "16:00"),
      dayOfWeek,
      isEnabled: formData.get(`isEnabled-${dayOfWeek}`) === "on",
      opensAt: String(formData.get(`opensAt-${dayOfWeek}`) ?? "12:00")
    }))
  );

  revalidatePath("/admin/settings");
  revalidatePath("/animals");

  redirect("/admin/settings?visitHoursSaved=1");
}

export async function saveWalkingHoursAction(formData: FormData) {
  await requirePermission("settings.manage");

  await saveWalkingHours(
    weekdays.map(({ dayOfWeek }) => ({
      closesAt: String(formData.get(`walkingClosesAt-${dayOfWeek}`) ?? "13:00"),
      dayOfWeek,
      isEnabled: formData.get(`walkingIsEnabled-${dayOfWeek}`) === "on",
      opensAt: String(formData.get(`walkingOpensAt-${dayOfWeek}`) ?? "10:00")
    }))
  );

  revalidatePath("/admin/settings");
  revalidatePath("/animals");

  redirect("/admin/settings?walkingHoursSaved=1");
}

export async function saveDonationSettingsAction(formData: FormData) {
  await requirePermission("super.manage");

  await saveDonationSettings({
    publicDonationsEnabled: formData.get("publicDonationsEnabled") === "true"
  });

  revalidatePath("/");
  revalidatePath("/animals");
  revalidatePath("/needs");
  revalidatePath("/help");
  revalidatePath("/admin/settings");

  redirect("/admin/settings?donationSettingsSaved=1");
}
