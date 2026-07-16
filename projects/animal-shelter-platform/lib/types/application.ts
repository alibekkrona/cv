export type AdoptionApplicationInput = {
  animalId?: number;
  type?: "ADOPTION" | "ACQUAINTANCE" | "VISIT" | "WALKING" | "GUARDIANSHIP" | "VOLUNTEERING" | "OTHER";
  applicantName: string;
  phone: string;
  email?: string;
  messenger?: string;
  city?: string;
  message?: string;
};
