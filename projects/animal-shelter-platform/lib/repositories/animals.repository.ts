import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildAnimalSearchWhere } from "@/lib/search/animal-search";
import type { AdminAnimalFiltersInput, AnimalFiltersInput } from "@/lib/types/animal";

export async function findAvailableAnimals(filters: AnimalFiltersInput = {}) {
  const where = buildAvailableAnimalWhere(filters);

  return prisma.animal.findMany({
    where,
    take: filters.limit,
    orderBy: getAnimalSort(filters.sort),
    select: animalListSelect
  });
}

export async function findAvailableAnimalSuggestionNames(query: string, limit = 5) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const animals = await prisma.animal.findMany({
    where: {
      status: "AVAILABLE",
      publishedAt: { not: null },
      OR: [
        { name: { contains: normalizedQuery } },
        { searchText: { contains: normalizedQuery } }
      ]
    },
    orderBy: { publishedAt: "desc" },
    select: { name: true },
    take: limit
  });

  return animals.map((animal) => animal.name);
}

export async function findAvailableAnimalsPage(filters: AnimalFiltersInput = {}) {
  const where = buildAvailableAnimalWhere(filters);
  const pageSize = filters.pageSize ?? 24;
  const requestedPage = filters.page ?? 1;
  const requestedSkip = (Math.max(requestedPage, 1) - 1) * pageSize;
  const [total, requestedItems] = await Promise.all([
    prisma.animal.count({ where }),
    prisma.animal.findMany({
      where,
      skip: requestedSkip,
      take: pageSize,
      orderBy: getAnimalSort(filters.sort),
      select: animalListSelect
    })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  const items = page === requestedPage
    ? requestedItems
    : await prisma.animal.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: getAnimalSort(filters.sort),
        select: animalListSelect
      });

  return {
    items,
    page,
    pageSize,
    total,
    totalPages
  };
}

function buildAvailableAnimalWhere(filters: AnimalFiltersInput = {}): Prisma.AnimalWhereInput {
  const where: Prisma.AnimalWhereInput = {
    status: "AVAILABLE",
    publishedAt: {
      not: null
    }
  };

  if (filters.species) {
    where.species = filters.species as Prisma.AnimalWhereInput["species"];
  }

  if (filters.sex) {
    where.sex = filters.sex as Prisma.AnimalWhereInput["sex"];
  }

  if (filters.size) {
    where.size = filters.size as Prisma.AnimalWhereInput["size"];
  }

  if (filters.sterilized) {
    where.sterilized = true;
  }

  if (filters.vaccinated) {
    where.vaccinated = true;
  }

  if (filters.coat) {
    where.coat = filters.coat;
  }

  if (filters.color) {
    where.color = filters.color;
  }

  const searchWhere = buildAnimalSearchWhere(filters.query);
  Object.assign(where, searchWhere);

  return where;
}

function getAnimalSort(sort: AnimalFiltersInput["sort"]): Prisma.AnimalOrderByWithRelationInput[] {
  switch (sort) {
    case "name":
      return [{ name: "asc" }];
    case "age-young":
      return [{ ageMonths: "asc" }, { publishedAt: "desc" }];
    case "age-old":
      return [{ ageMonths: "desc" }, { publishedAt: "desc" }];
    case "newest":
    default:
      return [{ publishedAt: "desc" }, { createdAt: "desc" }];
  }
}

export async function findAnimalBySlug(slug: string) {
  return prisma.animal.findUnique({
    where: { slug },
    include: {
      photos: {
        orderBy: { position: "asc" }
      },
      tags: {
        include: {
          tag: true
        }
      }
    }
  });
}

export async function findAnimalSpeciesById(id: number) {
  return prisma.animal.findUnique({
    where: { id },
    select: {
      id: true,
      species: true
    }
  });
}

export async function findAnimalsForAdmin() {
  return prisma.animal.findMany({
    orderBy: { updatedAt: "desc" },
    select: animalAdminSelect
  });
}

export async function findAnimalsAdminPage(filters: AdminAnimalFiltersInput = {}) {
  const where = buildAdminAnimalWhere(filters);
  const pageSize = filters.pageSize ?? 25;
  const requestedPage = filters.page ?? 1;
  const requestedSkip = (Math.max(requestedPage, 1) - 1) * pageSize;
  const [total, requestedItems] = await Promise.all([
    prisma.animal.count({ where }),
    prisma.animal.findMany({
      where,
      skip: requestedSkip,
      take: pageSize,
      orderBy: getAdminAnimalSort(filters.sort),
      select: animalAdminSelect
    })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  const items = page === requestedPage
    ? requestedItems
    : await prisma.animal.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: getAdminAnimalSort(filters.sort),
        select: animalAdminSelect
      });

  return {
    items,
    page,
    pageSize,
    total,
    totalPages
  };
}

export async function findAnimalForAdmin(id: number) {
  return prisma.animal.findUnique({
    where: { id },
    select: animalAdminSelect
  });
}

export async function findAnimalAuditSnapshotById(id: number) {
  return prisma.animal.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      species: true,
      status: true,
      publishedAt: true,
      updatedAt: true
    }
  });
}

function buildAdminAnimalWhere(filters: AdminAnimalFiltersInput = {}): Prisma.AnimalWhereInput {
  const where: Prisma.AnimalWhereInput = {};
  const query = filters.query?.trim();

  if (filters.species) {
    where.species = filters.species as Prisma.AnimalWhereInput["species"];
  }

  if (filters.status) {
    where.status = filters.status as Prisma.AnimalWhereInput["status"];
  }

  if (filters.photos === "with") {
    where.photos = { some: {} };
  }

  if (filters.photos === "without") {
    where.photos = { none: {} };
  }

  if (query) {
    where.OR = [
      { name: { contains: query } },
      { slug: { contains: query } },
      { breed: { contains: query } },
      { color: { contains: query } },
      { cardNumber: { contains: query } },
      { aviaryNumber: { contains: query } },
      { description: { contains: query } }
    ];
  }

  return where;
}

function getAdminAnimalSort(sort: AdminAnimalFiltersInput["sort"]): Prisma.AnimalOrderByWithRelationInput[] {
  switch (sort) {
    case "name":
      return [{ name: "asc" }];
    case "created":
      return [{ createdAt: "desc" }];
    case "updated":
    default:
      return [{ updatedAt: "desc" }];
  }
}

export async function findAnimalSlugConflict(slug: string, excludeId?: number) {
  return prisma.animal.findFirst({
    where: {
      slug,
      id: excludeId ? { not: excludeId } : undefined
    },
    select: {
      id: true
    }
  });
}

export async function insertAnimal(data: Prisma.AnimalCreateInput) {
  return prisma.animal.create({ data });
}

export async function updateAnimalById(id: number, data: Prisma.AnimalUpdateInput) {
  return prisma.animal.update({
    where: { id },
    data
  });
}

const animalListSelect = {
  id: true,
  slug: true,
  name: true,
  species: true,
  sex: true,
  ageMonths: true,
  ageText: true,
  size: true,
  status: true,
  description: true,
  photos: {
    orderBy: [{ isCover: "desc" }, { position: "asc" }],
    take: 1,
    select: {
      url: true,
      alt: true,
      isCover: true
    }
  }
} satisfies Prisma.AnimalSelect;

const animalAdminSelect = {
  ...animalListSelect,
  photos: {
    orderBy: [{ isCover: "desc" }, { position: "asc" }],
    select: {
      url: true,
      alt: true,
      isCover: true
    }
  },
  ageMonths: true,
  ageText: true,
  size: true,
  breed: true,
  color: true,
  coat: true,
  cardNumber: true,
  aviaryNumber: true,
  arrivalDate: true,
  statusDate: true,
  videoUrl: true,
  healthStatus: true,
  sterilized: true,
  vaccinated: true,
  description: true,
  story: true,
  publishedAt: true,
  goodWithChildren: true,
  goodWithElderly: true,
  goodWithAnimals: true,
  apartmentFriendly: true,
  needsExperiencedOwner: true,
  needsSpecialCare: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      comments: true,
      likes: true,
      photos: true,
      views: true
    }
  }
} satisfies Prisma.AnimalSelect;
