import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
import {
  getAdminAuditLogFilterOptions,
  listAdminAuditLogs
} from "@/lib/services/admin-audit.service";

export const dynamic = "force-dynamic";

type AdminAuditLogPageProps = {
  searchParams: Promise<{
    action?: string;
    actor?: string;
    entityId?: string;
    entityType?: string;
    page?: string;
  }>;
};

export default async function AdminAuditLogPage({ searchParams }: AdminAuditLogPageProps) {
  await requirePermission("auditLog.view");

  const params = await searchParams;
  const filters = {
    action: normalizeParam(params.action),
    actorUserId: parseInteger(params.actor),
    entityId: parseInteger(params.entityId),
    entityType: normalizeParam(params.entityType),
    page: parseInteger(params.page) ?? 1,
    pageSize: 30
  };
  const [result, options] = await Promise.all([
    listAdminAuditLogs(filters),
    getAdminAuditLogFilterOptions()
  ]);

  return (
    <section>
      <div>
        <h1 className="text-2xl font-semibold">Журнал действий</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-shelter-ink/65">
          Последние важные действия в админке: заявки, животные, потребности, отчеты и объявления.
        </p>
      </div>

      <form className="mt-6 grid gap-3 rounded border border-shelter-ink/10 bg-white p-4 xl:grid-cols-[1fr_1fr_1fr_140px_auto_auto] xl:items-end">
        <label className="grid gap-1 text-sm">
          Действие
          <select name="action" defaultValue={filters.action ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Все</option>
            {options.actions.map((action) => (
              <option key={action} value={action}>{formatAction(action)}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Сущность
          <select name="entityType" defaultValue={filters.entityType ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Все</option>
            {options.entityTypes.map((entityType) => (
              <option key={entityType} value={entityType}>{formatEntityType(entityType)}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Пользователь
          <select name="actor" defaultValue={filters.actorUserId ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Все</option>
            {options.actors.map((actor) => (
              <option key={actor.id} value={actor.id}>{formatActor(actor)}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          ID
          <input name="entityId" defaultValue={filters.entityId ?? ""} className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
        <button className="rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
          Применить
        </button>
        <Link href="/admin/audit-log" className="rounded border border-shelter-ink/15 px-4 py-2 text-center text-sm font-medium">
          Сбросить
        </Link>
      </form>

      <div className="mt-6 overflow-hidden rounded border border-shelter-ink/10 bg-white">
        {result.logs.length ? (
          <div className="divide-y divide-shelter-ink/10">
            {result.logs.map((log) => (
              <article key={log.id} className="grid gap-4 px-4 py-4 xl:grid-cols-[180px_220px_1fr]">
                <div>
                  <p className="text-sm font-semibold">{formatDateTime(log.createdAt)}</p>
                  <p className="mt-1 text-xs text-shelter-ink/50">{formatActor(log.actor)}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{formatAction(log.action)}</p>
                  <p className="mt-1 text-xs text-shelter-ink/55">
                    {formatEntityType(log.entityType)}{log.entityId ? ` #${log.entityId}` : ""}
                  </p>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <JsonPreview label="До" value={log.beforeJson} />
                  <JsonPreview label="После" value={log.afterJson} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-shelter-ink/60">
            Записей журнала пока нет.
          </div>
        )}
      </div>
      <AdminAuditPagination
        currentPage={result.page}
        pageSize={result.pageSize}
        searchParams={params}
        total={result.total}
        totalPages={result.totalPages}
      />
    </section>
  );
}

function JsonPreview({ label, value }: { label: string; value: Prisma.JsonValue }) {
  return (
    <div className="min-w-0 rounded bg-shelter-cream p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-shelter-ink/45">{label}</p>
      <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-shelter-ink/70">
        {value === null ? "—" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function normalizeParam(value?: string) {
  return value?.trim() || undefined;
}

function parseInteger(value?: string) {
  if (!value) {
    return undefined;
  }

  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}

function formatActor(actor?: { email: string; name: string | null } | null) {
  return actor?.name || actor?.email || "Система";
}

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatAction(action: string) {
  const labels: Record<string, string> = {
    ANIMAL_CREATED: "Животное создано",
    ANIMAL_UPDATED: "Животное обновлено",
    APPLICATION_STATUS_CHANGED: "Статус заявки изменен",
    LOST_FOUND_CREATED: "Объявление создано",
    LOST_FOUND_UPDATED: "Объявление обновлено",
    NEED_AUDIT_CREATED: "Отчет потребности создан",
    NEED_AUDIT_UPDATED: "Отчет потребности обновлен",
    NEED_CREATED: "Потребность создана",
    NEED_STATUS_CHANGED: "Статус потребности изменен",
    NEED_UPDATED: "Потребность обновлена"
  };

  return labels[action] ?? action;
}

function formatEntityType(entityType: string) {
  const labels: Record<string, string> = {
    AdoptionApplication: "Заявка",
    Animal: "Животное",
    LostFoundReport: "Потерянные/найденные",
    Need: "Потребность",
    NeedAudit: "Отчет потребности"
  };

  return labels[entityType] ?? entityType;
}

function AdminAuditPagination({
  currentPage,
  pageSize,
  searchParams,
  total,
  totalPages
}: {
  currentPage: number;
  pageSize: number;
  searchParams: Record<string, string | string[] | undefined>;
  total: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  const pageItems = getVisiblePageItems(currentPage, totalPages);

  return (
    <nav className="mt-6 flex flex-col gap-4 border-t border-shelter-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-shelter-ink/60">
        Показано {start}-{end} из {total}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <PageLink disabled={currentPage <= 1} href={buildAuditLogHref(searchParams, currentPage - 1)} label="Назад" />
        {pageItems.map((item, index) => item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="inline-flex min-h-10 min-w-10 items-center justify-center px-2 text-sm text-shelter-ink/45">
            ...
          </span>
        ) : (
          <PageLink key={item} active={item === currentPage} href={buildAuditLogHref(searchParams, item)} label={String(item)} />
        ))}
        <PageLink disabled={currentPage >= totalPages} href={buildAuditLogHref(searchParams, currentPage + 1)} label="Вперёд" />
      </div>
    </nav>
  );
}

function PageLink({
  active,
  disabled,
  href,
  label
}: {
  active?: boolean;
  disabled?: boolean;
  href: string;
  label: string;
}) {
  const className = [
    "inline-flex min-h-10 min-w-10 items-center justify-center rounded border px-3 text-sm font-medium",
    active ? "border-shelter-moss bg-shelter-moss text-white" : "border-shelter-ink/15 bg-white text-shelter-ink",
    disabled ? "pointer-events-none opacity-45" : "hover:border-shelter-moss"
  ].join(" ");

  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={className}>
      {label}
    </Link>
  );
}

type PageItem = number | "ellipsis";

function getVisiblePageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const visiblePages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const items: PageItem[] = [];

  for (const page of visiblePages) {
    const previous = items.at(-1);
    if (typeof previous === "number" && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  }

  return items;
}

function buildAuditLogHref(searchParams: Record<string, string | string[] | undefined>, page: number) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item) {
          params.append(key, item);
        }
      });
    } else if (value) {
      params.set(key, value);
    }
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/admin/audit-log?${query}` : "/admin/audit-log";
}
