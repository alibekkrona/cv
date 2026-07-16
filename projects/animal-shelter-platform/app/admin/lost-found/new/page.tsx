import { LostFoundReportForm } from "@/components/lost-found/LostFoundReportForm";
import { requirePermission } from "@/lib/auth/permissions";
import { listKharkivRegionSettlements } from "@/lib/services/settlements.service";

export default async function AdminNewLostFoundPage() {
  await requirePermission("lostFound.manage");
  const settlementOptions = await listKharkivRegionSettlements();

  return (
    <section>
      <h1 className="text-2xl font-semibold">Добавить объявление</h1>
      <LostFoundReportForm mode="admin" settlementOptions={settlementOptions} />
    </section>
  );
}
