import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().email().optional()
);

const checkboxBoolean = z.preprocess((value) => value === "on" || value === true, z.boolean()).optional();

export const applicationTypeSchema = z.enum([
  "ADOPTION",
  "ACQUAINTANCE",
  "VISIT",
  "WALKING",
  "GUARDIANSHIP",
  "VOLUNTEERING",
  "OTHER"
]).default("ADOPTION");

export const adoptionApplicationSchema = z.object({
  animalId: z.coerce.number().int().positive().optional(),
  type: applicationTypeSchema,
  applicantName: z.string().trim().min(2, "Имя должно быть не короче 2 символов."),
  phone: z.string().trim().min(5, "Телефон должен быть не короче 5 символов."),
  email: optionalEmail,
  messenger: optionalText,
  cityId: optionalText,
  city: optionalText,
  housingType: optionalText,
  hasChildren: checkboxBoolean,
  hasAnimals: checkboxBoolean,
  message: optionalText
});

export type AdoptionApplicationFormInput = z.infer<typeof adoptionApplicationSchema>;
