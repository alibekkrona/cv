"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
};

export function SubmitButton({ children }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className={`w-fit rounded px-4 py-2 text-sm font-medium text-white transition ${
        pending
          ? "cursor-wait bg-shelter-ink/45"
          : "bg-shelter-moss"
      }`}
    >
      {children}
    </button>
  );
}
