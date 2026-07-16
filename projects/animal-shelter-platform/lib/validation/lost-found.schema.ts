import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

export const lostFoundReportSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["LOST", "FOUND"]),
  status: z.enum(["SUBMITTED", "PUBLISHED", "MATCHED", "CLOSED", "ARCHIVED"]).optional(),
  species: z.enum(["DOG", "CAT", "OTHER"]),
  sex: z.enum(["MALE", "FEMALE", "UNKNOWN"]),
  size: z.enum(["SMALL", "MEDIUM", "LARGE", "UNKNOWN"]).optional().or(z.literal("")),
  title: z.string().trim().min(1),
  slug: optionalText,
  description: z.string().trim().min(1),
  cityId: optionalText,
  city: optionalText,
  district: optionalText,
  locationText: optionalText,
  eventDate: optionalText,
  contactName: z.string().trim().min(1),
  contactPhone: z.string().trim().min(1),
  contactEmail: optionalText,
  adminNote: optionalText,
  photosJson: optionalText
});

export type LostFoundReportInput = z.infer<typeof lostFoundReportSchema>;
