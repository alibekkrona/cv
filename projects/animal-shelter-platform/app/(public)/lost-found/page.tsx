import type { LostFoundType, Species } from "@prisma/client";
import Link from "next/link";
import { AnimalPagination } from "@/components/animals/AnimalPagination";
import { PublicTwoColumnLayout } from "@/components/layout/PublicTwoColumnLayout";
import { listPublishedLostFoundReportsPage } from "@/lib/services/lost-found.service";
import { listKharkivRegionSettlements } from "@/lib/services/settlements.service";

export const dynamic = "force-dynamic";

type LostFoundPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LostFoundPage({ searchParams }: LostFoundPageProps) {
  const params = await searchParams;
  const selectedType = pickType(singleParam(params.type));
  const selectedSpecies = pickSpecies(singleParam(params.species));
  const selectedCityId = parseOptionalId(params.cityId);
  const query = normalizeQuery(params.q);
  const pageSize = 24;
  const [result, settlementOptions] = await Promise.all([
    listPublishedLostFoundReportsPage({
      cityId: selectedCityId,
      page: parsePage(params.page),
      pageSize,
      query,
      species: selectedSpecies,
      type: selectedType
    }),
    listKharkivRegionSettlements()
  ]);
  const submitted = singleParam(params.submitted);
  const aside = (
    <div className="grid gap-4">
      <section className="rounded-lg bg-white p-4">
        <h1 className="text-xl font-semibold">Потерянные и найденные</h1>
        <p className="mt-2 text-sm leading-6 text-shelter-ink/65">
          Объявления от людей, которые потеряли или нашли животное.
        </p>
      </section>

      <form className="grid gap-4 rounded-lg bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Поиск</h2>
            <p className="mt-1 text-sm text-shelter-ink/60">Найдено: {result.total}</p>
          </div>
          {query || selectedType || selectedSpecies || selectedCityId ? (
            <Link href="/lost-found" className="text-sm font-medium text-shelter-moss">
              Сбросить
            </Link>
          ) : null}
        </div>
        <label className="grid gap-1 text-sm">
          Район, улица, описание
          <input name="q" defaultValue={query} placeholder="Например, Салтовка" className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Город
          <select name="cityId" defaultValue={selectedCityId ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Все города</option>
            {settlementOptions.map((settlement) => (
              <option key={settlement.id} value={settlement.id}>
                {settlement.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Тип
          <select name="type" defaultValue={selectedType ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Все</option>
            <option value="LOST">Потеряно</option>
            <option value="FOUND">Найдено</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Вид
          <select name="species" defaultValue={selectedSpecies ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Все</option>
            <option value="DOG">Собаки</option>
            <option value="CAT">Кошки</option>
            <option value="OTHER">Другое</option>
          </select>
        </label>
        <button className="rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
          Применить
        </button>
      </form>

      <section className="rounded-lg bg-white p-4">
        <h2 className="font-semibold">Сообщить о животном</h2>
        <p className="mt-2 text-sm leading-6 text-shelter-ink/65">
          Если вы потеряли или нашли животное, отправьте объявление на проверку.
        </p>
        <Link href="/lost-found/report" className="mt-4 inline-flex w-full justify-center rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
          Сообщить о животном
        </Link>
      </section>
    </div>
  );

  return (
    <PublicTwoColumnLayout aside={aside}>
      {submitted === "1" ? (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Объявление отправлено. Команда приюта проверит его перед публикацией.
        </div>
      ) : null}

      {result.items.length ? (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((report) => {
            const cover = report.photos[0];

            return (
              <Link key={report.id} href={`/lost-found/${report.slug}`} className="block overflow-hidden rounded-lg bg-white transition hover:shadow-md">
                <div className="aspect-[4/3] overflow-hidden bg-shelter-leaf/20">
                  {cover ? (
                    <img src={cover.url} alt={cover.alt ?? report.title} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="text-sm font-medium text-shelter-moss">{formatEnum(report.type)} / {formatEnum(report.species)}</p>
                  <h2 className="mt-2 text-lg font-semibold">{report.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-shelter-ink/70">{report.description}</p>
                  <p className="mt-3 text-sm text-shelter-ink/55">
                    {[report.cityRef?.name ?? report.city, report.district].filter(Boolean).join(", ") || "Место не указано"}
                  </p>
                </div>
              </Link>
            );
            })}
          </div>
          <AnimalPagination
            basePath="/lost-found"
            currentPage={result.page}
            pageSize={result.pageSize}
            searchParams={params}
            total={result.total}
            totalPages={result.totalPages}
          />
        </>
      ) : (
        <div className="rounded-lg bg-white px-4 py-8 text-center text-shelter-ink/60">
          По этим фильтрам опубликованных объявлений нет.
        </div>
      )}
    </PublicTwoColumnLayout>
  );
}

function pickType(type?: string): LostFoundType | undefined {
  return type === "LOST" || type === "FOUND" ? type : undefined;
}

function pickSpecies(species?: string): Species | undefined {
  return species === "DOG" || species === "CAT" || species === "OTHER" ? species : undefined;
}

function parsePage(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return 1;
  }

  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function parseOptionalId(value: string | string[] | undefined) {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function normalizeQuery(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }

  const query = value.trim();
  return query || undefined;
}

function singleParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function formatEnum(value: string) {
  const labels: Record<string, string> = {
    LOST: "Потеряно",
    FOUND: "Найдено",
    DOG: "Собака",
    CAT: "Кошка",
    OTHER: "Другое"
  };

  return labels[value] ?? value;
}
