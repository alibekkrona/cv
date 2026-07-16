import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { listAnimalsAdminPage } from "@/lib/services/animals.service";
import type { AdminAnimalFiltersInput, AnimalAdminItem } from "@/lib/types/animal";

export const dynamic = "force-dynamic";

type AdminAnimalsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminAnimalsPage({ searchParams }: AdminAnimalsPageProps) {
  await requirePermission("animals.manage");

  const params = await searchParams;
  const pageSize = 25;
  const filters: AdminAnimalFiltersInput = {
    photos: pickEnum(params.photos, ["with", "without"]),
    page: parsePage(params.page),
    pageSize,
    query: normalizeQuery(params.q),
    sort: pickEnum(params.sort, ["updated", "name", "created"]) ?? "updated",
    species: pickEnum(params.species, ["DOG", "CAT", "OTHER"]),
    status: pickEnum(params.status, ["DRAFT", "AVAILABLE", "RESERVED", "ADOPTED", "TREATMENT", "HIDDEN"])
  };
  const result = await listAnimalsAdminPage(filters);
  const activeFilterCount = [
    filters.photos,
    filters.query,
    filters.species,
    filters.status,
    filters.sort && filters.sort !== "updated" ? filters.sort : undefined
  ].filter(Boolean).length;

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Животные</h1>
          <p className="mt-2 text-shelter-ink/70">
            Создание, редактирование, публикация, резерв и скрытие анкет животных.
          </p>
        </div>
        <Link href="/admin/animals/new" className="rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
          Добавить животное
        </Link>
      </div>

      <form className="mt-6 grid gap-3 rounded border border-shelter-ink/10 bg-white p-4 xl:grid-cols-[minmax(220px,1fr)_160px_170px_160px_170px_auto_auto] xl:items-end">
        <label className="grid gap-1 text-sm">
          Поиск
          <input
            name="q"
            defaultValue={filters.query ?? ""}
            placeholder="Имя, slug, номер, порода, цвет"
            className="rounded border border-shelter-ink/20 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Вид
          <select name="species" defaultValue={filters.species ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Все</option>
            <option value="DOG">Собаки</option>
            <option value="CAT">Кошки</option>
            <option value="OTHER">Другое</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Статус
          <select name="status" defaultValue={filters.status ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Все</option>
            <option value="DRAFT">Черновик</option>
            <option value="AVAILABLE">Ищет дом</option>
            <option value="RESERVED">Зарезервирован</option>
            <option value="ADOPTED">Нашёл дом</option>
            <option value="TREATMENT">Лечение</option>
            <option value="HIDDEN">Скрыт</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Фото
          <select name="photos" defaultValue={filters.photos ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Все</option>
            <option value="with">С фото</option>
            <option value="without">Без фото</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Сортировка
          <select name="sort" defaultValue={filters.sort ?? "updated"} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="updated">Недавно обновлены</option>
            <option value="created">Недавно созданы</option>
            <option value="name">По имени</option>
          </select>
        </label>
        <button className="rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
          Применить
        </button>
        {activeFilterCount ? (
          <Link href="/admin/animals" className="rounded border border-shelter-ink/15 px-4 py-2 text-center text-sm font-medium">
            Сбросить
          </Link>
        ) : null}
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-shelter-ink/60">
        <p>Найдено анкет: {result.total}</p>
        {result.total ? (
          <p>
            Страница {result.page} из {result.totalPages}
          </p>
        ) : null}
      </div>

      {result.items.length ? (
        <>
          <div className="mt-4 overflow-hidden rounded border border-shelter-ink/10 bg-white">
            {result.items.map((animal) => (
              <AnimalAdminRow key={animal.id} animal={animal} />
            ))}
          </div>
          <AdminAnimalsPagination
            currentPage={result.page}
            pageSize={result.pageSize}
            searchParams={params}
            total={result.total}
            totalPages={result.totalPages}
          />
        </>
      ) : (
        <div className="mt-4 rounded border border-shelter-ink/10 bg-white px-4 py-10 text-center">
          <h2 className="text-lg font-semibold">Анкеты не найдены</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-shelter-ink/65">
            Попробуйте изменить поиск или сбросить фильтры. Если нужно добавить новую
            анкету, используйте кнопку выше.
          </p>
        </div>
      )}
    </section>
  );
}

function AnimalAdminRow({ animal }: { animal: AnimalAdminItem }) {
  const cover = animal.photos?.[0];
  const extraPhotos = animal.photos?.slice(1, 4) ?? [];
  const photoCount = animal._count?.photos ?? animal.photos?.length ?? 0;

  return (
    <article className="grid gap-4 border-b border-shelter-ink/10 px-4 py-4 last:border-0 lg:grid-cols-[92px_minmax(0,1fr)_180px_auto] lg:items-center">
      <Link href={`/admin/animals/${animal.id}/edit`} className="block h-24 w-24 overflow-hidden rounded bg-shelter-leaf/20">
        {cover ? (
          <img src={cover.url} alt={cover.alt ?? animal.name} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center px-2 text-center text-xs text-shelter-ink/45">
            Нет фото
          </span>
        )}
      </Link>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/animals/${animal.id}/edit`} className="font-semibold hover:text-shelter-moss">
            {animal.name}
          </Link>
          <span className="rounded-full bg-shelter-leaf/15 px-2 py-1 text-xs font-medium text-shelter-moss">
            {formatStatus(animal.status)}
          </span>
          <span className="rounded-full bg-shelter-ink/10 px-2 py-1 text-xs font-medium text-shelter-ink/65">
            {formatSpecies(animal.species)}
          </span>
        </div>
        <p className="mt-1 break-all text-sm text-shelter-ink/55">{animal.slug}</p>
        <p className="mt-2 text-sm text-shelter-ink/70">
          {[animal.breed, animal.color, animal.ageText, animal.aviaryNumber ? `вольер ${animal.aviaryNumber}` : null]
            .filter(Boolean)
            .join(" / ") || "Краткие характеристики не заполнены"}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-shelter-ink/55">Фото: {photoCount}</span>
          <span className="text-xs text-shelter-ink/55">Просмотры: {animal._count?.views ?? 0}</span>
          <span className="text-xs text-shelter-ink/55">♥ {animal._count?.likes ?? 0}</span>
          <span className="text-xs text-shelter-ink/55">Комментарии: {animal._count?.comments ?? 0}</span>
          {extraPhotos.map((photo) => (
            <img key={photo.url} src={photo.url} alt={photo.alt ?? animal.name} className="h-8 w-8 rounded object-cover" />
          ))}
          {photoCount > 4 ? (
            <span className="text-xs text-shelter-ink/50">+{photoCount - 4}</span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-1 text-sm text-shelter-ink/65">
        <p>Анкета: {animal.cardNumber ?? "не указана"}</p>
        <p>Обновлено: {formatDate(animal.updatedAt)}</p>
        <p>Создано: {formatDate(animal.createdAt)}</p>
      </div>

      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Link href={`/admin/animals/${animal.id}/edit`} className="rounded border border-shelter-ink/15 px-3 py-2 text-sm font-medium">
          Редактировать
        </Link>
        <Link href={`/animals/${animal.slug}`} className="rounded bg-shelter-moss px-3 py-2 text-sm font-medium text-white">
          Открыть
        </Link>
      </div>
    </article>
  );
}

type AdminAnimalsPaginationProps = {
  currentPage: number;
  pageSize: number;
  searchParams: Record<string, string | string[] | undefined>;
  total: number;
  totalPages: number;
};

function AdminAnimalsPagination({
  currentPage,
  pageSize,
  searchParams,
  total,
  totalPages
}: AdminAnimalsPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  const pageItems = getVisiblePageItems(currentPage, totalPages);

  return (
    <nav className="mt-5 flex flex-col gap-4 border-t border-shelter-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-shelter-ink/60">
        Показано {start}-{end} из {total}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <PageLink
          disabled={currentPage <= 1}
          href={buildAdminAnimalsHref(searchParams, currentPage - 1)}
          label="Назад"
        />
        {pageItems.map((item, index) => item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="inline-flex min-h-10 min-w-10 items-center justify-center px-2 text-sm text-shelter-ink/45">
            ...
          </span>
        ) : (
          <PageLink
            key={item}
            active={item === currentPage}
            href={buildAdminAnimalsHref(searchParams, item)}
            label={String(item)}
          />
        ))}
        <PageLink
          disabled={currentPage >= totalPages}
          href={buildAdminAnimalsHref(searchParams, currentPage + 1)}
          label="Вперёд"
        />
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

function buildAdminAnimalsHref(
  searchParams: Record<string, string | string[] | undefined>,
  page: number
) {
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
  return query ? `/admin/animals?${query}` : "/admin/animals";
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

function formatSpecies(species: string) {
  const labels: Record<string, string> = {
    DOG: "Собака",
    CAT: "Кошка",
    OTHER: "Другое"
  };

  return labels[species] ?? species;
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Черновик",
    AVAILABLE: "Ищет дом",
    RESERVED: "Зарезервирован",
    ADOPTED: "Нашёл дом",
    TREATMENT: "Лечение",
    HIDDEN: "Скрыт"
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
