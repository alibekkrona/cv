import { AnimalForm } from "@/components/admin/AnimalForm";
import { requirePermission } from "@/lib/auth/permissions";

export default async function NewAnimalPage() {
  await requirePermission("animals.manage");

  return (
    <section>
      <h1 className="text-2xl font-semibold">Добавить животное</h1>
      <AnimalForm />
    </section>
  );
}
