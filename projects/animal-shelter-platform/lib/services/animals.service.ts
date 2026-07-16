import type { Prisma } from "@prisma/client";
import {
  findAnimalBySlug,
  findAnimalAuditSnapshotById,
  findAnimalForAdmin,
  findAnimalSlugConflict,
  findAvailableAnimalSuggestionNames,
  findAnimalsAdminPage,
  findAvailableAnimalsPage,
  findAnimalsForAdmin,
  findAvailableAnimals,
  insertAnimal,
  updateAnimalById
} from "@/lib/repositories/animals.repository";
import { recordAdminAuditLog } from "@/lib/services/admin-audit.service";
import type { AdminAnimalFiltersInput, AnimalFiltersInput } from "@/lib/types/animal";
import { buildAnimalSearchText, getAnimalSearchSuggestions } from "@/lib/search/animal-search";
import { normalizeSlug } from "@/lib/utils/slug";
import type { AnimalFormInput } from "@/lib/validation/animal.schema";

export async function listAvailableAnimals(filters: AnimalFiltersInput) {
  return findAvailableAnimals(filters);
}

export async function getPublicAnimalSearchSuggestions(query: string) {
  const normalizedQuery = query.trim();
  const defaultSuggestions = getAnimalSearchSuggestions(normalizedQuery);
  const animalSuggestions = await findAvailableAnimalSuggestionNames(normalizedQuery);
  const labels = [...animalSuggestions, ...defaultSuggestions];

  return [...new Set(labels)].slice(0, 10).map((label) => ({ label }));
}

export async function listAvailableAnimalsPage(filters: AnimalFiltersInput) {
  return findAvailableAnimalsPage(filters);
}

export async function getAnimalBySlug(slug: string) {
  return findAnimalBySlug(slug);
}

export async function listAnimalsForAdmin() {
  return findAnimalsForAdmin();
}

export async function listAnimalsAdminPage(filters: AdminAnimalFiltersInput = {}) {
  return findAnimalsAdminPage(filters);
}

export async function getAnimalForAdmin(id: number) {
  if (!Number.isInteger(id)) {
    return null;
  }

  return findAnimalForAdmin(id);
}

export async function createAnimal(input: AnimalFormInput, actorUserId?: number) {
  const slug = await resolveAnimalSlug(input);
  const animal = await insertAnimal({
    ...buildAnimalCreateData(input, slug),
    createdBy: actorUserId ? { connect: { id: actorUserId } } : undefined,
    updatedBy: actorUserId ? { connect: { id: actorUserId } } : undefined
  });

  await recordAdminAuditLog({
    action: "ANIMAL_CREATED",
    actorUserId,
    after: toAuditJson(animal),
    entityId: animal.id,
    entityType: "Animal"
  });

  return animal;
}

export async function updateAnimal(id: number, input: AnimalFormInput, actorUserId?: number) {
  const slug = await resolveAnimalSlug(input, id);
  const before = await findAnimalAuditSnapshotById(id);
  const animal = await updateAnimalById(id, {
    ...buildAnimalUpdateData(input, slug),
    updatedBy: actorUserId ? { connect: { id: actorUserId } } : undefined
  });

  await recordAdminAuditLog({
    action: "ANIMAL_UPDATED",
    actorUserId,
    after: toAuditJson(animal),
    before: toAuditJson(before),
    entityId: id,
    entityType: "Animal"
  });

  return animal;
}

async function resolveAnimalSlug(input: AnimalFormInput, excludeId?: number) {
  const baseSlug = normalizeSlug(input.slug || input.name);
  let slug = baseSlug;
  let suffix = 2;

  while (await findAnimalSlugConflict(slug, excludeId)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function buildAnimalCreateData(input: AnimalFormInput, slug: string): Prisma.AnimalCreateInput {
  return {
    name: input.name,
    slug,
    species: input.species,
    sex: input.sex,
    ageMonths: input.ageMonths ?? null,
    ageText: input.ageText ?? null,
    size: input.size || null,
    breed: input.breed ?? null,
    color: input.color ?? null,
    coat: input.coat ?? null,
    cardNumber: input.cardNumber ?? null,
    aviaryNumber: input.aviaryNumber ?? null,
    arrivalDate: input.arrivalDate ?? null,
    statusDate: input.statusDate ?? null,
    videoUrl: input.videoUrl ?? null,
    healthStatus: input.healthStatus ?? null,
    sterilized: input.sterilized,
    vaccinated: input.vaccinated,
    status: input.status,
    publishedAt: input.publishedAt ?? (input.status === "AVAILABLE" ? new Date() : null),
    goodWithChildren: input.goodWithChildren,
    goodWithElderly: input.goodWithElderly,
    goodWithAnimals: input.goodWithAnimals,
    apartmentFriendly: input.apartmentFriendly,
    needsExperiencedOwner: input.needsExperiencedOwner,
    needsSpecialCare: input.needsSpecialCare,
    description: input.description ?? null,
    story: input.story ?? null,
    searchText: buildAnimalSearchText(input, slug),
    photos: {
      create: buildPhotoInputs(input)
    }
  };
}

function buildAnimalUpdateData(input: AnimalFormInput, slug: string): Prisma.AnimalUpdateInput {
  return {
    ...buildAnimalCreateData(input, slug),
    photos: {
      deleteMany: {},
      create: buildPhotoInputs(input)
    }
  };
}

function buildPhotoInputs(input: AnimalFormInput): Prisma.AnimalPhotoCreateWithoutAnimalInput[] {
  const managedPhotos = parseManagedPhotos(input.photosJson);

  if (managedPhotos.length) {
    const coverIndex = managedPhotos.findIndex((photo) => photo.isCover);
    const normalizedCoverIndex = coverIndex >= 0 ? coverIndex : 0;

    return managedPhotos.map((photo, index) => ({
      url: photo.url,
      alt: photo.alt || `${input.name} photo${index ? ` ${index + 1}` : ""}`,
      isCover: index === normalizedCoverIndex,
      position: index
    }));
  }

  const photos: Prisma.AnimalPhotoCreateWithoutAnimalInput[] = [];

  if (input.coverPhotoUrl) {
    photos.push({
      url: input.coverPhotoUrl,
      alt: input.coverPhotoAlt || `${input.name} photo`,
      isCover: true,
      position: 0
    });
  }

  const extraUrls = input.extraPhotoUrls
    ?.split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean) ?? [];

  extraUrls.forEach((url, index) => {
    photos.push({
      url,
      alt: `${input.name} photo ${index + 2}`,
      isCover: !input.coverPhotoUrl && index === 0,
      position: index + 1
    });
  });

  return photos;
}

type ManagedPhotoInput = {
  alt?: string;
  isCover?: boolean;
  url: string;
};

function parseManagedPhotos(value?: string): ManagedPhotoInput[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    const seenUrls = new Set<string>();

    return parsed
      .map((photo) => normalizeManagedPhoto(photo))
      .filter((photo): photo is ManagedPhotoInput => {
        if (!photo || seenUrls.has(photo.url)) {
          return false;
        }

        seenUrls.add(photo.url);
        return true;
      });
  } catch {
    return [];
  }
}

function normalizeManagedPhoto(value: unknown): ManagedPhotoInput | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const photo = value as Record<string, unknown>;
  const url = typeof photo.url === "string" ? photo.url.trim() : "";

  if (!url) {
    return null;
  }

  return {
    url,
    alt: typeof photo.alt === "string" && photo.alt.trim() ? photo.alt.trim() : undefined,
    isCover: photo.isCover === true
  };
}

function toAuditJson(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null));
}
