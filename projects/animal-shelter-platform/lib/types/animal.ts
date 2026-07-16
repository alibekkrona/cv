export type AnimalFiltersInput = {
  coat?: string;
  color?: string;
  query?: string;
  species?: string;
  sex?: string;
  size?: string;
  sort?: "newest" | "name" | "age-young" | "age-old";
  sterilized?: boolean;
  vaccinated?: boolean;
  limit?: number;
  page?: number;
  pageSize?: number;
};

export type AdminAnimalFiltersInput = {
  photos?: "with" | "without";
  page?: number;
  pageSize?: number;
  query?: string;
  sort?: "updated" | "name" | "created";
  species?: string;
  status?: string;
};

export type AnimalListItem = {
  id: number;
  slug: string;
  name: string;
  species: string;
  sex: string;
  ageMonths: number | null;
  ageText: string | null;
  size: string | null;
  status: string;
  description?: string | null;
  photos?: {
    url: string;
    alt: string | null;
    isCover: boolean;
  }[];
};

export type AnimalAdminItem = AnimalListItem & {
  size: string | null;
  ageMonths: number | null;
  ageText: string | null;
  breed: string | null;
  color: string | null;
  coat: string | null;
  cardNumber: string | null;
  aviaryNumber: string | null;
  arrivalDate: Date | null;
  statusDate: Date | null;
  videoUrl: string | null;
  healthStatus: string | null;
  sterilized: boolean;
  vaccinated: boolean;
  description: string | null;
  story: string | null;
  publishedAt: Date | null;
  goodWithChildren: boolean | null;
  goodWithElderly: boolean | null;
  goodWithAnimals: boolean | null;
  apartmentFriendly: boolean | null;
  needsExperiencedOwner: boolean | null;
  needsSpecialCare: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    comments?: number;
    likes?: number;
    photos: number;
    views?: number;
  };
};
