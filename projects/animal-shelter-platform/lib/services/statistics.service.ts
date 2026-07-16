import type { Species } from "@prisma/client";
import {
  getApplicationStatistics,
  type StatisticsFilters,
  type StatisticsSnapshot
} from "@/lib/repositories/statistics.repository";

export type StatisticsSearchInput = {
  cityId?: string | string[];
  from?: string | string[];
  preset?: string | string[];
  species?: string | string[];
  to?: string | string[];
};

export type NormalizedStatisticsFilters = StatisticsFilters & {
  preset: StatisticsPreset;
};

export type StatisticsPreset = "7d" | "30d" | "current-month" | "previous-month" | "custom";

export async function getAdminStatistics(input: StatisticsSearchInput): Promise<{
  filters: NormalizedStatisticsFilters;
  snapshot: StatisticsSnapshot;
}> {
  const filters = normalizeStatisticsFilters(input);
  const snapshot = await getApplicationStatistics(filters);

  return { filters, snapshot };
}

export function normalizeStatisticsFilters(input: StatisticsSearchInput = {}): NormalizedStatisticsFilters {
  const preset = pickPreset(singleParam(input.preset));
  const today = endOfDay(new Date());
  let from: Date;
  let to: Date;

  switch (preset) {
    case "7d":
      to = today;
      from = startOfDay(addDays(today, -6));
      break;
    case "current-month":
      to = today;
      from = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
      break;
    case "previous-month": {
      const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      from = startOfDay(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      to = endOfDay(addDays(firstDayOfCurrentMonth, -1));
      break;
    }
    case "custom":
      from = parseDate(singleParam(input.from)) ?? startOfDay(addDays(today, -29));
      to = parseDate(singleParam(input.to), true) ?? today;
      break;
    case "30d":
    default:
      to = today;
      from = startOfDay(addDays(today, -29));
      break;
  }

  if (from.getTime() > to.getTime()) {
    [from, to] = [startOfDay(to), endOfDay(from)];
  }

  return {
    cityId: parseOptionalId(singleParam(input.cityId)),
    from,
    preset,
    species: pickSpecies(singleParam(input.species)),
    to
  };
}

export function formatDateInputValue(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0")
  ].join("-");
}

function pickPreset(value?: string): StatisticsPreset {
  if (value === "7d" || value === "current-month" || value === "previous-month" || value === "custom") {
    return value;
  }

  return "30d";
}

function pickSpecies(value?: string): Species | undefined {
  return value === "CAT" || value === "DOG" ? value : undefined;
}

function parseOptionalId(value?: string) {
  if (!value) {
    return undefined;
  }

  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function parseDate(value?: string, end = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return end ? endOfDay(date) : startOfDay(date);
}

function singleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}
