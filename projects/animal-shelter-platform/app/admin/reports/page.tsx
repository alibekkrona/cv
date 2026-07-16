import Link from "next/link";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { requirePermission } from "@/lib/auth/permissions";
import { listAdminNeedAuditsPage } from "@/lib/services/donations.service";

export const dynamic = "force-dynamic";

type AdminReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminReportsPage({ searchParams }: AdminReportsPageProps) {
  await requirePermission("super.manage");

  const params = await searchParams;
  const pageSize = 25;
  const filters = {
    page: parsePage(params.page),
    pageSize,
    query: normalizeQuery(params.q),
    scope: pickEnum(params.scope, ["SHELTER", "ANIMAL"])
  };
  const result = await listAdminNeedAuditsPage(filters);
  const activeFilterCount = [filters.query, filters.scope].filter(Boolean).length;

  return (
    <section>
      <h1 className="text-2xl font-semibold">Отчёты</h1>
      <p className="mt-2 text-shelter-ink/70">
        Отчёты по реализованным потребностям: что закрыто, кем опубликовано и к какой потребности относится.
      </p>

      <form className="mt-6 grid gap-3 rounded border border-shelter-ink/10 bg-white p-4 xl:grid-cols-[minmax(220px,1fr)_180px_auto_auto] xl:items-end">
        <label className="grid gap-1 text-sm">
          Поиск
          <input
            name="q"
            defaultValue={filters.query ?? ""}
            placeholder="Отчет, потребность, животное"
            className="rounded border border-shelter-ink/20 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Тип
          <select name="scope" defaultValue={filters.scope ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Все</option>
            <option value="SHELTER">Приют</option>
            <option value="ANIMAL">Животное</option>
          </select>
        </label>
        <button className="rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
          Применить
        </button>
        {activeFilterCount ? (
          <Link href="/admin/reports" className="rounded border border-shelter-ink/15 px-4 py-2 text-center text-sm font-medium">
            Сбросить
          </Link>
        ) : null}
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-shelter-ink/60">
        <p>Найдено отчётов: {result.total}</p>
        {result.total ? (
          <p>
            Страница {result.page} из {result.totalPages}
          </p>
        ) : null}
      </div>

      {result.items.length ? (
        <>
          <div className="mt-4 overflow-hidden rounded border border-shelter-ink/10 bg-white">
            {result.items.map((report) => (
              <ReportRow key={report.id} report={report} />
            ))}
          </div>
          <AdminPagination
            basePath="/admin/reports"
            currentPage={result.page}
            pageSize={result.pageSize}
            searchParams={params}
            total={result.total}
            totalPages={result.totalPages}
          />
        </>
      ) : (
        <div className="mt-4 rounded border border-shelter-ink/10 bg-white px-4 py-10 text-center">
          <h2 className="text-lg font-semibold">Отчёты не найдены</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-shelter-ink/65">
            Когда потребность будет реализована и к ней добавят отчет, он появится в этом разделе.
          </p>
        </div>
      )}
    </section>
  );
}

function ReportRow({
  report
}: {
  report: {
    createdAt: Date;
    createdBy: { email: string; name: string | null } | null;
    description: string;
    id: number;
    need: {
      animal: { name: string; slug: string } | null;
      id: number;
      scope: string;
      slug: string;
      status: string;
      title: string;
    };
    photos: Array<{ alt: string | null; url: string }>;
    publishedAt: Date | null;
    title: string;
    _count: { photos: number };
  };
}) {
  const cover = report.photos[0];

  return (
    <article className="grid gap-4 border-b border-shelter-ink/10 px-4 py-4 last:border-0 lg:grid-cols-[92px_minmax(0,1fr)_190px_auto] lg:items-center">
      <Link href={`/admin/needs/${report.need.id}/edit`} className="block h-24 w-24 overflow-hidden rounded bg-shelter-leaf/20">
        {cover ? (
          <img src={cover.url} alt={cover.alt ?? report.title} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center px-2 text-center text-xs text-shelter-ink/45">
            Нет фото
          </span>
        )}
      </Link>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/needs/${report.need.id}/edit`} className="font-semibold hover:text-shelter-moss">
            {report.title}
          </Link>
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">отчет</span>
          <span className="rounded-full bg-shelter-ink/10 px-2 py-1 text-xs text-shelter-ink/65">
            {report.need.scope === "ANIMAL" ? "Животное" : "Приют"}
          </span>
        </div>
        <p className="mt-1 text-sm text-shelter-ink/60">
          Потребность: <Link href={`/admin/needs/${report.need.id}/edit`} className="font-medium hover:text-shelter-moss">{report.need.title}</Link>
          {report.need.animal ? (
            <> / животное: <Link href={`/animals/${report.need.animal.slug}`} className="font-medium hover:text-shelter-moss">{report.need.animal.name}</Link></>
          ) : null}
        </p>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-shelter-ink/70">{report.description}</p>
      </div>

      <div className="grid gap-1 text-sm text-shelter-ink/65">
        <p>Фото: {report._count.photos}</p>
        <p>Опубликовано: {report.publishedAt ? formatDate(report.publishedAt) : "не опубликовано"}</p>
        <p>Создано: {formatDate(report.createdAt)}</p>
        <p>Автор: {formatActor(report.createdBy)}</p>
      </div>

      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Link href={`/admin/needs/${report.need.id}/edit`} className="rounded border border-shelter-ink/15 px-3 py-2 text-sm font-medium">
          Открыть
        </Link>
        <Link href={`/needs/${report.need.slug}`} className="rounded bg-shelter-moss px-3 py-2 text-sm font-medium text-white">
          На сайте
        </Link>
      </div>
    </article>
  );
}

function parsePage(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return 1;
  }

  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function normalizeQuery(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return undefined;
  }

  const query = value.trim();
  return query || undefined;
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

function formatActor(actor?: { email: string; name: string | null } | null) {
  return actor?.name || actor?.email || "Система";
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
