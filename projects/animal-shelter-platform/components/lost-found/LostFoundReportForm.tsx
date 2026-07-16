import type { LostFoundPhoto, LostFoundReport, Settlement } from "@prisma/client";
import {
  saveLostFoundReportAction,
  submitLostFoundReportAction
} from "@/app/actions/lost-found.actions";
import { AnimalPhotoFields } from "@/components/admin/AnimalPhotoFields";
import { LostFoundSubmitButton } from "@/components/lost-found/LostFoundSubmitButton";

type LostFoundReportWithPhotos = LostFoundReport & {
  cityRef?: Settlement | null;
  photos: LostFoundPhoto[];
};

type LostFoundReportFormProps = {
  mode: "admin" | "public";
  report?: LostFoundReportWithPhotos;
  saved?: boolean;
  settlementOptions: Pick<Settlement, "id" | "name">[];
};

export function LostFoundReportForm({ mode, report, saved, settlementOptions }: LostFoundReportFormProps) {
  const coverPhoto = report?.photos.find((photo) => photo.isCover) ?? report?.photos[0];
  const extraPhotoUrls = report?.photos
    .filter((photo) => photo.url !== coverPhoto?.url)
    .map((photo) => photo.url)
    .join("\n");
  const action = mode === "admin" ? saveLostFoundReportAction : submitLostFoundReportAction;

  return (
    <form action={action} className="mt-6 grid max-w-4xl gap-6 rounded border border-shelter-ink/10 bg-white p-5">
      {saved ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Сохранено. Сейчас показаны актуальные данные объявления.
        </div>
      ) : null}
      {report ? <input type="hidden" name="id" value={report.id} /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          Тип
          <select name="type" defaultValue={report?.type ?? "LOST"} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="LOST">Потеряно</option>
            <option value="FOUND">Найдено</option>
          </select>
        </label>
        {mode === "admin" ? (
          <label className="grid gap-1 text-sm">
            Статус
            <select name="status" defaultValue={report?.status ?? "SUBMITTED"} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
              <option value="SUBMITTED">На проверке</option>
              <option value="PUBLISHED">Опубликовано</option>
              <option value="MATCHED">Совпадение найдено</option>
              <option value="CLOSED">Закрыто</option>
              <option value="ARCHIVED">Архив</option>
            </select>
          </label>
        ) : null}
        <label className="grid gap-1 text-sm">
          Вид
          <select name="species" defaultValue={report?.species ?? "DOG"} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="DOG">Собака</option>
            <option value="CAT">Кошка</option>
            <option value="OTHER">Другое</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          Пол
          <select name="sex" defaultValue={report?.sex ?? "UNKNOWN"} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="MALE">Мальчик</option>
            <option value="FEMALE">Девочка</option>
            <option value="UNKNOWN">Не указано</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Размер
          <select name="size" defaultValue={report?.size ?? ""} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            <option value="">Не указано</option>
            <option value="SMALL">Маленький</option>
            <option value="MEDIUM">Средний</option>
            <option value="LARGE">Большой</option>
            <option value="UNKNOWN">Не указано</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Дата события
          <input
            name="eventDate"
            type="date"
            defaultValue={formatDateInput(report?.eventDate)}
            className="rounded border border-shelter-ink/20 px-3 py-2"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Заголовок
          <input name="title" required defaultValue={report?.title ?? ""} className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Slug
          <input name="slug" defaultValue={report?.slug ?? ""} placeholder="Сгенерируется из заголовка, если оставить пустым" className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        Описание
        <textarea name="description" required defaultValue={report?.description ?? ""} className="min-h-32 rounded border border-shelter-ink/20 px-3 py-2" />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          Город
          <select name="cityId" defaultValue={String(report?.cityId ?? settlementOptions[0]?.id ?? "")} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
            {settlementOptions.map((settlement) => (
              <option key={settlement.id} value={settlement.id}>
                {settlement.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Район
          <input name="district" defaultValue={report?.district ?? ""} className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Детали места
          <input name="locationText" defaultValue={report?.locationText ?? ""} className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          Имя для связи
          <input name="contactName" required defaultValue={report?.contactName ?? ""} className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Телефон для связи
          <input name="contactPhone" required defaultValue={report?.contactPhone ?? ""} className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Email для связи
          <input name="contactEmail" type="email" defaultValue={report?.contactEmail ?? ""} className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
      </div>

      {mode === "admin" ? (
        <label className="grid gap-1 text-sm">
          Внутренняя заметка
          <textarea name="adminNote" defaultValue={report?.adminNote ?? ""} className="min-h-24 rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
      ) : null}

      <AnimalPhotoFields
        coverPhotoUrl={coverPhoto?.url}
        coverPhotoAlt={coverPhoto?.alt ?? undefined}
        extraPhotoUrls={extraPhotoUrls}
        galleryLabel="галерее объявления"
        manualUrlPlaceholder="/uploads/lost-found/example.jpg или https://..."
        uploadFolder="lost-found"
      />

      <LostFoundSubmitButton
        idleLabel={mode === "admin" ? "Сохранить объявление" : "Отправить объявление"}
        pendingLabel={mode === "admin" ? "Сохраняем..." : "Отправляем..."}
      />
    </form>
  );
}

function formatDateInput(date?: Date | null) {
  if (!date) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}
