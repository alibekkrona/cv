import Link from "next/link";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { listAdminNeedsPage, formatMoney, getNeedProgress } from "@/lib/services/donations.service";

export const dynamic = "force-dynamic";

const statusTabs = [
  { attention: false, href: "/admin/needs", label: "Все", value: undefined },
  { attention: true, href: "/admin/needs?attention=1", label: "Требуют внимания", value: undefined },
  { attention: false, href: "/admin/needs?status=ACTIVE", label: "Активные", value: "ACTIVE" },
  { attention: false, href: "/admin/needs?status=FUNDED", label: "Сбор закрыт", value: "FUNDED" },
  { attention: false, href: "/admin/needs?status=FULFILLED", label: "Реализованные", value: "FULFILLED" },
  { attention: false, href: "/admin/needs?status=PAUSED", label: "Пауза", value: "PAUSED" },
  { attention: false, href: "/admin/needs?status=ANIMAL_ADOPTED", label: "Животное отдано", value: "ANIMAL_ADOPTED" },
  { attention: false, href: "/admin/needs?status=ARCHIVED", label: "Архив", value: "ARCHIVED" }
] as const;

type AdminNeedsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminNeedsPage({ searchParams }: AdminNeedsPageProps) {
  const user = await requirePermission("needs.createDraft");

  const params = await searchParams;
  const selectedStatus = pickNeedStatus(singleParam(params.status));
  const attentionOnly = singleParam(params.attention) === "1";
  const pageSize = 25;
  const result = await listAdminNeedsPage({
    attention: attentionOnly,
    page: parsePage(params.page),
    pageSize,
    status: attentionOnly ? undefined : selectedStatus
  });
  const canManageNeeds = hasPermission(user.role, "needs.manage");

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Потребности</h1>
          <p className="mt-2 text-shelter-ink/65">Потребности приюта и конкретных животных.</p>
        </div>
        <Link href="/admin/needs/new" className="rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
          Создать потребность
        </Link>
      </div>
      <nav className="mt-6 flex flex-wrap gap-2">
        {statusTabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              (tab.attention ? attentionOnly : !attentionOnly && selectedStatus === tab.value)
                ? "bg-shelter-moss text-white"
                : "bg-white text-shelter-ink/70"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-shelter-ink/60">
        <p>Найдено потребностей: {result.total}</p>
        {result.total ? (
          <p>
            Страница {result.page} из {result.totalPages}
          </p>
        ) : null}
      </div>
      <div className="mt-6 grid gap-4">
        {result.items.map((need) => (
          <article key={need.id} className="grid gap-4 rounded border border-shelter-ink/10 bg-white p-4 md:grid-cols-[1fr_180px_auto] md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {canManageNeeds ? (
                  <Link href={`/admin/needs/${need.id}/edit`} className="font-semibold hover:text-shelter-moss">
                    {need.title}
                  </Link>
                ) : (
                  <span className="font-semibold">{need.title}</span>
                )}
                <span className="rounded-full bg-shelter-ink/10 px-2 py-1 text-xs text-shelter-ink/65">{formatNeedStatus(need.status)}</span>
                <span className="rounded-full bg-shelter-ink/10 px-2 py-1 text-xs text-shelter-ink/65">{need.scope === "ANIMAL" ? "Животное" : "Приют"}</span>
                {need.isUrgent ? (
                  <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">срочно</span>
                ) : null}
                {need._count.audits ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">есть отчет</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-shelter-ink/60">{need.animal ? `Животное: ${need.animal.name}` : "Общая потребность приюта"}</p>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-shelter-ink/70">{need.description}</p>
            </div>
            <div>
              <p className="text-sm text-shelter-ink/60">Собрано {getNeedProgress(need.raisedCents, need.targetCents)}%</p>
              <p className="mt-1 font-semibold">{formatMoney(need.raisedCents)} / {formatMoney(need.targetCents)}</p>
            </div>
            {canManageNeeds ? (
              <Link href={`/admin/needs/${need.id}/edit`} className="rounded border border-shelter-ink/15 px-3 py-2 text-center text-sm font-medium">
                Редактировать
              </Link>
            ) : null}
          </article>
        ))}
      </div>
      <AdminPagination
        basePath="/admin/needs"
        currentPage={result.page}
        pageSize={result.pageSize}
        searchParams={params}
        total={result.total}
        totalPages={result.totalPages}
      />
    </section>
  );
}

function pickNeedStatus(status?: string) {
  return statusTabs.find((tab) => tab.value === status)?.value;
}

function parsePage(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return 1;
  }

  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function singleParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function formatNeedStatus(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Активна",
    ANIMAL_ADOPTED: "Животное отдано",
    ARCHIVED: "Архив",
    DRAFT: "Черновик",
    FULFILLED: "Реализована",
    FUNDED: "Сбор закрыт",
    PAUSED: "Пауза"
  };

  return labels[status] ?? status;
}
