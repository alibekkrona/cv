import { deleteNeedAction, saveNeedAction } from "@/app/actions/donations.actions";
import { AnimalPhotoFields } from "@/components/admin/AnimalPhotoFields";

type NeedFormProps = {
  animals: Array<{ id: number; name: string }>;
  canManageNeed?: boolean;
  initialAnimalId?: number;
  need?: {
    animalId?: number | null;
    description: string;
    id: number;
    isUrgent: boolean;
    photos: Array<{ alt: string | null; isCover: boolean; url: string }>;
    priority: number;
    publishedAt?: Date | null;
    raisedCents: number;
    scope: string;
    slug: string;
    status: string;
    statusChangedAt?: Date | null;
    statusChangedBy?: { email: string; name: string | null } | null;
    createdBy?: { email: string; name: string | null } | null;
    updatedBy?: { email: string; name: string | null } | null;
    targetCents: number;
    title: string;
  } | null;
  saved?: boolean;
};

export function NeedForm({ animals, canManageNeed = true, initialAnimalId, need, saved }: NeedFormProps) {
  const coverPhoto = need?.photos.find((photo) => photo.isCover) ?? need?.photos[0];
  const extraPhotoUrls = need?.photos
    .filter((photo) => photo.url !== coverPhoto?.url)
    .map((photo) => photo.url)
    .join("\n");

  return (
    <div className="mt-6 grid max-w-4xl gap-6">
      <form action={saveNeedAction} className="grid gap-6 rounded border border-shelter-ink/10 bg-white p-5">
        {saved ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            Потребность сохранена.
          </div>
        ) : null}
        {need ? <input type="hidden" name="id" value={need.id} /> : null}
        {need?.createdBy || need?.updatedBy ? (
          <div className="grid gap-2 rounded border border-shelter-ink/10 bg-shelter-cream px-4 py-3 text-xs text-shelter-ink/60 sm:grid-cols-2">
            <p>Создал: {formatActor(need.createdBy)}</p>
            <p>Последнее изменение: {formatActor(need.updatedBy)}</p>
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Название
            <input name="title" required defaultValue={need?.title ?? ""} className="rounded border border-shelter-ink/20 px-3 py-2" />
          </label>
          <label className="grid gap-1 text-sm">
            Slug
            <input name="slug" defaultValue={need?.slug ?? ""} className="rounded border border-shelter-ink/20 px-3 py-2" />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Тип
            <select name="scope" defaultValue={need?.scope ?? (initialAnimalId ? "ANIMAL" : "SHELTER")} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
              <option value="SHELTER">Потребность приюта</option>
              <option value="ANIMAL">Потребность животного</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Животное
            <select name="animalId" defaultValue={need?.animalId ?? initialAnimalId ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
              <option value="">Не выбрано</option>
              {animals.map((animal) => (
                <option key={animal.id} value={animal.id}>{animal.name}</option>
              ))}
            </select>
          </label>
          {canManageNeed ? (
            <label className="grid gap-1 text-sm">
              Статус
              <select name="status" defaultValue={need?.status ?? "ACTIVE"} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
                <option value="DRAFT">Черновик</option>
                <option value="ACTIVE">Активна</option>
                <option value="FUNDED">Сбор закрыт</option>
                <option value="FULFILLED">Реализована</option>
                <option value="PAUSED">Пауза</option>
                <option value="ANIMAL_ADOPTED">Животное отдано</option>
                <option value="ARCHIVED">Архив</option>
              </select>
              {need?.statusChangedAt || need?.statusChangedBy ? (
                <span className="text-xs leading-5 text-shelter-ink/55">
                  Последнее изменение статуса: {formatActor(need.statusChangedBy)}
                  {need.statusChangedAt ? ` / ${formatDateTime(need.statusChangedAt)}` : ""}
                </span>
              ) : null}
            </label>
          ) : (
            <input type="hidden" name="status" value="DRAFT" />
          )}
        </div>
        <div className={`grid gap-4 ${canManageNeed ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
          <label className="grid gap-1 text-sm">
            Цель, грн
            <input name="targetAmount" type="number" min="1" defaultValue={need ? need.targetCents / 100 : 1000} className="rounded border border-shelter-ink/20 px-3 py-2" />
          </label>
          {canManageNeed ? (
            <>
              <label className="grid gap-1 text-sm">
                Собрано, грн
                <input name="raisedAmount" type="number" min="0" defaultValue={need ? need.raisedCents / 100 : 0} className="rounded border border-shelter-ink/20 px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                Приоритет
                <input name="priority" type="number" defaultValue={need?.priority ?? 0} className="rounded border border-shelter-ink/20 px-3 py-2" />
              </label>
            </>
          ) : (
            <>
              <input type="hidden" name="raisedAmount" value="0" />
              <input type="hidden" name="priority" value="0" />
            </>
          )}
        </div>
        {canManageNeed ? (
          <>
            <label className="flex items-center gap-3 rounded border border-shelter-ink/10 bg-shelter-cream px-4 py-3 text-sm font-medium">
              <input
                name="isUrgent"
                type="checkbox"
                defaultChecked={need?.isUrgent ?? false}
                className="h-4 w-4 rounded border-shelter-ink/20"
              />
              Срочная потребность
            </label>
            <label className="grid gap-1 text-sm">
              Дата публикации
              <input name="publishedAt" type="date" defaultValue={formatDateInput(need?.publishedAt)} className="rounded border border-shelter-ink/20 px-3 py-2" />
            </label>
          </>
        ) : (
          <input type="hidden" name="publishedAt" value="" />
        )}
        <label className="grid gap-1 text-sm">
          Описание
          <textarea name="description" required defaultValue={need?.description ?? ""} className="min-h-32 rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
        <AnimalPhotoFields
          coverPhotoUrl={coverPhoto?.url}
          coverPhotoAlt={coverPhoto?.alt ?? undefined}
          extraPhotoUrls={extraPhotoUrls}
          galleryLabel="потребности"
          manualUrlPlaceholder="/uploads/needs/example.jpg или https://..."
          uploadFolder="needs"
        />
        <button className="w-fit rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
          Сохранить потребность
        </button>
      </form>

      {need && canManageNeed ? (
        <form action={deleteNeedAction}>
          <input type="hidden" name="id" value={need.id} />
          <button className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-600">
            Удалить потребность
          </button>
        </form>
      ) : null}
    </div>
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

function formatActor(user?: { email: string; name: string | null } | null) {
  return user?.name || user?.email || "не указано";
}

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
