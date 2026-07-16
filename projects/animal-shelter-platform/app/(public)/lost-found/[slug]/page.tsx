import { notFound } from "next/navigation";
import { AnimalGallery } from "@/components/animals/AnimalGallery";
import { LostFoundComments } from "@/components/lost-found/LostFoundComments";
import { LostFoundSocialBar } from "@/components/lost-found/LostFoundSocialBar";
import { PublicTwoColumnLayout } from "@/components/layout/PublicTwoColumnLayout";
import { ViewportHero } from "@/components/layout/ViewportHero";
import { getPublishedLostFoundReport } from "@/lib/services/lost-found.service";
import { getLostFoundSocialState } from "@/lib/services/social.service";
import { getVisitorKey } from "@/lib/visitor";

export const dynamic = "force-dynamic";

type LostFoundDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{ commentsPage?: string }>;
};

export default async function LostFoundDetailPage({ params, searchParams }: LostFoundDetailPageProps) {
  const { slug } = await params;
  const { commentsPage } = await searchParams;
  const report = await getPublishedLostFoundReport(decodeSlug(slug));

  if (!report) {
    notFound();
  }

  const visitorKey = await getVisitorKey();
  const socialState = await getLostFoundSocialState(report.id, visitorKey, {
    commentsPage: parsePage(commentsPage),
    commentsPageSize: 10
  });
  const publicDate = report.publishedAt && report.publishedAt <= new Date()
    ? report.publishedAt
    : report.createdAt;
  const facts = [
    ["Статус", report.type === "LOST" ? "Потеряно" : "Найдено"],
    ["Вид", formatEnum(report.species)],
    ["Пол", formatEnum(report.sex)],
    ["Размер", report.size ? formatEnum(report.size) : "Не указано"],
    ["Дата", report.eventDate ? formatDate(report.eventDate) : "Не указано"],
    ["Город", report.cityRef?.name ?? report.city ?? "Не указано"],
    ["Район", report.district ?? "Не указано"],
    ["Место", report.locationText ?? "Не указано"]
  ];

  return (
    <PublicTwoColumnLayout
      className="pb-6"
      aside={(
        <aside className="grid gap-4">
          <section className="rounded-lg bg-white p-5">
            <h2 className="text-xl font-semibold">Контакт</h2>
            <p className="mt-3 text-sm font-medium">{report.contactName}</p>
            <p className="mt-1 text-sm text-shelter-ink/70">{report.contactPhone}</p>
            {report.contactEmail ? (
              <p className="mt-1 text-sm text-shelter-ink/70">{report.contactEmail}</p>
            ) : null}
          </section>
          <section className="rounded-lg bg-white p-5">
            <h2 className="text-xl font-semibold">Детали объявления</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              {facts.map(([label, value]) => (
                <Info key={label} label={label} value={value} />
              ))}
            </dl>
          </section>
        </aside>
      )}
    >
      <article className="min-w-0">
        <ViewportHero className="flex min-h-[520px] flex-col">
          <div className="min-h-0 flex-1">
            <AnimalGallery animalName={report.title} className="w-full" fillAvailable photos={report.photos} />
          </div>

          <div className="grid gap-2 pb-2 pt-[2px] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="grid gap-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0">
                <h1 className="text-3xl font-semibold leading-none">{report.title}</h1>
                <p className="text-sm font-medium leading-none text-shelter-ink/60">
                  {formatEnum(report.type)} / {formatEnum(report.species)}
                </p>
              </div>
              <p className="mt-1.5 text-sm font-medium leading-none text-shelter-ink/70">
                опубликовано {formatRelativeTime(publicDate)}
              </p>
            </div>
            <div className="justify-self-start sm:justify-self-end">
              <LostFoundSocialBar
                commentCount={socialState.commentCount}
                initialIsLiked={socialState.isLiked}
                initialLikeCount={socialState.likeCount}
                reportId={report.id}
                reportSlug={report.slug}
              />
            </div>
          </div>
        </ViewportHero>

        <details className="group mt-5 rounded-lg bg-shelter-ink/5 p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold">
            <span>Анкета объявления</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-shelter-ink/60 group-open:hidden">
              Развернуть
            </span>
            <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-medium text-shelter-ink/60 group-open:inline">
              Свернуть
            </span>
          </summary>
          <p className="mt-2 text-sm font-semibold text-shelter-ink/75">
            Опубликовано {formatRelativeTime(publicDate)}
          </p>
          <section className="mt-4">
            <h2 className="text-lg font-semibold">Описание</h2>
            <p className="mt-2 max-w-4xl whitespace-pre-line text-sm leading-6 text-shelter-ink/80">
              {report.description}
            </p>
          </section>
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
        </details>

        <LostFoundComments
          commentCount={socialState.commentCount}
          comments={socialState.comments}
          reportId={report.id}
          reportSlug={report.slug}
          visitorKey={visitorKey}
        />
      </article>
    </PublicTwoColumnLayout>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-shelter-ink/50">{label}</dt>
      <dd className="mt-1 font-medium">{value || "Не указано"}</dd>
    </div>
  );
}

function formatEnum(value: string) {
  const labels: Record<string, string> = {
    LOST: "Потеряно",
    FOUND: "Найдено",
    SUBMITTED: "На проверке",
    PUBLISHED: "Опубликовано",
    MATCHED: "Совпадение найдено",
    CLOSED: "Закрыто",
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

function parsePage(value?: string) {
  if (!value) {
    return 1;
  }

  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function decodeSlug(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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

  if (seconds < 60) return formatUnit(seconds, "секунду", "секунды", "секунд");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return formatUnit(minutes, "минуту", "минуты", "минут");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatUnit(hours, "час", "часа", "часов");
  const days = Math.floor(hours / 24);
  if (days < 31) return formatUnit(days, "день", "дня", "дней");
  const months = Math.floor(days / 30);
  if (months < 12) return formatUnit(months, "месяц", "месяца", "месяцев");
  return formatUnit(Math.floor(months / 12), "год", "года", "лет");
}

function formatUnit(value: number, one: string, few: string, many: string) {
  return `${value} ${pluralize(value, one, few, many)} назад`;
}

function pluralize(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
