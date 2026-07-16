import { saveAnimalAction } from "@/app/actions/animals.actions";
import { AnimalIdentityFields } from "@/components/admin/AnimalIdentityFields";
import { AnimalPhotoFields } from "@/components/admin/AnimalPhotoFields";
import { AnimalSubmitButton } from "@/components/admin/AnimalSubmitButton";
import type { AnimalAdminItem } from "@/lib/types/animal";

export function AnimalForm({
  animal,
  saved
}: {
  animal?: AnimalAdminItem;
  saved?: boolean;
}) {
  const coverPhoto = animal?.photos?.find((photo) => photo.isCover) ?? animal?.photos?.[0];
  const extraPhotoUrls = animal?.photos
    ?.filter((photo) => photo.url !== coverPhoto?.url)
    .map((photo) => photo.url)
    .join("\n");

  return (
    <form action={saveAnimalAction} className="mt-6 grid max-w-4xl gap-6 rounded border border-shelter-ink/10 bg-white p-5">
      {saved ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Сохранено. Сейчас показаны актуальные данные животного.
        </div>
      ) : null}
      {animal ? <input type="hidden" name="id" value={animal.id} /> : null}
      <AnimalIdentityFields name={animal?.name} slug={animal?.slug} />
      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-1 text-sm">
          Вид
          <select name="species" defaultValue={animal?.species ?? "DOG"} className="rounded border border-shelter-ink/20 px-3 py-2">
            <option value="DOG">Собака</option>
            <option value="CAT">Кошка</option>
            <option value="OTHER">Другое</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Пол
          <select name="sex" defaultValue={animal?.sex ?? "UNKNOWN"} className="rounded border border-shelter-ink/20 px-3 py-2">
            <option value="MALE">Мальчик</option>
            <option value="FEMALE">Девочка</option>
            <option value="UNKNOWN">Не указано</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Возраст, месяцев
          <input name="ageMonths" type="number" min="0" defaultValue={animal?.ageMonths ?? ""} className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Размер
          <select name="size" defaultValue={animal?.size ?? ""} className="rounded border border-shelter-ink/20 px-3 py-2">
            <option value="">Не указано</option>
            <option value="SMALL">Маленький</option>
            <option value="MEDIUM">Средний</option>
            <option value="LARGE">Большой</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          Статус
          <select name="status" defaultValue={animal?.status ?? "AVAILABLE"} className="rounded border border-shelter-ink/20 px-3 py-2">
            <option value="DRAFT">Черновик</option>
            <option value="AVAILABLE">Ищет дом</option>
            <option value="RESERVED">Зарезервирован</option>
            <option value="ADOPTED">Нашёл дом</option>
            <option value="TREATMENT">Лечение</option>
            <option value="HIDDEN">Скрыт</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Порода
          <input name="breed" defaultValue={animal?.breed ?? ""} className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Окрас
          <input name="color" defaultValue={animal?.color ?? ""} className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          Возраст текстом
          <input name="ageText" defaultValue={animal?.ageText ?? ""} placeholder="1 год, 3 месяца" className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Шерсть
          <input name="coat" defaultValue={animal?.coat ?? ""} placeholder="Короткошёрстный" className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Ссылка на видео
          <input name="videoUrl" type="url" defaultValue={animal?.videoUrl ?? ""} placeholder="https://..." className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          Номер анкеты
          <input name="cardNumber" defaultValue={animal?.cardNumber ?? ""} className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Номер вольера
          <input name="aviaryNumber" defaultValue={animal?.aviaryNumber ?? ""} className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          Дата поступления
          <input name="arrivalDate" type="date" defaultValue={formatDateInput(animal?.arrivalDate)} className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Дата публикации
          <input name="publishedAt" type="date" defaultValue={formatDateInput(animal?.publishedAt)} className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm">
          Дата статуса
          <input name="statusDate" type="date" defaultValue={formatDateInput(animal?.statusDate)} className="rounded border border-shelter-ink/20 px-3 py-2" />
        </label>
      </div>
      <div className="grid gap-3 text-sm md:grid-cols-3">
        <Checkbox name="sterilized" label="Стерилизован" defaultChecked={animal?.sterilized} />
        <Checkbox name="vaccinated" label="Вакцинирован" defaultChecked={animal?.vaccinated} />
        <Checkbox name="apartmentFriendly" label="Подходит для квартиры" defaultChecked={animal?.apartmentFriendly} />
        <Checkbox name="goodWithChildren" label="Можно с детьми" defaultChecked={animal?.goodWithChildren} />
        <Checkbox name="goodWithElderly" label="Можно пожилым людям" defaultChecked={animal?.goodWithElderly} />
        <Checkbox name="goodWithAnimals" label="Можно с другими животными" defaultChecked={animal?.goodWithAnimals} />
        <Checkbox name="needsExperiencedOwner" label="Нужен опытный владелец" defaultChecked={animal?.needsExperiencedOwner} />
        <Checkbox name="needsSpecialCare" label="Нужен особый уход" defaultChecked={animal?.needsSpecialCare} />
      </div>
      <label className="grid gap-1 text-sm">
        Описание
        <textarea name="description" defaultValue={animal?.description ?? ""} className="min-h-32 rounded border border-shelter-ink/20 px-3 py-2" />
      </label>
      <label className="grid gap-1 text-sm">
        История
        <textarea name="story" defaultValue={animal?.story ?? ""} className="min-h-32 rounded border border-shelter-ink/20 px-3 py-2" />
      </label>
      <label className="grid gap-1 text-sm">
        Здоровье
        <textarea name="healthStatus" defaultValue={animal?.healthStatus ?? ""} className="min-h-24 rounded border border-shelter-ink/20 px-3 py-2" />
      </label>
      <AnimalPhotoFields
        coverPhotoUrl={coverPhoto?.url}
        coverPhotoAlt={coverPhoto?.alt ?? undefined}
        extraPhotoUrls={extraPhotoUrls}
      />
      <AnimalSubmitButton />
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

function Checkbox({
  name,
  label,
  defaultChecked
}: {
  name: string;
  label: string;
  defaultChecked?: boolean | null;
}) {
  return (
    <label className="flex items-center gap-2 rounded border border-shelter-ink/10 px-3 py-2">
      <input name={name} type="checkbox" defaultChecked={Boolean(defaultChecked)} className="h-4 w-4" />
      {label}
    </label>
  );
}
