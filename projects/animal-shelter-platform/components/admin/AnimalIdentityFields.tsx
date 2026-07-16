"use client";

import { useState } from "react";
import { normalizeSlug } from "@/lib/utils/slug";

type AnimalIdentityFieldsProps = {
  name?: string;
  slug?: string;
};

export function AnimalIdentityFields({ name = "", slug = "" }: AnimalIdentityFieldsProps) {
  const [currentName, setCurrentName] = useState(name);
  const [currentSlug, setCurrentSlug] = useState(slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(slug));

  function updateName(value: string) {
    setCurrentName(value);

    if (!slugTouched) {
      setCurrentSlug(normalizeSlug(value));
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-1 text-sm">
        Имя
        <input
          name="name"
          value={currentName}
          onChange={(event) => updateName(event.target.value)}
          required
          className="rounded border border-shelter-ink/20 px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Slug
        <input
          name="slug"
          value={currentSlug}
          onChange={(event) => {
            setSlugTouched(true);
            setCurrentSlug(normalizeSlug(event.target.value));
          }}
          placeholder="Сгенерируется из имени, если оставить пустым"
          className="rounded border border-shelter-ink/20 px-3 py-2"
        />
      </label>
    </div>
  );
}
