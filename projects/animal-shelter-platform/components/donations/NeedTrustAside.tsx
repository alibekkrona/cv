import { DonationButton } from "@/components/donations/DonationButton";
import { NeedAnimalAsideCard } from "@/components/donations/NeedAnimalAsideCard";
import { NeedCard } from "@/components/donations/NeedCard";
import { RecentDonations } from "@/components/donations/RecentDonations";
import { formatMoney } from "@/lib/services/donations.service";

type NeedTrustAsideProps = {
  donationsEnabled?: boolean;
  donations: Parameters<typeof RecentDonations>[0]["donations"];
  need: Parameters<typeof NeedCard>[0]["need"];
  otherNeeds: Parameters<typeof NeedCard>[0]["need"][];
  stats: {
    activeNeedsCount: number;
    paidCents: number;
    paidCount: number;
  };
};

export function NeedTrustAside({ donationsEnabled = true, donations, need, otherNeeds, stats }: NeedTrustAsideProps) {
  const canDonateToNeed = need.status === "ACTIVE";

  return (
    <div className="grid gap-4">
      {canDonateToNeed && donationsEnabled ? (
        <section className="rounded-lg bg-white p-5">
          <h2 className="text-xl font-semibold">Помочь закрыть сбор</h2>
          <p className="mt-2 text-sm leading-6 text-shelter-ink/70">
            Донат пойдет именно на эту потребность. Если сбор будет закрыт, команда приюта направит остаток на ближайшие расходы животных.
          </p>
          <div className="mt-4">
            <DonationButton
              label="Помочь"
              needId={need.id}
              needTitle={need.title}
              target="NEED"
              className="w-full rounded-lg bg-shelter-moss px-4 py-2 text-sm font-semibold text-white"
            />
          </div>
        </section>
      ) : null}

      {need.animal ? <NeedAnimalAsideCard animal={need.animal} /> : null}

      {donationsEnabled ? (
        <section className="rounded-lg bg-white p-5">
          <h2 className="text-lg font-semibold">Приюту уже помогли на</h2>
          <p className="mt-3 text-3xl font-semibold text-shelter-moss">{formatMoney(stats.paidCents)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-shelter-cream p-3">
              <p className="text-xl font-semibold">{stats.paidCount}</p>
              <p className="mt-1 text-shelter-ink/60">всего донатов</p>
            </div>
            <div className="rounded-lg bg-shelter-cream p-3">
              <p className="text-xl font-semibold">{stats.activeNeedsCount}</p>
              <p className="mt-1 text-shelter-ink/60">осталось потребностей</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-shelter-ink/65">
            Это сумма всех оплаченных донатов через сайт. Средства идут на корм, лечение, ремонт вольеров и ежедневный уход.
          </p>
        </section>
      ) : null}

      {donationsEnabled ? <RecentDonations donations={donations} /> : null}

      {otherNeeds.length ? (
        <section className="rounded-lg bg-white p-5">
          <h2 className="text-lg font-semibold">Другие потребности</h2>
          <div className="mt-4 grid gap-3">
            {otherNeeds.map((otherNeed) => (
              <NeedCard key={otherNeed.id} need={otherNeed} compact donationsEnabled={donationsEnabled} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
