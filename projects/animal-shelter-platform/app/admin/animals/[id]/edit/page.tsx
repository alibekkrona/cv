import Link from "next/link";
import { notFound } from "next/navigation";
import { AnimalCommentsModeration } from "@/components/admin/AnimalCommentsModeration";
import { AnimalForm } from "@/components/admin/AnimalForm";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getAnimalForAdmin } from "@/lib/services/animals.service";
import { getAnimalCommentsForAdmin } from "@/lib/services/social.service";

export const dynamic = "force-dynamic";

type EditAnimalPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export default async function EditAnimalPage({ params, searchParams }: EditAnimalPageProps) {
  const user = await requirePermission("animals.manage");

  const { id } = await params;
  const { saved } = await searchParams;
  const animalId = Number(id);
  const [animal, comments] = await Promise.all([
    getAnimalForAdmin(animalId),
    Number.isInteger(animalId) ? getAnimalCommentsForAdmin(animalId) : []
  ]);

  if (!animal) {
    notFound();
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Редактировать животное</h1>
        <Link href={`/animals/${animal.slug}`} className="rounded border border-shelter-moss px-4 py-2 text-sm font-medium text-shelter-moss">
          Открыть страницу
        </Link>
      </div>
      <nav className="mt-5 flex flex-wrap gap-2 text-sm font-medium" aria-label="Разделы животного">
        <a href="#animal-form" className="rounded border border-shelter-moss bg-shelter-moss px-4 py-2 text-white">
          Анкета
        </a>
        <a href="#animal-comments" className="rounded border border-shelter-ink/15 bg-white px-4 py-2 text-shelter-ink/75">
          Комментарии
        </a>
        <Link href={`/admin/needs/new?animalId=${animal.id}`} className="rounded border border-shelter-ink/15 bg-white px-4 py-2 text-shelter-ink/75">
          Создать потребность
        </Link>
      </nav>
      <div id="animal-form">
        <AnimalForm animal={animal} saved={saved === "1"} />
      </div>
      <AnimalCommentsModeration
        animalId={animal.id}
        canDelete={hasPermission(user.role, "comments.delete")}
        comments={comments}
      />
    </section>
  );
}
