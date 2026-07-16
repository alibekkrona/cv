import Link from "next/link";
import type { Need } from "@prisma/client";
import { DonationButton } from "@/components/donations/DonationButton";
import { NeedPhotoBadgeGallery } from "@/components/donations/NeedPhotoBadgeGallery";
import { formatMoney, getNeedProgress } from "@/lib/services/donations.service";

type NeedCardProps = {
  compact?: boolean;
  donationsEnabled?: boolean;
  need: Need & {
    animal?: {
      name: string;
      photos?: Array<{ alt: string | null; url: string }>;
      slug: string;
    } | null;
    photos?: Array<{ alt: string | null; id?: number; url: string }>;
  };
};

export function NeedCard({ compact = false, donationsEnabled = true, need }: NeedCardProps) {
  const animalCover = need.scope === "ANIMAL" ? need.animal?.photos?.[0] : null;
  const needCover = need.photos?.[0];
  const cover = animalCover ?? needCover;
  const canDonate = need.status === "ACTIVE";
  const progress = getNeedProgress(need.raisedCents, need.targetCents);

  return (
    <article className="overflow-hidden rounded-lg bg-white">
      {cover ? (
        <div className="relative aspect-[16/9] bg-shelter-leaf/20">
          <Link href={`/needs/${need.slug}`} className="block h-full w-full">
            <img
              src={cover.url}
              alt={cover.alt ?? need.title}
              className={`h-full w-full ${animalCover ? "object-cover" : "bg-white object-contain"}`}
            />
          </Link>
          {need.isUrgent ? (
            <span className="absolute right-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              Срочно
            </span>
          ) : null}
          {animalCover && need.photos?.length ? (
            <NeedPhotoBadgeGallery label={need.title} photos={need.photos} />
          ) : null}
        </div>
      ) : null}
      <div className={compact ? "py-4" : "p-4"}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={`/needs/${need.slug}`} className="font-semibold hover:text-shelter-moss">
              {need.title}
            </Link>
            <p className="mt-1 text-xs text-shelter-ink/55">
              {need.animal ? (
                <Link href={`/animals/${need.animal.slug}`} className="font-medium hover:text-shelter-moss">
                  Для {need.animal.name}
                </Link>
              ) : "Для приюта"}
            </p>
          </div>
          <span className="rounded-full bg-shelter-ink/10 px-2 py-1 text-xs text-shelter-ink/70">
            {progress}%
          </span>
        </div>
        {!compact ? (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-shelter-ink/70">{need.description}</p>
        ) : null}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-shelter-ink/10">
          <div className="h-full rounded-full bg-shelter-moss" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-sm text-shelter-ink/65">
          <span>{formatMoney(need.raisedCents)}</span>
          <span>из {formatMoney(need.targetCents)}</span>
        </div>
        {canDonate && donationsEnabled ? (
          <div className="mt-4">
            <DonationButton
              label="Помочь"
              needId={need.id}
              needTitle={need.title}
              target="NEED"
              className="w-full rounded-lg bg-shelter-moss px-4 py-2 text-sm font-semibold text-white"
            />
          </div>
        ) : (
          <Link href={`/needs/${need.slug}`} className="mt-4 block rounded-lg bg-shelter-cream px-4 py-2 text-center text-sm font-semibold">
            {need.status === "FULFILLED" ? "Смотреть отчет" : canDonate ? "Подробнее" : "Сбор закрыт"}
          </Link>
        )}
      </div>
    </article>
  );
}
