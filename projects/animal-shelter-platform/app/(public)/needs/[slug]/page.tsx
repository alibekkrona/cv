import { notFound } from "next/navigation";
import { DonationButton } from "@/components/donations/DonationButton";
import { NeedAuditSection } from "@/components/donations/NeedAuditSection";
import { NeedPhotoBadgeGallery } from "@/components/donations/NeedPhotoBadgeGallery";
import { NeedTrustAside } from "@/components/donations/NeedTrustAside";
import { PublicTwoColumnLayout } from "@/components/layout/PublicTwoColumnLayout";
import { arePublicDonationsEnabled } from "@/lib/services/donation-settings.service";
import {
  formatMoney,
  getNeedProgress,
  getPublicDonationStats,
  getPublicNeedBySlug,
  listPublicNeeds,
  listRecentDonations
} from "@/lib/services/donations.service";

export const dynamic = "force-dynamic";

type NeedPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function NeedPage({ params }: NeedPageProps) {
  const { slug } = await params;
  const [need, recentDonations, stats, needs, donationsEnabled] = await Promise.all([
    getPublicNeedBySlug(slug),
    listRecentDonations(5),
    getPublicDonationStats(),
    listPublicNeeds({ limit: 6 }),
    arePublicDonationsEnabled()
  ]);

  if (!need) {
    notFound();
  }

  const cover = need.photos[0];
  const audit = need.audits[0];
  const otherNeeds = needs.filter((item) => item.id !== need.id).slice(0, 3);
  const progress = getNeedProgress(need.raisedCents, need.targetCents);

  return (
    <PublicTwoColumnLayout
      className="pb-12"
      aside={<NeedTrustAside donationsEnabled={donationsEnabled} donations={recentDonations} need={need} otherNeeds={otherNeeds} stats={stats} />}
    >
      <article className="min-w-0">
        {cover ? (
          <div className="aspect-video overflow-hidden rounded-lg bg-white">
            <NeedPhotoBadgeGallery
              className="relative block h-full w-full cursor-zoom-in"
              label={need.title}
              photos={need.photos}
            >
              <img src={cover.url} alt={cover.alt ?? need.title} className="h-full w-full object-contain" />
              {need.photos.length > 1 ? (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-4 pb-3 pt-10 text-center text-sm font-semibold text-white/90">
                  {need.photos.length} фото
                </span>
              ) : null}
            </NeedPhotoBadgeGallery>
          </div>
        ) : null}
        <div className="mt-6 rounded-lg bg-white p-5">
          <p className="text-sm font-semibold text-shelter-moss">{need.animal ? `Для ${need.animal.name}` : "Для приюта"}</p>
          <h1 className="mt-2 text-3xl font-semibold">{need.title}</h1>
          <p className="mt-4 whitespace-pre-line leading-7 text-shelter-ink/75">{need.description}</p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-shelter-ink/10">
            <div className="h-full rounded-full bg-shelter-moss" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-shelter-ink/65">
            <span>{formatMoney(need.raisedCents)}</span>
            <span>из {formatMoney(need.targetCents)}</span>
          </div>
          {need.status === "ACTIVE" && donationsEnabled ? (
            <div className="mt-6">
              <DonationButton label="Помочь с этой потребностью" needId={need.id} needTitle={need.title} target="NEED" />
            </div>
          ) : null}
        </div>
        {audit ? <NeedAuditSection audit={audit} /> : null}
      </article>
    </PublicTwoColumnLayout>
  );
}
