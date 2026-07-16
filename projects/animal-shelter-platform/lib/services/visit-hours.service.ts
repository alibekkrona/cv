import type { Prisma } from "@prisma/client";
import {
  findWalkingHours,
  findVisitHours,
  replaceWalkingHours,
  replaceVisitHours
} from "@/lib/repositories/visit-hours.repository";

export const weekdays = [
  { dayOfWeek: 1, label: "Понедельник" },
  { dayOfWeek: 2, label: "Вторник" },
  { dayOfWeek: 3, label: "Среда" },
  { dayOfWeek: 4, label: "Четверг" },
  { dayOfWeek: 5, label: "Пятница" },
  { dayOfWeek: 6, label: "Суббота" },
  { dayOfWeek: 7, label: "Воскресенье" }
];

export async function getVisitHours() {
  const hours = await findVisitHours();

  if (hours.length) {
    return hours;
  }

  return saveVisitHours(
    weekdays.map(({ dayOfWeek }) => ({
      closesAt: "16:30",
      dayOfWeek,
      isEnabled: true,
      opensAt: "09:00"
    }))
  );
}

export async function getWalkingHours() {
  const hours = await findWalkingHours();

  if (hours.length) {
    return hours;
  }

  return saveWalkingHours(
    weekdays.map(({ dayOfWeek }) => ({
      closesAt: "13:00",
      dayOfWeek,
      isEnabled: dayOfWeek === 2 || dayOfWeek === 5,
      opensAt: "10:00"
    }))
  );
}

export async function saveVisitHours(entries: Prisma.ShelterVisitHourCreateManyInput[]) {
  return replaceVisitHours(
    entries
      .filter((entry) => entry.dayOfWeek >= 1 && entry.dayOfWeek <= 7)
      .map((entry) => ({
        closesAt: normalizeTime(entry.closesAt) || "16:30",
        dayOfWeek: entry.dayOfWeek,
        isEnabled: Boolean(entry.isEnabled),
        opensAt: normalizeTime(entry.opensAt) || "09:00"
      }))
  );
}

export async function saveWalkingHours(entries: Prisma.ShelterWalkingHourCreateManyInput[]) {
  return replaceWalkingHours(
    entries
      .filter((entry) => entry.dayOfWeek >= 1 && entry.dayOfWeek <= 7)
      .map((entry) => ({
        closesAt: normalizeTime(entry.closesAt) || "13:00",
        dayOfWeek: entry.dayOfWeek,
        isEnabled: Boolean(entry.isEnabled),
        opensAt: normalizeTime(entry.opensAt) || "10:00"
      }))
  );
}

export function formatVisitHoursSummary(entries: ScheduleEntry[]) {
  return formatScheduleSummary(entries);
}

export function formatWalkingHoursSummary(entries: ScheduleEntry[]) {
  return formatScheduleSummary(entries);
}

type ScheduleEntry = {
  closesAt: string;
  dayOfWeek: number;
  isEnabled: boolean;
  opensAt: string;
};

function formatScheduleSummary(entries: ScheduleEntry[]) {
  const activeEntries = entries.filter((entry) => entry.isEnabled);

  if (!activeEntries.length) {
    return "Время временно не настроено.";
  }

  const grouped = new Map<string, number[]>();

  for (const entry of activeEntries) {
    const key = `${entry.opensAt}-${entry.closesAt}`;
    grouped.set(key, [...(grouped.get(key) ?? []), entry.dayOfWeek]);
  }

  return [...grouped.entries()]
    .map(([time, days]) => {
      const [opensAt, closesAt] = time.split("-");
      return `${formatDayRange(days)}: ${opensAt}-${closesAt}`;
    })
    .join("\n");
}

function normalizeTime(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : null;
}

function formatDayRange(days: number[]) {
  const sortedDays = [...days].sort((a, b) => a - b);

  if (sortedDays.length === 7) {
    return "Каждый день";
  }

  return sortedDays
    .map((day) => weekdays.find((item) => item.dayOfWeek === day)?.label ?? String(day))
    .join(", ");
}
