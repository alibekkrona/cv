"use client";

import { useEffect } from "react";

export function AnimalPageScrollReset() {
  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo({ left: 0, top: 0 });
    }
  }, []);

  return null;
}
