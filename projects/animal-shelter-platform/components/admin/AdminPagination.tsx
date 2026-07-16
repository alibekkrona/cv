import Link from "next/link";

type AdminPaginationProps = {
  basePath: string;
  currentPage: number;
  pageSize: number;
  searchParams: Record<string, string | string[] | undefined>;
  total: number;
  totalPages: number;
};

export function AdminPagination({
  basePath,
  currentPage,
  pageSize,
  searchParams,
  total,
  totalPages
}: AdminPaginationProps) {
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
          href={buildAdminHref(basePath, searchParams, currentPage - 1)}
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
            href={buildAdminHref(basePath, searchParams, item)}
            label={String(item)}
          />
        ))}
        <PageLink
          disabled={currentPage >= totalPages}
          href={buildAdminHref(basePath, searchParams, currentPage + 1)}
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

function buildAdminHref(
  basePath: string,
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
  return query ? `${basePath}?${query}` : basePath;
}
