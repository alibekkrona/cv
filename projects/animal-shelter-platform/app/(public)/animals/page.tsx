import { AnimalFilters } from "@/components/animals/AnimalFilters";
import { AnimalCard } from "@/components/animals/AnimalCard";
import { AnimalPagination } from "@/components/animals/AnimalPagination";
import { PublicTwoColumnLayout } from "@/components/layout/PublicTwoColumnLayout";
import { listAvailableAnimalsPage } from "@/lib/services/animals.service";
import type { AnimalFiltersInput } from "@/lib/types/animal";

export const dynamic = "force-dynamic";

type AnimalsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AnimalsPage({ searchParams }: AnimalsPageProps) {
  const params = await searchParams;
  const pageSize = 24;
  const filters: AnimalFiltersInput = {
    coat: pickEnum(params.coat, ["short-haired", "medium-length", "long-haired", "curling"]),
    color: pickEnum(params.color, [
      "bicolor",
      "redhead",
      "tricolor",
      "black",
      "gray",
      "brown",
      "cream",
      "white"
    ]),
    query: pickText(params.q),
    species: pickEnum(params.species, ["DOG", "CAT", "OTHER"]),
    sex: pickEnum(params.sex, ["MALE", "FEMALE", "UNKNOWN"]),
    size: pickEnum(params.size, ["SMALL", "MEDIUM", "LARGE", "UNKNOWN"]),
    sort: pickEnum(params.sort, ["newest", "name", "age-young", "age-old"]) ?? "newest",
    sterilized: params.sterilized === "true",
    vaccinated: params.vaccinated === "true",
    page: parsePage(params.page),
    pageSize
  };
  const result = await listAvailableAnimalsPage(filters);

  const aside = (
    <div className="grid gap-4">
      <section className="rounded-lg bg-white p-4">
        <h1 className="text-xl font-semibold">Поиск животных</h1>
        <p className="mt-2 text-sm leading-6 text-shelter-ink/65">
          Подберите анкету по виду, характеру, размеру и важным условиям ухода.
        </p>
      </section>
      <AnimalFilters filters={filters} total={result.total} />
    </div>
  );

  return (
    <PublicTwoColumnLayout aside={aside}>
      {result.items.length ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((animal) => (
              <AnimalCard key={animal.id} animal={animal} />
            ))}
          </div>
          <AnimalPagination
            currentPage={result.page}
            pageSize={result.pageSize}
            searchParams={params}
            total={result.total}
            totalPages={result.totalPages}
          />
        </>
      ) : (
        <div className="rounded-lg bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">По этим фильтрам животных не найдено</h2>
          <p className="mx-auto mt-2 max-w-md text-shelter-ink/70">
            Попробуйте убрать один из фильтров или выбрать другой вид. Иногда
            подходящее знакомство начинается с более широкого поиска.
          </p>
        </div>
      )}
    </PublicTwoColumnLayout>
  );
}

function pickText(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function parsePage(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return 1;
  }

  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function pickEnum<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[]
): T | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return allowed.includes(value as T) ? (value as T) : undefined;
}
