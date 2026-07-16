import Link from "next/link";
import { notFound } from "next/navigation";
import { LostFoundReportForm } from "@/components/lost-found/LostFoundReportForm";
import { requirePermission } from "@/lib/auth/permissions";
import { getLostFoundReportForAdmin } from "@/lib/services/lost-found.service";
import { listKharkivRegionSettlements } from "@/lib/services/settlements.service";

export const dynamic = "force-dynamic";

type AdminEditLostFoundPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    saved?: string;
  }>;
};

export default async function AdminEditLostFoundPage({ params, searchParams }: AdminEditLostFoundPageProps) {
  await requirePermission("lostFound.manage");

  const { id } = await params;
  const { saved } = await searchParams;
  const [report, settlementOptions] = await Promise.all([
    getLostFoundReportForAdmin(Number(id)),
    listKharkivRegionSettlements()
  ]);

  if (!report) {
    notFound();
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Редактировать объявление</h1>
        {report.status === "PUBLISHED" ? (
          <Link href={`/lost-found/${report.slug}`} className="rounded border border-shelter-moss px-4 py-2 text-sm font-medium text-shelter-moss">
            Открыть страницу
          </Link>
        ) : null}
      </div>
      <LostFoundReportForm mode="admin" report={report} saved={saved === "1"} settlementOptions={settlementOptions} />
    </section>
  );
}
