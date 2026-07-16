import { notFound } from "next/navigation";
import { AnimalComments } from "@/components/animals/AnimalComments";
import { AnimalGallery } from "@/components/animals/AnimalGallery";
import { AnimalPageScrollReset } from "@/components/animals/AnimalPageScrollReset";
import { AnimalSocialBar } from "@/components/animals/AnimalSocialBar";
import { AnimalViewTracker } from "@/components/animals/AnimalViewTracker";
import { DonationAside } from "@/components/donations/DonationAside";
import { NeedCard } from "@/components/donations/NeedCard";
import { AdoptionApplicationForm } from "@/components/forms/AdoptionApplicationForm";
import { PublicTwoColumnLayout } from "@/components/layout/PublicTwoColumnLayout";
import { ViewportHero } from "@/components/layout/ViewportHero";
import { getAnimalBySlug } from "@/lib/services/animals.service";
import { arePublicDonationsEnabled } from "@/lib/services/donation-settings.service";
import { getAnimalSocialState } from "@/lib/services/social.service";
import { listPublicNeeds } from "@/lib/services/donations.service";
import { listKharkivRegionSettlements } from "@/lib/services/settlements.service";
import {
  formatVisitHoursSummary,
  formatWalkingHoursSummary,
  getVisitHours,
  getWalkingHours
} from "@/lib/services/visit-hours.service";
import { getVisitorKey } from "@/lib/visitor";

export const dynamic = "force-dynamic";

type AnimalPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ commentsPage?: string }>;
};

export default async function AnimalPage({ params, searchParams }: AnimalPageProps) {
  const { slug } = await params;
  const { commentsPage } = await searchParams;
  const animal = await getAnimalBySlug(slug);

  if (!animal) {
    notFound();
  }

  const visitorKey = await getVisitorKey();
  const [visitHours, walkingHours, socialState, animalNeeds, allAnimalNeeds, settlementOptions, donationsEnabled] = await Promise.all([
    getVisitHours(),
    getWalkingHours(),
    getAnimalSocialState(animal.id, visitorKey, { commentsPage: parsePage(commentsPage), commentsPageSize: 10 }),
    listPublicNeeds({ animalId: animal.id, limit: 2, scope: "ANIMAL" }),
    listPublicNeeds({ animalId: animal.id, scope: "ANIMAL", status: "all" }),
    listKharkivRegionSettlements(),
    arePublicDonationsEnabled()
  ]);
  const visitHoursSummary = formatVisitHoursSummary(visitHours);
  const walkingHoursSummary = formatWalkingHoursSummary(walkingHours);

  const facts = [
    ["Вид", formatEnum(animal.species)],
    ["Пол", formatEnum(animal.sex)],
    ["Возраст", animal.ageText ?? formatAge(animal.ageMonths)],
    ["Размер", animal.size ? formatEnum(animal.size) : "Не указано"],
    ["Порода", animal.breed ?? "Не указано"],
    ["Окрас", animal.color ?? "Не указано"],
    ["Шерсть", animal.coat ?? "Не указано"],
    ["Стерилизован", animal.sterilized ? "Да" : "Нет"],
    ["Вакцинирован", animal.vaccinated ? "Да" : "Нет"],
    animal.arrivalDate ? ["Дата поступления", formatDate(animal.arrivalDate)] : null,
    animal.cardNumber ? ["Номер анкеты", animal.cardNumber] : null,
    animal.aviaryNumber ? ["Вольер", animal.aviaryNumber] : null
  ].filter((fact): fact is [string, string] => Boolean(fact));

  const videoUrl = normalizeUrl(animal.videoUrl);
  const shelterDetails = [
    animal.statusDate ? ["Дата статуса", formatDate(animal.statusDate)] : null
  ].filter((detail): detail is [string, string] => Boolean(detail));

  const fit = [
    animal.goodWithChildren ? "Может подойти семье с детьми" : null,
    animal.goodWithElderly ? "Может подойти пожилому человеку" : null,
    animal.goodWithAnimals ? "Может жить с другими животными" : null,
    animal.apartmentFriendly ? "Может жить в квартире" : null,
    animal.needsExperiencedOwner ? "Нужен опытный владелец" : null,
    animal.needsSpecialCare ? "Нужен особый уход" : null
  ].filter(Boolean);
  const tags = animal.tags.map((item) => item.tag.name);
  const publicDate = animal.publishedAt && animal.publishedAt <= new Date()
    ? animal.publishedAt
    : animal.createdAt;

  return (
    <PublicTwoColumnLayout
      className="pb-6"
      aside={(
        <aside className="grid gap-4">
          <DonationAside animalId={animal.id} animalName={animal.name} needs={animalNeeds} donationsEnabled={donationsEnabled} />
          <div className="mb-4 rounded-lg bg-shelter-ink/5 p-5">
            <h2 className="text-xl font-semibold">Думаете о {animal.name}?</h2>
            <p className="mt-2 text-sm leading-6 text-shelter-ink/70">
              Отправьте короткую заявку. Сотрудники приюта свяжутся с вами и помогут
              понять, подойдёт ли это животное вашему дому и ритму жизни.
            </p>
          </div>
          <AdoptionApplicationForm
            animalId={animal.id}
            animalSpecies={animal.species}
            settlementOptions={settlementOptions}
            walkingHoursSummary={walkingHoursSummary}
          />
        </aside>
      )}
    >
      <AnimalPageScrollReset />
      <AnimalViewTracker animalId={animal.id} animalSlug={animal.slug} />
      <article className="min-w-0">
        <ViewportHero className="flex min-h-[520px] flex-col">
          <div className="min-h-0 flex-1">
            <AnimalGallery animalName={animal.name} className="w-full" fillAvailable photos={animal.photos} />
          </div>

          <div className="grid gap-2 pb-2 pt-[2px] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="grid gap-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0">
                <h1 className="text-3xl font-semibold leading-none">{animal.name}</h1>
                <p className="text-sm font-medium leading-none text-shelter-ink/60">
                  {formatEnum(animal.species)} / {formatEnum(animal.status)}
                </p>
              </div>
              <p className="mt-1.5 text-sm font-medium leading-none text-shelter-ink/70">
                {formatViews(socialState.viewCount, true)} {formatRelativeTime(publicDate)}
              </p>
            </div>
            <div className="justify-self-start sm:justify-self-end">
              <AnimalSocialBar
                animalId={animal.id}
                animalSlug={animal.slug}
                commentCount={socialState.commentCount}
                initialIsLiked={socialState.isLiked}
                initialLikeCount={socialState.likeCount}
              />
            </div>
          </div>
        </ViewportHero>

        <details className="group mt-5 rounded-lg bg-shelter-ink/5 p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold">
            <span>Анкета животного</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-shelter-ink/60 group-open:hidden">
              Развернуть
            </span>
            <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-medium text-shelter-ink/60 group-open:inline">
              Свернуть
            </span>
          </summary>
          <p className="mt-2 text-sm font-semibold text-shelter-ink/75">
            {formatViews(socialState.viewCount, false)} опубликовано {formatRelativeTime(publicDate)}
          </p>
          {animal.description ? (
            <section className="mt-4">
              <h2 className="text-lg font-semibold">Описание</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-shelter-ink/80">
                {animal.description}
              </p>
            </section>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {facts.map(([label, value]) => (
              <div key={label} className="rounded-lg bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-shelter-ink/45">
                  {label}
                </p>
                <p className="mt-1 font-medium">{value}</p>
              </div>
            ))}
          </div>

          {tags.length ? (
            <section className="mt-6">
              <h2 className="text-lg font-semibold">Характер</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-shelter-leaf/15 px-3 py-2 text-sm text-shelter-moss">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {fit.length ? (
            <section className="mt-6">
              <h2 className="text-lg font-semibold">Кому может подойти</h2>
              <ul className="mt-4 grid gap-2 text-shelter-ink/75">
                {fit.map((item) => (
                  <li key={item} className="rounded-lg bg-white px-4 py-3 text-sm">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {animal.story ? (
            <section className="mt-6">
              <h2 className="text-lg font-semibold">История</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-shelter-ink/80">
                {animal.story}
              </p>
            </section>
          ) : null}

          {animal.healthStatus ? (
            <section className="mt-6">
              <h2 className="text-lg font-semibold">Здоровье</h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-shelter-ink/80">
                {animal.healthStatus}
              </p>
            </section>
          ) : null}

          {videoUrl || shelterDetails.length ? (
            <section className="mt-6">
              <h2 className="text-lg font-semibold">Данные приюта</h2>
              {shelterDetails.length ? (
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  {shelterDetails.map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-white p-4">
                      <dt className="text-xs font-medium uppercase tracking-wide text-shelter-ink/45">
                        {label}
                      </dt>
                      <dd className="mt-1 font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {videoUrl ? (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex rounded-full bg-shelter-moss px-4 py-2 text-sm font-semibold text-white"
                >
                  Смотреть видео
                </a>
              ) : null}
            </section>
          ) : null}
        </details>

        <section className="mt-4 rounded-lg bg-shelter-ink/5 p-4">
          <h2 className="text-base font-semibold">Когда можно навестить {animal.name}</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-shelter-ink/75">
            {visitHoursSummary}
          </p>
        </section>

        <AnimalComments
          animalId={animal.id}
          animalSlug={animal.slug}
          commentCount={socialState.commentCount}
          commentsPage={socialState.commentsPage}
          commentsPageSize={socialState.commentsPageSize}
          commentsTotal={socialState.commentsTotal}
          commentsTotalPages={socialState.commentsTotalPages}
          comments={socialState.comments}
          visitorKey={visitorKey}
        />
        {allAnimalNeeds.length ? (
          <section className="mt-8">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Потребности {animal.name}</h2>
                <p className="mt-2 text-shelter-ink/70">
                  Конкретные сборы, которые относятся именно к этому животному.
                </p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {allAnimalNeeds.map((need) => (
                <NeedCard key={need.id} need={need} donationsEnabled={donationsEnabled} />
              ))}
            </div>
          </section>
        ) : null}
      </article>

    </PublicTwoColumnLayout>
  );
}

function formatEnum(value: string) {
  const labels: Record<string, string> = {
    AVAILABLE: "Ищет дом",
    DRAFT: "Черновик",
    ADOPTED: "Нашёл дом",
    ARCHIVED: "Архив",
    DOG: "Собака",
    CAT: "Кошка",
    OTHER: "Другое",
    MALE: "Мальчик",
    FEMALE: "Девочка",
    UNKNOWN: "Не указано",
    SMALL: "Маленький",
    MEDIUM: "Средний",
    LARGE: "Большой"
  };

  return labels[value] ?? value;
}

function formatAge(ageMonths: number | null) {
  if (!ageMonths) {
    return "Не указано";
  }

  if (ageMonths < 12) {
    return `${ageMonths} мес.`;
  }

  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;

  if (!months) {
    return `${years} г.`;
  }

  return `${years} г. ${months} мес.`;
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatRelativeTime(value: Date | string) {
  const date = new Date(value);
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) {
    return formatUnit(seconds, "секунду", "секунды", "секунд");
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return formatUnit(minutes, "минуту", "минуты", "минут");
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return formatUnit(hours, "час", "часа", "часов");
  }

  const days = Math.floor(hours / 24);
  if (days < 31) {
    return formatUnit(days, "день", "дня", "дней");
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return formatUnit(months, "месяц", "месяца", "месяцев");
  }

  return formatUnit(Math.floor(months / 12), "год", "года", "лет");
}

function formatUnit(value: number, one: string, few: string, many: string) {
  return `${value} ${pluralize(value, one, few, many)} назад`;
}

function formatCompactCount(value: number) {
  if (value < 1000) {
    return new Intl.NumberFormat("ru-RU").format(value);
  }

  if (value < 10000) {
    return `${(value / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} тыс.`;
  }

  return `${Math.round(value / 1000).toLocaleString("ru-RU")} тыс.`;
}

function formatFullCount(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatViews(value: number, compact: boolean) {
  const count = compact ? formatCompactCount(value) : formatFullCount(value);
  return `${count} ${pluralize(value, "просмотр", "просмотра", "просмотров")}`;
}

function pluralize(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }

  return many;
}

function normalizeUrl(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function parsePage(value?: string) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
