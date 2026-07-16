import { NeedForm } from "@/components/admin/NeedForm";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { listAnimalsForAdmin } from "@/lib/services/animals.service";

type NewNeedPageProps = {
  searchParams: Promise<{ animalId?: string }>;
};

export default async function NewNeedPage({ searchParams }: NewNeedPageProps) {
  const user = await requirePermission("needs.createDraft");

  const { animalId } = await searchParams;
  const animals = await listAnimalsForAdmin();
  const initialAnimalId = Number(animalId);
  const canManageNeed = hasPermission(user.role, "needs.manage");

  return (
    <section>
      <h1 className="text-2xl font-semibold">Новая потребность</h1>
      {!canManageNeed ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-shelter-ink/65">
          Сотрудник может создать только черновик потребности. Публикацию, срочность и финансовые статусы подтвердит администратор.
        </p>
      ) : null}
      <NeedForm
        animals={animals}
        canManageNeed={canManageNeed}
        initialAnimalId={Number.isInteger(initialAnimalId) ? initialAnimalId : undefined}
      />
    </section>
  );
}
