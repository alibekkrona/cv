"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { createAnimal, updateAnimal } from "@/lib/services/animals.service";
import { animalFormSchema } from "@/lib/validation/animal.schema";

export async function saveAnimalAction(formData: FormData) {
  const user = await requirePermission("animals.manage");

  const parsed = animalFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    throw new Error("Некорректные данные анкеты животного.");
  }

  let animalId: number;

  if (parsed.data.id) {
    animalId = Number(parsed.data.id);
    await updateAnimal(animalId, parsed.data, user.id);
  } else {
    const animal = await createAnimal(parsed.data, user.id);
    animalId = animal.id;
  }

  revalidatePath("/admin/animals");
  revalidatePath(`/admin/animals/${animalId}/edit`);
  revalidatePath("/animals");
  revalidatePath("/");

  redirect(`/admin/animals/${animalId}/edit?saved=1`);
}
