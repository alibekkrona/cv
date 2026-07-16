"use client";

import { useEffect } from "react";
import { recordAnimalViewAction } from "@/app/actions/social.actions";

type AnimalViewTrackerProps = {
  animalId: number;
  animalSlug: string;
};

export function AnimalViewTracker({ animalId, animalSlug }: AnimalViewTrackerProps) {
  useEffect(() => {
    const formData = new FormData();
    formData.set("animalId", String(animalId));
    formData.set("animalSlug", animalSlug);
    void recordAnimalViewAction(formData);
  }, [animalId, animalSlug]);

  return null;
}
