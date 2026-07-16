import Link from "next/link";

type NeedAnimalAsideCardProps = {
  animal: {
    ageMonths?: number | null;
    ageText?: string | null;
    description?: string | null;
    name: string;
    photos?: Array<{ alt: string | null; url: string }>;
    sex?: string | null;
    size?: string | null;
    slug: string;
    species?: string | null;
  };
};

export function NeedAnimalAsideCard({ animal }: NeedAnimalAsideCardProps) {
  const cover = animal.photos?.[0];
  const details = [
    animal.species ? formatEnum(animal.species) : null,
    animal.sex ? formatEnum(animal.sex) : null,
    animal.ageText ?? formatAge(animal.ageMonths ?? null),
    animal.size ? formatEnum(animal.size) : null
  ].filter(Boolean);

  return (
    <section className="rounded-lg bg-white p-5">
      <Link href={`/animals/${animal.slug}`} className="block aspect-[16/9] overflow-hidden rounded-lg bg-shelter-leaf/20">
        {cover ? (
          <img src={cover.url} alt={cover.alt ?? animal.name} className="h-full w-full object-cover" />
        ) : null}
      </Link>
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-shelter-ink/45">Потребность для</p>
        <Link href={`/animals/${animal.slug}`} className="mt-1 block text-xl font-semibold hover:text-shelter-moss">
          {animal.name}
        </Link>
        {details.length ? (
          <p className="mt-2 text-sm text-shelter-ink/65">{details.join(" / ")}</p>
        ) : null}
        {animal.description ? (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-shelter-ink/70">{animal.description}</p>
        ) : null}
        <Link href={`/animals/${animal.slug}`} className="mt-4 block rounded-lg bg-shelter-cream px-4 py-2 text-center text-sm font-semibold">
          Открыть анкету
        </Link>
      </div>
    </section>
  );
}

function formatEnum(value: string) {
  const labels: Record<string, string> = {
    CAT: "Кошка",
    DOG: "Собака",
    FEMALE: "Девочка",
    LARGE: "Большой",
    MALE: "Мальчик",
    MEDIUM: "Средний",
    OTHER: "Другое",
    SMALL: "Маленький",
    UNKNOWN: "Не указано"
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

  return months ? `${years} г. ${months} мес.` : `${years} г.`;
}
