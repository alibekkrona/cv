import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

const optionalUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().url("Укажите корректную ссылку.").optional()
);

export const contactSettingsFormSchema = z.object({
  address: optionalText,
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().email("Укажите корректный email.").optional()
  ),
  facebook: optionalUrl,
  officialSiteUrl: optionalUrl,
  phone: optionalText,
  schedule: optionalText,
  telegram: optionalText
});

export type ContactSettingsFormInput = z.infer<typeof contactSettingsFormSchema>;
