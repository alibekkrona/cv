"use client";

import { useEffect } from "react";

const storageKey = "animalShelterAdminSettingsScrollY";

export function SettingsScrollRestorer() {
  useEffect(() => {
    const storedScrollY = sessionStorage.getItem(storageKey);

    if (storedScrollY) {
      sessionStorage.removeItem(storageKey);
      const scrollY = Number(storedScrollY);

      if (Number.isFinite(scrollY)) {
        requestAnimationFrame(() => {
          window.scrollTo({ left: 0, top: scrollY, behavior: "instant" });
        });
      }
    }

    const handleSubmit = () => {
      sessionStorage.setItem(storageKey, String(window.scrollY));
    };

    document.addEventListener("submit", handleSubmit, true);

    return () => {
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  return null;
}
