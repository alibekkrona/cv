import { z } from "zod";

const optionalId = z.preprocess((value) => (
  value === "" || value === null || value === undefined ? undefined : value
), z.coerce.number().int().positive().optional());

export const donationFormSchema = z.object({
  amount: z.coerce.number().min(10, "Минимальная сумма доната 10 грн."),
  animalId: optionalId,
  donorEmail: z.string().email().optional().or(z.literal("")),
  donorName: z.string().trim().max(120).optional(),
  donorPhone: z.string().trim().max(80).optional(),
  isAnonymous: z.coerce.boolean().default(false),
  message: z.string().trim().max(1000).optional(),
  method: z.enum(["CARD", "INVOICE"]).default("CARD"),
  needId: optionalId,
  paymentProvider: z.enum(["LIQPAY", "MONOBANK"]).default("LIQPAY"),
  publicConsent: z.coerce.boolean().default(true),
  target: z.enum(["SHELTER", "ANIMAL", "NEED"])
});

export const adminDonationFormSchema = donationFormSchema.extend({
  adminNote: z.string().trim().max(2000).optional(),
  status: z.enum(["PLEDGED", "PAID", "CANCELLED"]).default("PLEDGED")
});

export type DonationFormInput = z.infer<typeof donationFormSchema>;
export type AdminDonationFormInput = z.infer<typeof adminDonationFormSchema>;
