import type { ApplicationStatus, Species } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type StatisticsFilters = {
  cityId?: number;
  from: Date;
  species?: Species;
  to: Date;
};

export type StatisticsSnapshot = {
  approvedByCity: CityMetric[];
  conversionRate: number;
  filters: {
    cityId?: number;
    from: Date;
    species?: Species;
    to: Date;
  };
  rejectedByCity: CityMetric[];
  speciesByCity: SpeciesCityMetric[];
  summary: {
    approvedApplications: number;
    closedApplications: number;
    newApplications: number;
    rejectedApplications: number;
    totalApplications: number;
  };
  topCities: CityMetric[];
  trendByDate: DateMetric[];
};

export type CityMetric = {
  approved: number;
  city: string;
  rejected: number;
  total: number;
};

export type SpeciesCityMetric = {
  cats: number;
  city: string;
  dogs: number;
  other: number;
  total: number;
};

export type DateMetric = {
  approved: number;
  date: string;
  rejected: number;
  total: number;
};

export async function getApplicationStatistics(filters: StatisticsFilters): Promise<StatisticsSnapshot> {
  const applications = await prisma.adoptionApplication.findMany({
    where: {
      cityId: filters.cityId,
      createdAt: {
        gte: filters.from,
        lte: filters.to
      },
      animal: filters.species
        ? {
            is: {
              species: filters.species
            }
          }
        : undefined
    },
    orderBy: { createdAt: "asc" },
    select: {
      city: true,
      cityRef: {
        select: {
          name: true
        }
      },
      createdAt: true,
      status: true,
      animal: {
        select: {
          species: true
        }
      }
    }
  });

  const cityMap = new Map<string, CityMetric>();
  const speciesCityMap = new Map<string, SpeciesCityMetric>();
  const dateMap = createDateBucketMap(filters.from, filters.to);

  const summary = {
    approvedApplications: 0,
    closedApplications: 0,
    newApplications: 0,
    rejectedApplications: 0,
    totalApplications: applications.length
  };

  for (const application of applications) {
    const city = application.cityRef?.name ?? application.city ?? "Город не указан";
    const dateKey = formatDateKey(application.createdAt);
    const cityMetric = getCityMetric(cityMap, city);
    const speciesMetric = getSpeciesCityMetric(speciesCityMap, city);
    const dateMetric = dateMap.get(dateKey) ?? { approved: 0, date: dateKey, rejected: 0, total: 0 };

    cityMetric.total += 1;
    speciesMetric.total += 1;
    dateMetric.total += 1;

    if (application.status === "APPROVED") {
      cityMetric.approved += 1;
      dateMetric.approved += 1;
      summary.approvedApplications += 1;
    }

    if (application.status === "REJECTED") {
      cityMetric.rejected += 1;
      dateMetric.rejected += 1;
      summary.rejectedApplications += 1;
    }

    if (application.status === "CLOSED") {
      summary.closedApplications += 1;
    }

    if (application.status === "NEW") {
      summary.newApplications += 1;
    }

    switch (application.animal?.species) {
      case "CAT":
        speciesMetric.cats += 1;
        break;
      case "DOG":
        speciesMetric.dogs += 1;
        break;
      case undefined:
        speciesMetric.other += 1;
        break;
    }

    dateMap.set(dateKey, dateMetric);
  }

  const topCities = [...cityMap.values()].sort(sortCityMetrics);
  const approvedByCity = topCities.filter((item) => item.approved > 0);
  const rejectedByCity = topCities.filter((item) => item.rejected > 0);
  const speciesByCity = [...speciesCityMap.values()].sort((a, b) => b.total - a.total || a.city.localeCompare(b.city, "ru"));
  const trendByDate = [...dateMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  const conversionRate = summary.totalApplications
    ? Math.round((summary.approvedApplications / summary.totalApplications) * 100)
    : 0;

  return {
    approvedByCity,
    conversionRate,
    filters,
    rejectedByCity,
    speciesByCity,
    summary,
    topCities,
    trendByDate
  };
}

function getCityMetric(map: Map<string, CityMetric>, city: string) {
  const existing = map.get(city);

  if (existing) {
    return existing;
  }

  const metric = { approved: 0, city, rejected: 0, total: 0 };
  map.set(city, metric);
  return metric;
}

function getSpeciesCityMetric(map: Map<string, SpeciesCityMetric>, city: string) {
  const existing = map.get(city);

  if (existing) {
    return existing;
  }

  const metric = { cats: 0, city, dogs: 0, other: 0, total: 0 };
  map.set(city, metric);
  return metric;
}

function createDateBucketMap(from: Date, to: Date) {
  const buckets = new Map<string, DateMetric>();
  const cursor = startOfDay(from);
  const lastDay = startOfDay(to);

  while (cursor.getTime() <= lastDay.getTime()) {
    const date = formatDateKey(cursor);
    buckets.set(date, { approved: 0, date, rejected: 0, total: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  return buckets;
}

function sortCityMetrics(a: CityMetric, b: CityMetric) {
  return b.approved - a.approved || b.total - a.total || a.city.localeCompare(b.city, "ru");
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateKey(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0")
  ].join("-");
}

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  APPROVED: "Одобрена",
  CALL_SCHEDULED: "Звонок назначен",
  CLOSED: "Закрыта",
  CONTACTED: "Связались",
  IN_REVIEW: "На рассмотрении",
  NEW: "Новая",
  REJECTED: "Отклонена",
  VISIT_SCHEDULED: "Визит назначен"
};
