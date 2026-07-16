import { formatMoney } from "@/lib/services/donations.service";

type RecentDonation = {
  amountCents: number;
  animal?: { name: string } | null;
  donorName?: string | null;
  isAnonymous: boolean;
  need?: { title: string } | null;
  target: string;
};

export function RecentDonations({ donations }: { donations: RecentDonation[] }) {
  return (
    <section className="rounded-lg bg-white p-5">
      <h2 className="text-lg font-semibold">Кто уже помогает</h2>
      <div className="mt-4 grid gap-3">
        {donations.length ? donations.map((donation, index) => (
          <div key={index} className="rounded-lg bg-shelter-cream p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">{donation.isAnonymous ? "Анонимно" : donation.donorName || "Добрый человек"}</p>
              <p className="text-sm font-semibold text-shelter-moss">{formatMoney(donation.amountCents)}</p>
            </div>
            <p className="mt-1 text-xs text-shelter-ink/60">{formatDonationTarget(donation)}</p>
          </div>
        )) : (
          <p className="text-sm leading-6 text-shelter-ink/65">Первые донаты появятся здесь.</p>
        )}
      </div>
    </section>
  );
}

function formatDonationTarget(donation: RecentDonation) {
  if (donation.need) {
    return donation.need.title;
  }

  if (donation.animal) {
    return `Для ${donation.animal.name}`;
  }

  return "На приют";
}
