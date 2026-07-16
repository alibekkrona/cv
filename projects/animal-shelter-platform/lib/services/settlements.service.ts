import "server-only";

import {
  findActiveSettlementsByRegionSlug,
  findDefaultSettlementBySlug
} from "@/lib/repositories/settlements.repository";

export const DEFAULT_REGION_SLUG = "kharkiv-oblast";
export const DEFAULT_CITY_SLUG = "kharkiv";

export type SettlementOption = Awaited<ReturnType<typeof listKharkivRegionSettlements>>[number];

export async function listKharkivRegionSettlements() {
  const settlements = await findActiveSettlementsByRegionSlug(DEFAULT_REGION_SLUG);

  return settlements.toSorted((first, second) => {
    if (first.slug === DEFAULT_CITY_SLUG) {
      return -1;
    }

    if (second.slug === DEFAULT_CITY_SLUG) {
      return 1;
    }

    return first.name.localeCompare(second.name, "ru");
  });
}

export async function getDefaultLostFoundSettlement() {
  return findDefaultSettlementBySlug(DEFAULT_CITY_SLUG);
}
