import type { LostFoundStatus, LostFoundType, Prisma, Species } from "@prisma/client";
import {
  findLostFoundReportBySlug,
  findLostFoundAuditSnapshotById,
  findLostFoundReportForAdmin,
  findLostFoundReportsForAdmin,
  findLostFoundReportsForAdminPage,
  findLostFoundSlugConflict,
  findPublishedLostFoundReports,
  findPublishedLostFoundReportsPage,
  insertLostFoundReport,
  updateLostFoundReportById
} from "@/lib/repositories/lost-found.repository";
import { recordAdminAuditLog } from "@/lib/services/admin-audit.service";
import type { LostFoundFilters } from "@/lib/repositories/lost-found.repository";
import { normalizeSlug } from "@/lib/utils/slug";
import type { LostFoundReportInput } from "@/lib/validation/lost-found.schema";

export async function listPublishedLostFoundReports(filters: Omit<LostFoundFilters, "status"> = {}) {
  return findPublishedLostFoundReports(filters);
}

export async function listPublishedLostFoundReportsPage(filters: Omit<LostFoundFilters, "status"> = {}) {
  return findPublishedLostFoundReportsPage(filters);
}

export async function getPublishedLostFoundReport(slug: string) {
  return findLostFoundReportBySlug(slug);
}

export async function listLostFoundReportsForAdmin(filters: LostFoundFilters = {}) {
  return findLostFoundReportsForAdmin(filters);
}

export async function listLostFoundReportsForAdminPage(filters: LostFoundFilters = {}) {
  return findLostFoundReportsForAdminPage(filters);
}

export async function getLostFoundReportForAdmin(id: number) {
  if (!Number.isInteger(id)) {
    return null;
  }

  return findLostFoundReportForAdmin(id);
}

export async function createLostFoundReport(input: LostFoundReportInput, options: { actorUserId?: number; defaultStatus?: LostFoundStatus } = {}) {
  const slug = await resolveLostFoundSlug(input);
  const status = options.defaultStatus ?? input.status ?? "SUBMITTED";
  const report = await insertLostFoundReport({
    ...buildLostFoundCreateData(input, slug, status),
    createdBy: options.actorUserId ? { connect: { id: options.actorUserId } } : undefined,
    updatedBy: options.actorUserId ? { connect: { id: options.actorUserId } } : undefined
  });

  if (options.actorUserId) {
    await recordAdminAuditLog({
      action: "LOST_FOUND_CREATED",
      actorUserId: options.actorUserId,
      after: toAuditJson(report),
      entityId: report.id,
      entityType: "LostFoundReport"
    });
  }

  return report;
}

export async function updateLostFoundReport(id: number, input: LostFoundReportInput, actorUserId?: number) {
  const slug = await resolveLostFoundSlug(input, id);
  const status = input.status ?? "SUBMITTED";
  const before = await findLostFoundAuditSnapshotById(id);
  const report = await updateLostFoundReportById(id, {
    ...buildLostFoundUpdateData(input, slug, status),
    updatedBy: actorUserId ? { connect: { id: actorUserId } } : undefined
  });

  await recordAdminAuditLog({
    action: "LOST_FOUND_UPDATED",
    actorUserId,
    after: toAuditJson(report),
    before: toAuditJson(before),
    entityId: id,
    entityType: "LostFoundReport"
  });

  return report;
}

function buildLostFoundCreateData(
  input: LostFoundReportInput,
  slug: string,
  status: LostFoundStatus
): Prisma.LostFoundReportCreateInput {
  return {
    type: input.type as LostFoundType,
    status,
    species: input.species as Species,
    sex: input.sex,
    size: input.size || null,
    title: input.title,
    slug,
    description: input.description,
    city: input.city ?? null,
    cityRef: input.cityId ? { connect: { id: Number(input.cityId) } } : undefined,
    district: input.district ?? null,
    locationText: input.locationText ?? null,
    eventDate: parseEventDate(input.eventDate),
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail ?? null,
    adminNote: input.adminNote ?? null,
    publishedAt: status === "PUBLISHED" ? new Date() : null,
    photos: {
      create: buildPhotoInputs(input)
    }
  };
}

function buildLostFoundUpdateData(
  input: LostFoundReportInput,
  slug: string,
  status: LostFoundStatus
): Prisma.LostFoundReportUpdateInput {
  return {
    ...buildLostFoundCreateData(input, slug, status),
    photos: {
      deleteMany: {},
      create: buildPhotoInputs(input)
    }
  };
}

async function resolveLostFoundSlug(input: LostFoundReportInput, excludeId?: number) {
  const baseSlug = normalizeSlug(input.slug || input.title);
  let slug = baseSlug;
  let suffix = 2;

  while (await findLostFoundSlugConflict(slug, excludeId)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function parseEventDate(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function buildPhotoInputs(input: LostFoundReportInput): Prisma.LostFoundPhotoCreateWithoutReportInput[] {
  const photos = parsePhotos(input.photosJson);
  const coverIndex = photos.findIndex((photo) => photo.isCover);
  const normalizedCoverIndex = coverIndex >= 0 ? coverIndex : 0;

  return photos.map((photo, index) => ({
    url: photo.url,
    alt: photo.alt || `${input.title} photo${index ? ` ${index + 1}` : ""}`,
    isCover: index === normalizedCoverIndex,
    position: index
  }));
}

type PhotoInput = {
  alt?: string;
  isCover?: boolean;
  url: string;
};

function parsePhotos(value?: string): PhotoInput[] {
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
      .map((photo) => normalizePhoto(photo))
      .filter((photo): photo is PhotoInput => {
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

function normalizePhoto(value: unknown): PhotoInput | null {
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
