"use client";

import type { ApplicationStatus } from "@prisma/client";
import { useTransition } from "react";

type ApplicationStatusSelectProps = {
  applicationId: number;
  defaultValue: ApplicationStatus;
  defaultLabel: string;
  options: {
    label: string;
    value: ApplicationStatus;
  }[];
};

export function ApplicationStatusSelect({
  applicationId,
  defaultValue,
  defaultLabel,
  options
}: ApplicationStatusSelectProps) {
  const [isPending, startTransition] = useTransition();
  const defaultValueIsAvailable = options.some((option) => option.value === defaultValue);

  return (
    <div className="grid gap-1">
      <label htmlFor={`application-status-${applicationId}`} className="text-xs font-medium text-shelter-ink/70">
        Статус заявки
      </label>
      <select
        id={`application-status-${applicationId}`}
        name="status"
        defaultValue={defaultValue}
        aria-label="Статус заявки"
        disabled={isPending}
        onChange={(event) => {
          if (event.currentTarget.value === defaultValue) {
            return;
          }

          const form = event.currentTarget.form;

          if (!form) {
            return;
          }

          startTransition(() => {
            form.requestSubmit();
          });
        }}
        className="w-48 rounded border border-shelter-ink/20 bg-white px-2 py-1 text-sm disabled:opacity-60"
      >
        {!defaultValueIsAvailable ? (
          <option value={defaultValue} disabled>
            {defaultLabel}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="max-w-48 text-xs leading-4 text-shelter-ink/50">
        При выборе нового статуса заявка сохранится автоматически.
      </p>
    </div>
  );
}
