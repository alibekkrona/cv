"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { AnimalFiltersInput } from "@/lib/types/animal";

type AnimalFiltersProps = {
  filters: AnimalFiltersInput;
  total: number;
};

export function AnimalFilters({ filters, total }: AnimalFiltersProps) {
  const activeCount = [
    filters.coat,
    filters.color,
    filters.species,
    filters.sex,
    filters.size,
    filters.sterilized
  ].filter(Boolean).length;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateFilter(name: "coat" | "color" | "sex" | "size" | "species" | "sterilized", value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || (name === "sterilized" && value !== "true")) {
      params.delete(name);
    } else {
      params.set(name, value);
    }

    params.delete("page");

    const queryString = params.toString();
    const href = queryString ? `${pathname}?${queryString}` : pathname;

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return (
    <aside className="rounded-lg bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Фильтры</h2>
          <p className="mt-1 text-sm text-shelter-ink/60">
            Найдено: {total}
          </p>
        </div>
        {activeCount ? (
          <Link href="/animals" className="text-sm font-medium text-shelter-moss">
            Сбросить
          </Link>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5" aria-busy={isPending}>
        <FilterGroup icon="◌" label="Вид">
          <SegmentButton active={!filters.species} disabled={isPending} onClick={() => updateFilter("species", "")}>
            Все
          </SegmentButton>
          <SegmentButton icon="🐶" active={filters.species === "DOG"} disabled={isPending} onClick={() => updateFilter("species", "DOG")}>
            Собаки
          </SegmentButton>
          <SegmentButton icon="🐱" active={filters.species === "CAT"} disabled={isPending} onClick={() => updateFilter("species", "CAT")}>
            Кошки
          </SegmentButton>
          <SegmentButton active={filters.species === "OTHER"} disabled={isPending} onClick={() => updateFilter("species", "OTHER")}>
            Другие
          </SegmentButton>
        </FilterGroup>

        <FilterGroup icon="⚥" label="Пол">
          <SegmentButton active={!filters.sex} disabled={isPending} onClick={() => updateFilter("sex", "")}>
            Любой
          </SegmentButton>
          <SegmentButton icon="♂" active={filters.sex === "MALE"} disabled={isPending} onClick={() => updateFilter("sex", "MALE")}>
            Мальчик
          </SegmentButton>
          <SegmentButton icon="♀" active={filters.sex === "FEMALE"} disabled={isPending} onClick={() => updateFilter("sex", "FEMALE")}>
            Девочка
          </SegmentButton>
        </FilterGroup>

        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <FilterLabel icon="◒" label="Размер" />
            <span className="group relative inline-flex">
              <button
                type="button"
                className="inline-flex size-5 items-center justify-center rounded-full border border-shelter-ink/20 text-xs text-shelter-ink/60"
                aria-label="Пояснение размеров"
              >
                ?
              </button>
              <span className="pointer-events-none absolute left-1/2 top-7 z-10 hidden w-56 -translate-x-1/2 rounded border border-shelter-ink/10 bg-white p-3 text-xs leading-5 text-shelter-ink/70 shadow-lg group-hover:block group-focus-within:block">
                Маленький: до 10 кг. Средний: 10-25 кг. Большой: от 25 кг.
              </span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <SegmentButton active={!filters.size} disabled={isPending} onClick={() => updateFilter("size", "")}>
              Любой
            </SegmentButton>
            <SegmentButton active={filters.size === "SMALL"} disabled={isPending} onClick={() => updateFilter("size", "SMALL")}>
              Маленький
            </SegmentButton>
            <SegmentButton active={filters.size === "MEDIUM"} disabled={isPending} onClick={() => updateFilter("size", "MEDIUM")}>
              Средний
            </SegmentButton>
            <SegmentButton active={filters.size === "LARGE"} disabled={isPending} onClick={() => updateFilter("size", "LARGE")}>
              Большой
            </SegmentButton>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={Boolean(filters.sterilized)}
            disabled={isPending}
            onChange={(event) => updateFilter("sterilized", event.currentTarget.checked ? "true" : "")}
            className="mt-1"
          />
          <span className="text-shelter-ink/70">Только стерилизованные</span>
        </label>

        <div className="grid gap-2">
          <FilterLabel icon="≈" label="Шерсть" />
          <div className="flex flex-wrap gap-2">
            <SegmentButton active={!filters.coat} disabled={isPending} onClick={() => updateFilter("coat", "")}>
              Любая
            </SegmentButton>
            <SegmentButton active={filters.coat === "short-haired"} disabled={isPending} onClick={() => updateFilter("coat", "short-haired")}>
              <span className="inline-flex items-center gap-1.5">
                <CoatIcon type="short" />
                Короткая
              </span>
            </SegmentButton>
            <SegmentButton active={filters.coat === "medium-length"} disabled={isPending} onClick={() => updateFilter("coat", "medium-length")}>
              <span className="inline-flex items-center gap-1.5">
                <CoatIcon type="medium" />
                Средняя
              </span>
            </SegmentButton>
            <SegmentButton active={filters.coat === "long-haired"} disabled={isPending} onClick={() => updateFilter("coat", "long-haired")}>
              <span className="inline-flex items-center gap-1.5">
                <CoatIcon type="long" />
                Длинная
              </span>
            </SegmentButton>
            <SegmentButton active={filters.coat === "curling"} disabled={isPending} onClick={() => updateFilter("coat", "curling")}>
              <span className="inline-flex items-center gap-1.5">
                <CoatIcon type="curly" />
                Кудрявая
              </span>
            </SegmentButton>
          </div>
        </div>

        <label className="grid gap-1 text-sm font-medium">
          <FilterLabel icon="●" label="Окрас" />
          <select
            name="color"
            defaultValue={filters.color ?? ""}
            disabled={isPending}
            onChange={(event) => updateFilter("color", event.currentTarget.value)}
            className="rounded border border-shelter-ink/20 bg-white px-2.5 py-1.5 text-xs font-normal"
          >
            <option value="">Любой окрас</option>
            <option value="bicolor">Двухцветный</option>
            <option value="redhead">Рыжий</option>
            <option value="tricolor">Трёхцветный</option>
            <option value="black">Чёрный</option>
            <option value="gray">Серый</option>
            <option value="brown">Коричневый</option>
            <option value="cream">Кремовый</option>
            <option value="white">Белый</option>
          </select>
        </label>
      </div>
    </aside>
  );
}

function FilterGroup({ children, icon, label }: { children: React.ReactNode; icon: string; label: string }) {
  return (
    <div className="grid gap-2">
      <FilterLabel icon={icon} label={label} />
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-shelter-ink/65">
      <span className="text-xs text-shelter-ink/45" aria-hidden="true">
        {icon}
      </span>
      {label}
    </span>
  );
}

function SegmentButton({
  active,
  children,
  disabled,
  icon,
  onClick
}: {
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  icon?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "rounded border px-2.5 py-1 text-xs font-medium disabled:opacity-60",
        active
          ? "border-shelter-moss bg-shelter-leaf/15 text-shelter-moss"
          : "border-shelter-ink/15 bg-white text-shelter-ink hover:border-shelter-moss"
      ].join(" ")}
    >
      <span className="inline-flex items-center gap-1.5">
        {icon ? (
          <span className="text-sm" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <span className={active ? undefined : "text-shelter-ink/65"}>{children}</span>
      </span>
    </button>
  );
}

function CoatIcon({ type }: { type: "curly" | "long" | "medium" | "short" }) {
  if (type === "short") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M4 6.5h10M5 9h8M4 11.5h10" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </svg>
    );
  }

  if (type === "medium") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M3.5 6.5c1.5-1.2 3 .9 4.5 0s3 .9 4.5 0 1.5-.5 2 0M3.5 10c1.5-1.2 3 .9 4.5 0s3 .9 4.5 0 1.5-.5 2 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </svg>
    );
  }

  if (type === "long") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 18 18" aria-hidden="true">
        <path d="M2.5 5.5c2-1.4 4 1.1 6 0s4 1.1 6 0M2.5 9c2-1.4 4 1.1 6 0s4 1.1 6 0M2.5 12.5c2-1.4 4 1.1 6 0s4 1.1 6 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg className="h-4 w-4" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M6.5 5.5a2 2 0 1 1 2 2h-.8a2 2 0 1 0 2 2h.8a2 2 0 1 1-2 2M11.5 4.5a1.8 1.8 0 1 1 0 3.6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}
