import { NeedPhotoBadgeGallery } from "@/components/donations/NeedPhotoBadgeGallery";

type NeedAuditSectionProps = {
  audit: {
    description: string;
    photos: Array<{ alt: string | null; id?: number; url: string }>;
    publishedAt?: Date | string | null;
    title: string;
  };
};

export function NeedAuditSection({ audit }: NeedAuditSectionProps) {
  const cover = audit.photos[0];

  return (
    <section className="mt-6 rounded-lg bg-white p-5">
      <p className="text-sm font-semibold text-shelter-moss">Отчет о реализации</p>
      <h2 className="mt-2 text-2xl font-semibold">{audit.title}</h2>
      {audit.publishedAt ? (
        <p className="mt-2 text-sm text-shelter-ink/55">{formatDate(audit.publishedAt)}</p>
      ) : null}
      <p className="mt-4 whitespace-pre-line leading-7 text-shelter-ink/75">{audit.description}</p>
      {cover ? (
        <div className="mt-5 aspect-video overflow-hidden rounded-lg bg-white">
          <NeedPhotoBadgeGallery
            className="relative block h-full w-full cursor-zoom-in"
            label={audit.title}
            photos={audit.photos}
          >
            <img src={cover.url} alt={cover.alt ?? audit.title} className="h-full w-full object-contain" />
            {audit.photos.length > 1 ? (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-4 pb-3 pt-10 text-center text-sm font-semibold text-white/90">
                {audit.photos.length} фото
              </span>
            ) : null}
          </NeedPhotoBadgeGallery>
        </div>
      ) : null}
    </section>
  );
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}
