import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

const optionalNumber = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.coerce.number().int().min(0).optional()
);

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.coerce.date().optional()
);

const checkboxBoolean = z.preprocess((value) => value === "on" || value === true, z.boolean());

export const animalFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  slug: optionalText,
  species: z.enum(["DOG", "CAT", "OTHER"]),
  sex: z.enum(["MALE", "FEMALE", "UNKNOWN"]),
  ageMonths: optionalNumber,
  ageText: optionalText,
  size: z.enum(["SMALL", "MEDIUM", "LARGE"]).optional().or(z.literal("")),
  breed: optionalText,
  color: optionalText,
  coat: optionalText,
  cardNumber: optionalText,
  aviaryNumber: optionalText,
  arrivalDate: optionalDate,
  publishedAt: optionalDate,
  statusDate: optionalDate,
  videoUrl: optionalText,
  healthStatus: optionalText,
  sterilized: checkboxBoolean,
  vaccinated: checkboxBoolean,
  status: z.enum(["DRAFT", "AVAILABLE", "RESERVED", "ADOPTED", "TREATMENT", "HIDDEN"]),
  goodWithChildren: checkboxBoolean,
  goodWithElderly: checkboxBoolean,
  goodWithAnimals: checkboxBoolean,
  apartmentFriendly: checkboxBoolean,
  needsExperiencedOwner: checkboxBoolean,
  needsSpecialCare: checkboxBoolean,
  description: optionalText,
  story: optionalText,
  coverPhotoUrl: optionalText,
  coverPhotoAlt: optionalText,
  extraPhotoUrls: optionalText,
  photosJson: optionalText
});

export type AnimalFormInput = z.infer<typeof animalFormSchema>;
