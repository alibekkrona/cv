import { notFound } from "next/navigation";
import { NeedAuditForm } from "@/components/admin/NeedAuditForm";
import { NeedForm } from "@/components/admin/NeedForm";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { listAnimalsForAdmin } from "@/lib/services/animals.service";
import { getAdminNeedById } from "@/lib/services/donations.service";

export const dynamic = "force-dynamic";

type EditNeedPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auditSaved?: string; saved?: string }>;
};

export default async function EditNeedPage({ params, searchParams }: EditNeedPageProps) {
  const user = await requirePermission("needs.manage");
  const { id } = await params;
  const { auditSaved, saved } = await searchParams;
  const needId = Number(id);
  const [need, animals] = await Promise.all([
    getAdminNeedById(needId),
    listAnimalsForAdmin()
  ]);

  if (!need) {
    notFound();
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold">Редактировать потребность</h1>
      <NeedForm animals={animals} canManageNeed need={need} saved={saved === "1"} />
      {hasPermission(user.role, "needAudits.manage") ? (
        <div className="mt-6 max-w-4xl">
          <NeedAuditForm audit={need.audits[0]} needId={need.id} needTitle={need.title} saved={auditSaved === "1"} />
        </div>
      ) : null}
    </section>
  );
}
