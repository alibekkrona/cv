import Link from "next/link";
import type { AnimalListItem } from "@/lib/types/animal";

export function AnimalCard({ animal }: { animal: AnimalListItem }) {
  const cover = animal.photos?.[0];
  const details = [
    formatEnum(animal.species),
    formatEnum(animal.sex),
    animal.ageText ?? formatAge(animal.ageMonths),
    animal.size ? formatEnum(animal.size) : null
  ].filter(Boolean);

  return (
    <Link
      href={`/animals/${animal.slug}`}
      className="block overflow-hidden rounded-lg bg-white transition hover:shadow-md"
    >
      <div className="aspect-[4/3] overflow-hidden bg-shelter-leaf/20">
        {cover ? (
          <img
            src={cover.url}
            alt={cover.alt ?? animal.name}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{animal.name}</h2>
          <span className="rounded-full bg-shelter-leaf/15 px-2 py-1 text-xs font-medium text-shelter-moss">
            {formatEnum(animal.status)}
          </span>
        </div>
        <p className="mt-2 text-sm text-shelter-ink/65">{details.join(" / ")}</p>
        {animal.description ? (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-shelter-ink/75">
            {animal.description}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function formatEnum(value: string) {
  const labels: Record<string, string> = {
    AVAILABLE: "Ищет дом",
    DRAFT: "Черновик",
    ADOPTED: "Нашёл дом",
    ARCHIVED: "Архив",
    DOG: "Собака",
    CAT: "Кошка",
    OTHER: "Другое",
    MALE: "Мальчик",
    FEMALE: "Девочка",
    UNKNOWN: "Не указано",
    SMALL: "Маленький",
    MEDIUM: "Средний",
    LARGE: "Большой"
  };

  return labels[value] ?? value;
}

function formatAge(ageMonths: number | null) {
  if (!ageMonths) {
    return null;
  }

  if (ageMonths < 12) {
    return `${ageMonths} мес.`;
  }

  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;

  if (!months) {
    return `${years} г.`;
  }

  return `${years} г. ${months} мес.`;
}
