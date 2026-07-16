import { NeedCard } from "@/components/donations/NeedCard";
import { NeedPagination } from "@/components/donations/NeedPagination";
import { PublicTwoColumnLayout } from "@/components/layout/PublicTwoColumnLayout";
import { DonationAside } from "@/components/donations/DonationAside";
import { RecentDonations } from "@/components/donations/RecentDonations";
import { arePublicDonationsEnabled } from "@/lib/services/donation-settings.service";
import { getPublicDonationStats, listPublicNeedsPage, listRecentDonations, formatMoney } from "@/lib/services/donations.service";

export const dynamic = "force-dynamic";

type NeedsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NeedsPage({ searchParams }: NeedsPageProps) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;
  const selectedStatus = status === "closed" ? "closed" : "active";
  const pageSize = 24;
  const [result, recentDonations, stats, donationsEnabled] = await Promise.all([
    listPublicNeedsPage({ page: parsePage(params.page), pageSize, status: selectedStatus }),
    listRecentDonations(8),
    getPublicDonationStats(),
    arePublicDonationsEnabled()
  ]);

  return (
    <PublicTwoColumnLayout
      className="pb-12"
      aside={(
        <div className="grid gap-4">
          <DonationAside donationsEnabled={donationsEnabled} />
          {donationsEnabled ? (
            <section className="rounded-lg bg-white p-5">
              <h2 className="text-lg font-semibold">Уже оплачено</h2>
              <p className="mt-2 text-3xl font-semibold text-shelter-moss">{formatMoney(stats.paidCents)}</p>
              <p className="mt-2 text-sm text-shelter-ink/65">Ожидают связи: {stats.pledgedCount}</p>
            </section>
          ) : null}
          {donationsEnabled ? <RecentDonations donations={recentDonations} /> : null}
        </div>
      )}
    >
      <section>
        <h1 className="text-4xl font-semibold">Потребности приюта</h1>
        <p className="mt-4 max-w-2xl text-shelter-ink/70">
          Здесь собраны конкретные расходы: корм, лекарства, ремонт, вещи для животных и приюта.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href="/needs"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedStatus === "active" ? "bg-shelter-moss text-white" : "bg-white text-shelter-ink/70"}`}
          >
            Актуальные
          </a>
          <a
            href="/needs?status=closed"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedStatus === "closed" ? "bg-shelter-moss text-white" : "bg-white text-shelter-ink/70"}`}
          >
            Закрытые
          </a>
        </div>
      </section>

      {result.items.length ? (
        <>
          <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((need) => (
              <NeedCard key={need.id} need={need} donationsEnabled={donationsEnabled} />
            ))}
          </section>
          <NeedPagination
            currentPage={result.page}
            pageSize={result.pageSize}
            searchParams={params}
            total={result.total}
            totalPages={result.totalPages}
          />
        </>
      ) : (
        <div className="mt-8 rounded-lg bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">Потребностей пока нет</h2>
          <p className="mx-auto mt-2 max-w-md text-shelter-ink/70">
            Здесь появятся актуальные сборы или закрытые отчеты приюта.
          </p>
        </div>
      )}
    </PublicTwoColumnLayout>
  );
}

function parsePage(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return 1;
  }

  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
