"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { AnimalFiltersInput } from "@/lib/types/animal";

type AnimalSortSelectProps = {
  sort: AnimalFiltersInput["sort"];
  total: number;
};

export function AnimalSortSelect({ sort, total }: AnimalSortSelectProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value || value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }

    params.delete("page");

    const queryString = params.toString();
    const href = queryString ? `${pathname}?${queryString}` : pathname;

    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded border border-shelter-ink/10 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-shelter-ink/60">Найдено: {total}</p>
      <label className="flex items-center gap-2 text-sm">
        Сортировка
        <select
          value={sort ?? "newest"}
          disabled={isPending}
          onChange={(event) => updateSort(event.currentTarget.value)}
          className="rounded border border-shelter-ink/20 bg-white px-3 py-2"
        >
          <option value="newest">Сначала новые</option>
          <option value="name">По имени</option>
          <option value="age-young">Сначала младшие</option>
          <option value="age-old">Сначала старшие</option>
        </select>
      </label>
    </div>
  );
}
