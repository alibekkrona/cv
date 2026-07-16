"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { saveActiveDesignTheme } from "@/lib/services/design-settings.service";

export async function saveDesignThemeAction(formData: FormData) {
  await requirePermission("design.manage");

  const themeId = String(formData.get("themeId") ?? "");
  await saveActiveDesignTheme(themeId);

  revalidatePath("/", "layout");
  revalidatePath("/admin/design");

  redirect("/admin/design?saved=1");
}
