"use client";

import { useFormStatus } from "react-dom";

export function LostFoundSubmitButton({
  idleLabel,
  pendingLabel
}: {
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="w-fit rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-65"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
