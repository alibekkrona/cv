"use client";

import { useFormStatus } from "react-dom";

export function AnimalSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="w-fit rounded bg-shelter-moss px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-65"
    >
      {pending ? "Сохраняем..." : "Сохранить животное"}
    </button>
  );
}
