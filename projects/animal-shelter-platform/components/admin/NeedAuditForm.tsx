import { saveNeedAuditAction } from "@/app/actions/donations.actions";
import { AnimalPhotoFields } from "@/components/admin/AnimalPhotoFields";

type NeedAuditFormProps = {
  audit?: {
    description: string;
    id: number;
    photos: Array<{ alt: string | null; isCover: boolean; url: string }>;
    publishedAt?: Date | null;
    title: string;
  } | null;
  needId: number;
  needTitle: string;
  saved?: boolean;
};

export function NeedAuditForm({ audit, needId, needTitle, saved }: NeedAuditFormProps) {
  const coverPhoto = audit?.photos.find((photo) => photo.isCover) ?? audit?.photos[0];
  const extraPhotoUrls = audit?.photos
    .filter((photo) => photo.url !== coverPhoto?.url)
    .map((photo) => photo.url)
    .join("\n");

  return (
    <form action={saveNeedAuditAction} className="grid gap-6 rounded border border-shelter-ink/10 bg-white p-5">
      {saved ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Отчет сохранен. Потребность переведена в статус реализованной.
        </div>
      ) : null}
      <input type="hidden" name="needId" value={needId} />
      {audit ? <input type="hidden" name="id" value={audit.id} /> : null}
      <div>
        <h2 className="text-xl font-semibold">Отчет по потребности</h2>
        <p className="mt-2 text-sm leading-6 text-shelter-ink/65">
          Фотоотчет публикуется на странице потребности и показывает, что сбор был реализован.
        </p>
      </div>
      <label className="grid gap-1 text-sm">
        Заголовок отчета
        <input
          name="title"
          required
          defaultValue={audit?.title ?? `Отчет: ${needTitle}`}
          className="rounded border border-shelter-ink/20 px-3 py-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Дата отчета
        <input name="publishedAt" type="date" defaultValue={formatDateInput(audit?.publishedAt)} className="rounded border border-shelter-ink/20 px-3 py-2" />
      </label>
      <label className="grid gap-1 text-sm">
        Описание отчета
        <textarea
          name="description"
          required
          defaultValue={audit?.description ?? ""}
          className="min-h-28 rounded border border-shelter-ink/20 px-3 py-2"
        />
      </label>
      <AnimalPhotoFields
        coverPhotoUrl={coverPhoto?.url}
        coverPhotoAlt={coverPhoto?.alt ?? undefined}
        extraPhotoUrls={extraPhotoUrls}
        galleryLabel="отчета"
        manualUrlPlaceholder="/uploads/needs/report-example.jpg или https://..."
        uploadFolder="needs"
      />
      <button className="w-fit rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
        Сохранить отчет и отметить реализованной
      </button>
    </form>
  );
}

function formatDateInput(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}
