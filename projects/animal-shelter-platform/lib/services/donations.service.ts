import type { Prisma } from "@prisma/client";
import {
  deleteNeedById,
  findAdminDonations,
  findAdminDonationsPage,
  findAdminNeedAuditsPage,
  findAdminNeedById,
  findAdminNeeds,
  findAdminNeedsPage,
  findNeedAuditSnapshotById,
  findNeedStatusById,
  findNeedSlugConflict,
  findPublicNeedBySlug,
  findPublicNeeds,
  findPublicNeedsPage,
  findRecentPublicDonations,
  getDonationStats,
  insertDonation,
  insertDonationWithPayment,
  insertNeed,
  markNeedFulfilled,
  updateNeedById,
  upsertNeedAuditByNeedId
} from "@/lib/repositories/donations.repository";
import { recordAdminAuditLog } from "@/lib/services/admin-audit.service";
import { normalizeSlug } from "@/lib/utils/slug";
import type { AdminDonationFormInput, DonationFormInput } from "@/lib/validation/donations.schema";
import type { NeedAuditFormInput, NeedFormInput } from "@/lib/validation/need.schema";

export const donationAmounts = [100, 300, 500, 1000];

export function formatMoney(cents: number) {
  return `${new Intl.NumberFormat("uk-UA").format(Math.round(cents / 100))} грн`;
}

export function getNeedProgress(raisedCents: number, targetCents: number) {
  if (!targetCents) {
    return 0;
  }

  return Math.min(100, Math.round((raisedCents / targetCents) * 100));
}

export async function listPublicNeeds(options: Parameters<typeof findPublicNeeds>[0] = {}) {
  return findPublicNeeds(options);
}

export async function listPublicNeedsPage(options: Parameters<typeof findPublicNeedsPage>[0] = {}) {
  return findPublicNeedsPage(options);
}

export async function getPublicNeedBySlug(slug: string) {
  return findPublicNeedBySlug(slug);
}

export async function listAdminNeeds(filters: Parameters<typeof findAdminNeeds>[0] = {}) {
  return findAdminNeeds(filters);
}

export async function listAdminNeedsPage(filters: Parameters<typeof findAdminNeedsPage>[0] = {}) {
  return findAdminNeedsPage(filters);
}

export async function getAdminNeedById(id: number) {
  if (!Number.isInteger(id)) {
    return null;
  }

  return findAdminNeedById(id);
}

export async function createNeed(input: NeedFormInput, actorUserId?: number) {
  const slug = await resolveNeedSlug(input);
  const need = await insertNeed({
    ...buildNeedCreateData(input, slug),
    createdBy: actorUserId ? { connect: { id: actorUserId } } : undefined,
    updatedBy: actorUserId ? { connect: { id: actorUserId } } : undefined
  });

  await recordAdminAuditLog({
    action: "NEED_CREATED",
    actorUserId,
    after: toAuditJson(need),
    entityId: need.id,
    entityType: "Need"
  });

  return need;
}

export async function updateNeed(id: number, input: NeedFormInput, actorUserId?: number) {
  const slug = await resolveNeedSlug(input, id);
  const [currentNeed, before] = await Promise.all([
    findNeedStatusById(id),
    findNeedAuditSnapshotById(id)
  ]);
  const statusChanged = Boolean(currentNeed && currentNeed.status !== input.status);

  const need = await updateNeedById(id, {
    ...buildNeedUpdateData(input, slug),
    statusChangedAt: statusChanged ? new Date() : undefined,
    statusChangedBy: statusChanged && actorUserId ? { connect: { id: actorUserId } } : undefined,
    updatedBy: actorUserId ? { connect: { id: actorUserId } } : undefined
  });

  await recordAdminAuditLog({
    action: "NEED_UPDATED",
    actorUserId,
    after: toAuditJson(need),
    before: toAuditJson(before),
    entityId: id,
    entityType: "Need"
  });

  if (statusChanged) {
    await recordAdminAuditLog({
      action: "NEED_STATUS_CHANGED",
      actorUserId,
      after: { status: input.status },
      before: { status: currentNeed?.status ?? null },
      entityId: id,
      entityType: "Need"
    });
  }

  return need;
}

export async function saveNeedAudit(input: NeedAuditFormInput, actorUserId?: number) {
  const beforeNeed = await findNeedStatusById(input.needId);
  const { audit, created } = await upsertNeedAuditByNeedId(input.needId, buildNeedAuditCreateData(input, actorUserId));
  await markNeedFulfilled(input.needId, actorUserId);
  await recordAdminAuditLog({
    action: created ? "NEED_AUDIT_CREATED" : "NEED_AUDIT_UPDATED",
    actorUserId,
    after: toAuditJson(audit),
    entityId: audit.id,
    entityType: "NeedAudit"
  });
  if (beforeNeed?.status !== "FULFILLED") {
    await recordAdminAuditLog({
      action: "NEED_STATUS_CHANGED",
      actorUserId,
      after: { status: "FULFILLED" },
      before: { status: beforeNeed?.status ?? null },
      entityId: input.needId,
      entityType: "Need"
    });
  }
  return audit;
}

export async function deleteNeed(id: number) {
  return deleteNeedById(id);
}

export async function createDonation(input: DonationFormInput | AdminDonationFormInput) {
  return insertDonation(buildDonationCreateData(input));
}

export async function createDonationPayment(input: DonationFormInput) {
  return insertDonationWithPayment(
    {
      ...buildDonationCreateData(input),
      method: "CARD",
      status: "PLEDGED"
    },
    input.paymentProvider
  );
}

export async function listAdminDonations(filters: Parameters<typeof findAdminDonations>[0] = {}) {
  return findAdminDonations(filters);
}

export async function listAdminDonationsPage(filters: Parameters<typeof findAdminDonationsPage>[0] = {}) {
  return findAdminDonationsPage(filters);
}

export async function listAdminNeedAuditsPage(filters: Parameters<typeof findAdminNeedAuditsPage>[0] = {}) {
  return findAdminNeedAuditsPage(filters);
}

export async function listRecentDonations(limit?: number) {
  return findRecentPublicDonations(limit);
}

export async function getPublicDonationStats() {
  return getDonationStats();
}

async function resolveNeedSlug(input: NeedFormInput, excludeId?: number) {
  const baseSlug = normalizeSlug(input.slug || input.title);
  let slug = baseSlug;
  let suffix = 2;

  while (await findNeedSlugConflict(slug, excludeId)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function buildNeedCreateData(input: NeedFormInput, slug: string): Prisma.NeedCreateInput {
  return {
    animal: input.scope === "ANIMAL" && input.animalId ? { connect: { id: input.animalId } } : undefined,
    description: input.description,
    isUrgent: input.isUrgent,
    photos: { create: buildPhotoInputs(input) },
    priority: input.priority,
    publishedAt: parseDate(input.publishedAt) ?? (["ACTIVE", "FUNDED", "FULFILLED"].includes(input.status) ? new Date() : null),
    raisedCents: toCents(input.raisedAmount),
    scope: input.scope,
    slug,
    status: input.status,
    targetCents: toCents(input.targetAmount),
    title: input.title
  };
}

function buildNeedUpdateData(input: NeedFormInput, slug: string): Prisma.NeedUpdateInput {
  return {
    ...buildNeedCreateData(input, slug),
    animal: input.scope === "ANIMAL" && input.animalId ? { connect: { id: input.animalId } } : { disconnect: true },
    photos: {
      deleteMany: {},
      create: buildPhotoInputs(input)
    }
  };
}

function buildDonationCreateData(input: DonationFormInput | AdminDonationFormInput): Prisma.DonationCreateInput {
  return {
    adminNote: "adminNote" in input ? input.adminNote || null : null,
    amountCents: toCents(input.amount),
    animal: input.target === "ANIMAL" && input.animalId ? { connect: { id: input.animalId } } : undefined,
    donorEmail: input.donorEmail || null,
    donorName: input.donorName || null,
    donorPhone: input.donorPhone || null,
    isAnonymous: input.isAnonymous,
    message: input.message || null,
    method: input.method,
    need: input.target === "NEED" && input.needId ? { connect: { id: input.needId } } : undefined,
    publicConsent: input.publicConsent,
    status: "status" in input ? input.status : "PLEDGED",
    target: input.target
  };
}

function buildNeedAuditCreateData(input: NeedAuditFormInput, actorUserId?: number): Prisma.NeedAuditCreateInput {
  return {
    createdBy: actorUserId ? { connect: { id: actorUserId } } : undefined,
    description: input.description,
    need: { connect: { id: input.needId } },
    photos: {
      create: buildPhotoInputs({
        photosJson: input.photosJson,
        title: input.title
      })
    },
    publishedAt: parseDate(input.publishedAt) ?? new Date(),
    title: input.title
  };
}

function buildPhotoInputs(input: Pick<NeedFormInput, "photosJson" | "title">): Array<Prisma.NeedPhotoCreateWithoutNeedInput | Prisma.NeedAuditPhotoCreateWithoutAuditInput> {
  const photos = parseManagedPhotos(input.photosJson);
  const coverIndex = photos.findIndex((photo) => photo.isCover);
  const normalizedCoverIndex = coverIndex >= 0 ? coverIndex : 0;

  return photos.map((photo, index) => ({
    alt: photo.alt || `${input.title} фото ${index + 1}`,
    isCover: index === normalizedCoverIndex,
    position: index,
    url: photo.url
  }));
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

    const seen = new Set<string>();

    return parsed
      .map((item) => normalizeManagedPhoto(item))
      .filter((photo): photo is ManagedPhotoInput => {
        if (!photo || seen.has(photo.url)) {
          return false;
        }

        seen.add(photo.url);
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
    alt: typeof photo.alt === "string" ? photo.alt.trim() : undefined,
    isCover: photo.isCover === true,
    url
  };
}

function parseDate(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toCents(amount: number) {
  return Math.round(amount * 100);
}

function toAuditJson(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null));
}
