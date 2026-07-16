import Link from "next/link";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { requirePermission } from "@/lib/auth/permissions";
import { formatMoney, listAdminDonationsPage } from "@/lib/services/donations.service";

export const dynamic = "force-dynamic";

type AdminDonationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDonationsPage({ searchParams }: AdminDonationsPageProps) {
  await requirePermission("donations.view");

  const params = await searchParams;
  const pageSize = 25;
  const filters = {
    animalQuery: normalizeQuery(params.animal),
    page: parsePage(params.page),
    pageSize,
    query: normalizeQuery(params.q),
    sort: pickEnum(params.sort, ["created", "amount"]) ?? "created",
    status: pickEnum(params.status, ["PLEDGED", "PAID", "CANCELLED"]),
    target: pickEnum(params.target, ["SHELTER", "ANIMAL", "NEED"])
  };
  const result = await listAdminDonationsPage(filters);
  const activeFilterCount = [
    filters.animalQuery,
    filters.query,
    filters.status,
    filters.target,
    filters.sort !== "created" ? filters.sort : undefined
  ].filter(Boolean).length;

  return (
    <section>
      <h1 className="text-2xl font-semibold">Донаты</h1>
      <p className="mt-2 text-sm text-shelter-ink/65">
        Донаты создаются только публичным пользовательским процессом. Вручную добавлять донаты из админки нельзя.
      </p>

      <form className="mt-6 grid gap-3 rounded border border-shelter-ink/10 bg-white p-4 xl:grid-cols-[minmax(220px,1fr)_minmax(180px,240px)_150px_150px_170px_auto_auto] xl:items-end">
        <label className="grid gap-1 text-sm">
          Поиск
          <input
            name="q"
            defaultValue={filters.query ?? ""}
            placeholder="Имя, email, телефон, сообщение"
            className="rounded border border-shelter-ink/20 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Животное
          <input
            name="animal"
            defaultValue={filters.animalQuery ?? ""}
            placeholder="Имя животного"
            className="rounded border border-shelter-ink/20 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Тип
          <select name="target" defaultValue={filters.target ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Все</option>
            <option value="SHELTER">Приют</option>
            <option value="ANIMAL">Животное</option>
            <option value="NEED">Потребность</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Статус
          <select name="status" defaultValue={filters.status ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Все</option>
            <option value="PLEDGED">Ожидает</option>
            <option value="PAID">Оплачен</option>
            <option value="CANCELLED">Отменен</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Сортировка
          <select name="sort" defaultValue={filters.sort} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="created">Новые сверху</option>
            <option value="amount">По сумме</option>
          </select>
        </label>
        <button className="rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
          Применить
        </button>
        {activeFilterCount ? (
          <Link href="/admin/donations" className="rounded border border-shelter-ink/15 px-4 py-2 text-center text-sm font-medium">
            Сбросить
          </Link>
        ) : null}
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-shelter-ink/60">
        <p>Найдено донатов: {result.total}</p>
        {result.total ? (
          <p>
            Страница {result.page} из {result.totalPages}
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid gap-3">
        {result.items.map((donation) => (
          <article key={donation.id} className="grid gap-3 rounded border border-shelter-ink/10 bg-white p-4 md:grid-cols-[1fr_auto]">
            <div>
              <p className="font-semibold">{donation.isAnonymous ? "Анонимно" : donation.donorName || "Добрый человек"}</p>
              <p className="mt-1 text-sm text-shelter-ink/65">{formatDonationTarget(donation)}</p>
              {donation.message ? (
                <p className="mt-2 line-clamp-2 text-sm text-shelter-ink/60">{donation.message}</p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="font-semibold text-shelter-moss">{formatMoney(donation.amountCents)}</p>
              <p className="mt-1 text-xs text-shelter-ink/55">{formatDonationStatus(donation.status)} / {formatDonationMethod(donation.method)}</p>
              {donation.payments[0] ? (
                <p className="mt-1 text-xs text-shelter-ink/45">
                  {formatPaymentProvider(donation.payments[0].provider)} / {formatPaymentStatus(donation.payments[0].status)}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-shelter-ink/45">{formatDate(donation.createdAt)}</p>
            </div>
          </article>
        ))}
      </div>
      <AdminPagination
        basePath="/admin/donations"
        currentPage={result.page}
        pageSize={result.pageSize}
        searchParams={params}
        total={result.total}
        totalPages={result.totalPages}
      />
    </section>
  );
}

function formatDonationTarget(donation: {
  animal?: { name: string } | null;
  need?: { title: string } | null;
  target: string;
}) {
  if (donation.need) {
    return `Потребность: ${donation.need.title}`;
  }

  if (donation.animal) {
    return `Животное: ${donation.animal.name}`;
  }

  return "Приют";
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

function formatDonationStatus(status: string) {
  const labels: Record<string, string> = {
    CANCELLED: "Отменен",
    PAID: "Оплачен",
    PLEDGED: "Ожидает"
  };

  return labels[status] ?? status;
}

function formatDonationMethod(method: string) {
  const labels: Record<string, string> = {
    CARD: "Карта",
    INVOICE: "Счет"
  };

  return labels[method] ?? method;
}

function formatPaymentProvider(provider: string) {
  const labels: Record<string, string> = {
    LIQPAY: "LiqPay",
    MONOBANK: "monobank"
  };

  return labels[provider] ?? provider;
}

function formatPaymentStatus(status: string) {
  const labels: Record<string, string> = {
    CANCELLED: "Отменен",
    CREATED: "Создан",
    FAILED: "Ошибка",
    PENDING: "В обработке",
    SUCCEEDED: "Успешно"
  };

  return labels[status] ?? status;
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
