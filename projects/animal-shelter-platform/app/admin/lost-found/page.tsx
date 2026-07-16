import type { LostFoundStatus, LostFoundType } from "@prisma/client";
import Link from "next/link";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { requirePermission } from "@/lib/auth/permissions";
import { listLostFoundReportsForAdminPage } from "@/lib/services/lost-found.service";
import { listKharkivRegionSettlements } from "@/lib/services/settlements.service";

export const dynamic = "force-dynamic";

type AdminLostFoundPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminLostFoundPage({ searchParams }: AdminLostFoundPageProps) {
  await requirePermission("lostFound.manage");

  const params = await searchParams;
  const selectedType = pickType(singleParam(params.type));
  const selectedStatus = pickStatus(singleParam(params.status));
  const selectedCityId = parseOptionalId(params.cityId);
  const query = normalizeQuery(params.q);
  const pageSize = 25;
  const [result, settlementOptions] = await Promise.all([
    listLostFoundReportsForAdminPage({
      cityId: selectedCityId,
      page: parsePage(params.page),
      pageSize,
      query,
      status: selectedStatus,
      type: selectedType
    }),
    listKharkivRegionSettlements()
  ]);

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Потерянные и найденные</h1>
          <p className="mt-2 text-shelter-ink/70">
            Проверка заявок, публикация подтверждённых случаев и закрытие найденных совпадений.
          </p>
        </div>
        <Link href="/admin/lost-found/new" className="rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
          Добавить объявление
        </Link>
      </div>

      <form className="mt-6 grid gap-3 rounded border border-shelter-ink/10 bg-white p-4 md:grid-cols-[1fr_180px_180px_180px_auto] md:items-end">
        <label className="grid gap-1 text-sm">
          Поиск
          <input name="q" defaultValue={query} placeholder="Заголовок, контакт, место" className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Город
          <select name="cityId" defaultValue={selectedCityId ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Все</option>
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
          Статус
          <select name="status" defaultValue={selectedStatus ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Все</option>
            <option value="SUBMITTED">На проверке</option>
            <option value="PUBLISHED">Опубликовано</option>
            <option value="MATCHED">Совпадение найдено</option>
            <option value="CLOSED">Закрыто</option>
            <option value="ARCHIVED">Архив</option>
          </select>
        </label>
        <button className="rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
          Применить
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-shelter-ink/60">
        <p>Найдено объявлений: {result.total}</p>
        {result.total ? (
          <p>
            Страница {result.page} из {result.totalPages}
          </p>
        ) : null}
      </div>

      <div className="mt-6 overflow-hidden rounded border border-shelter-ink/10 bg-white">
        {result.items.length ? (
          result.items.map((report) => (
            <div key={report.id} className="grid gap-3 border-b border-shelter-ink/10 px-4 py-4 last:border-0 md:grid-cols-[1fr_auto_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/lost-found/${report.id}/edit`} className="font-semibold hover:text-shelter-moss">
                    {report.title}
                  </Link>
                  <span className="rounded-full bg-shelter-leaf/15 px-2 py-1 text-xs font-medium text-shelter-moss">
                    {formatEnum(report.type)}
                  </span>
                  <span className="rounded-full bg-shelter-ink/10 px-2 py-1 text-xs font-medium text-shelter-ink/70">
                    {formatEnum(report.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-shelter-ink/60">
                  {report.contactName} / {report.contactPhone}
                </p>
              </div>
              <p className="text-sm text-shelter-ink/60">
                {[report.cityRef?.name ?? report.city, report.district].filter(Boolean).join(", ") || "Место не указано"}
              </p>
              <Link href={`/admin/lost-found/${report.id}/edit`} className="text-sm font-medium text-shelter-moss">
                Редактировать
              </Link>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center text-shelter-ink/60">
            По этим фильтрам объявлений нет.
          </div>
        )}
      </div>
      <AdminPagination
        basePath="/admin/lost-found"
        currentPage={result.page}
        pageSize={result.pageSize}
        searchParams={params}
        total={result.total}
        totalPages={result.totalPages}
      />
    </section>
  );
}

function pickType(type?: string): LostFoundType | undefined {
  return type === "LOST" || type === "FOUND" ? type : undefined;
}

function pickStatus(status?: string): LostFoundStatus | undefined {
  return status === "SUBMITTED" || status === "PUBLISHED" || status === "MATCHED" || status === "CLOSED" || status === "ARCHIVED"
    ? status
    : undefined;
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
    SUBMITTED: "На проверке",
    PUBLISHED: "Опубликовано",
    MATCHED: "Совпадение найдено",
    CLOSED: "Закрыто",
    ARCHIVED: "Архив"
  };

  return labels[value] ?? value;
}
