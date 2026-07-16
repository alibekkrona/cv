import { LostFoundReportForm } from "@/components/lost-found/LostFoundReportForm";
import { PublicTwoColumnLayout } from "@/components/layout/PublicTwoColumnLayout";
import { listKharkivRegionSettlements } from "@/lib/services/settlements.service";

export default async function ReportLostFoundPage() {
  const settlementOptions = await listKharkivRegionSettlements();
  const aside = (
    <div className="grid gap-4">
      <section className="rounded-lg bg-white p-4">
        <h1 className="text-xl font-semibold">Сообщить о потерянном или найденном животном</h1>
        <p className="mt-2 text-sm leading-6 text-shelter-ink/65">
          Отправьте основные данные. Команда приюта проверит объявление перед публикацией.
        </p>
      </section>
      <section className="rounded-lg bg-white p-4">
        <h2 className="font-semibold">Территория поиска</h2>
        <p className="mt-2 text-sm leading-6 text-shelter-ink/65">
          Сейчас принимаем объявления по Харькову и населенным пунктам Харьковской области.
        </p>
      </section>
    </div>
  );

  return (
    <PublicTwoColumnLayout aside={aside}>
      <LostFoundReportForm mode="public" settlementOptions={settlementOptions} />
    </PublicTwoColumnLayout>
  );
}
