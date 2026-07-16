import Link from "next/link";
import { StatisticsCharts } from "@/components/admin/StatisticsCharts";
import { requirePermission } from "@/lib/auth/permissions";
import { findActiveSettlementsByRegionSlug } from "@/lib/repositories/settlements.repository";
import {
  formatDateInputValue,
  getAdminStatistics
} from "@/lib/services/statistics.service";

export const dynamic = "force-dynamic";

type AdminStatisticsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminStatisticsPage({ searchParams }: AdminStatisticsPageProps) {
  await requirePermission("statistics.view");

  const params = await searchParams;
  const [{ filters, snapshot }, settlements] = await Promise.all([
    getAdminStatistics(params),
    findActiveSettlementsByRegionSlug("kharkiv-oblast")
  ]);
  const activeFilterCount = [filters.cityId, filters.species, filters.preset !== "30d" ? filters.preset : undefined].filter(Boolean).length;
  const exportQueryString = buildQueryString(params);

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Статистика</h1>
          <p className="mt-2 max-w-3xl text-shelter-ink/70">
            Заявки, одобрения и география по выбранному периоду. Раздел видят только администраторы.
          </p>
        </div>
        <Link
          href={exportQueryString ? `/api/admin/statistics/export?${exportQueryString}` : "/api/admin/statistics/export"}
          className="rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white"
        >
          Скачать Excel
        </Link>
      </div>

      <form className="mt-6 grid gap-3 rounded border border-shelter-ink/10 bg-white p-4 xl:grid-cols-[180px_170px_170px_220px_170px_auto_auto] xl:items-end">
        <label className="grid gap-1 text-sm">
          Период
          <select name="preset" defaultValue={filters.preset} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="7d">7 дней</option>
            <option value="30d">30 дней</option>
            <option value="current-month">Текущий месяц</option>
            <option value="previous-month">Прошлый месяц</option>
            <option value="custom">Свой период</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          С
          <input
            name="from"
            type="date"
            defaultValue={formatDateInputValue(filters.from)}
            className="rounded border border-shelter-ink/20 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          По
          <input
            name="to"
            type="date"
            defaultValue={formatDateInputValue(filters.to)}
            className="rounded border border-shelter-ink/20 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Город
          <select name="cityId" defaultValue={filters.cityId ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Все города</option>
            {settlements.map((settlement) => (
              <option key={settlement.id} value={settlement.id}>
                {settlement.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Тип животного
          <select name="species" defaultValue={filters.species ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Все</option>
            <option value="DOG">Собаки</option>
            <option value="CAT">Кошки</option>
          </select>
        </label>
        <button className="rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
          Применить
        </button>
        {activeFilterCount ? (
          <Link href="/admin/statistics" className="rounded border border-shelter-ink/15 px-4 py-2 text-center text-sm font-medium">
            Сбросить
          </Link>
        ) : null}
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Всего заявок" value={snapshot.summary.totalApplications} />
        <MetricCard label="Новые" value={snapshot.summary.newApplications} />
        <MetricCard label="Одобрены" value={snapshot.summary.approvedApplications} />
        <MetricCard label="Отклонены" value={snapshot.summary.rejectedApplications} />
        <MetricCard label="Конверсия" suffix="%" value={snapshot.conversionRate} />
      </div>

      <div className="mt-6">
        <StatisticsCharts
          approvedByCity={snapshot.approvedByCity}
          speciesByCity={snapshot.speciesByCity}
          trendByDate={snapshot.trendByDate}
        />
      </div>

      <section className="mt-6 rounded border border-shelter-ink/10 bg-white p-5">
        <h2 className="font-semibold">Города</h2>
        <p className="mt-1 text-sm text-shelter-ink/60">
          Сводка по заявкам, одобрениям и отказам внутри выбранного периода.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <thead className="text-shelter-ink/60">
              <tr className="border-b border-shelter-ink/10">
                <th className="py-2 pr-4 font-medium">Город</th>
                <th className="py-2 pr-4 font-medium">Всего</th>
                <th className="py-2 pr-4 font-medium">Одобрено</th>
                <th className="py-2 pr-4 font-medium">Отклонено</th>
                <th className="py-2 pr-4 font-medium">Процент одобрения</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.topCities.length ? (
                snapshot.topCities.map((city) => (
                  <tr key={city.city} className="border-b border-shelter-ink/10 last:border-0">
                    <td className="py-3 pr-4 font-medium">{city.city}</td>
                    <td className="py-3 pr-4">{city.total}</td>
                    <td className="py-3 pr-4">{city.approved}</td>
                    <td className="py-3 pr-4">{city.rejected}</td>
                    <td className="py-3 pr-4">{city.total ? Math.round((city.approved / city.total) * 100) : 0}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-6 text-center text-shelter-ink/60" colSpan={5}>
                    За выбранный период заявок нет.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function MetricCard({
  label,
  suffix,
  value
}: {
  label: string;
  suffix?: string;
  value: number;
}) {
  return (
    <div className="rounded border border-shelter-ink/10 bg-white p-4">
      <p className="text-sm text-shelter-ink/60">{label}</p>
      <p className="mt-2 text-3xl font-semibold">
        {value}
        {suffix ? <span className="text-xl">{suffix}</span> : null}
      </p>
    </div>
  );
}

function buildQueryString(params: Record<string, string | string[] | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) {
          searchParams.append(key, item);
        }
      });
    } else if (value) {
      searchParams.set(key, value);
    }
  }

  return searchParams.toString();
}
