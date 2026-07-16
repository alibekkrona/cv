import { z } from "zod";

const optionalId = z.preprocess((value) => (
  value === "" || value === null || value === undefined ? undefined : value
), z.coerce.number().int().positive().optional());

export const needFormSchema = z.object({
  animalId: optionalId,
  description: z.string().trim().min(10),
  id: z.coerce.number().int().positive().optional(),
  isUrgent: z.coerce.boolean().default(false),
  photosJson: z.string().optional(),
  priority: z.coerce.number().int().default(0),
  publishedAt: z.string().optional(),
  raisedAmount: z.coerce.number().min(0).default(0),
  scope: z.enum(["SHELTER", "ANIMAL"]),
  slug: z.string().trim().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "FUNDED", "FULFILLED", "PAUSED", "ANIMAL_ADOPTED", "ARCHIVED"]).default("ACTIVE"),
  targetAmount: z.coerce.number().min(1),
  title: z.string().trim().min(3).max(160)
});

export const needAuditFormSchema = z.object({
  description: z.string().trim().min(10),
  id: z.coerce.number().int().positive().optional(),
  needId: z.coerce.number().int().positive(),
  photosJson: z.string().optional(),
  publishedAt: z.string().optional(),
  title: z.string().trim().min(3).max(160)
});

export type NeedFormInput = z.infer<typeof needFormSchema>;
export type NeedAuditFormInput = z.infer<typeof needAuditFormSchema>;
