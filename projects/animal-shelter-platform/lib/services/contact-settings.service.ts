import {
  findContactSettings,
  upsertContactSettings
} from "@/lib/repositories/contact-settings.repository";
import type { ContactSettingsFormInput } from "@/lib/validation/contact-settings.schema";

export async function getContactSettings() {
  return findContactSettings();
}

export async function saveContactSettings(input: ContactSettingsFormInput) {
  return upsertContactSettings({
    address: input.address ?? null,
    email: input.email ?? null,
    facebook: input.facebook ?? null,
    officialSiteUrl: input.officialSiteUrl ?? null,
    phone: input.phone ?? null,
    schedule: input.schedule ?? null,
    telegram: input.telegram ?? null
  });
}
