import Link from "next/link";
import { AnimalCard } from "@/components/animals/AnimalCard";
import { DonationAside } from "@/components/donations/DonationAside";
import { NeedCard } from "@/components/donations/NeedCard";
import { RecentDonations } from "@/components/donations/RecentDonations";
import { PublicTwoColumnLayout } from "@/components/layout/PublicTwoColumnLayout";
import { listAvailableAnimals } from "@/lib/services/animals.service";
import { arePublicDonationsEnabled } from "@/lib/services/donation-settings.service";
import { listPublicNeeds, listRecentDonations } from "@/lib/services/donations.service";
import {
  formatVisitHoursSummary,
  getVisitHours
} from "@/lib/services/visit-hours.service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [animals, visitHours, shelterNeeds, fulfilledNeeds, recentDonations, donationsEnabled] = await Promise.all([
    listAvailableAnimals({ limit: 8 }),
    getVisitHours(),
    listPublicNeeds({ limit: 3, scope: "SHELTER" }),
    listPublicNeeds({ limit: 3, status: "closed" }),
    listRecentDonations(5),
    arePublicDonationsEnabled()
  ]);
  const visitHoursSummary = formatVisitHoursSummary(visitHours);

  return (
    <PublicTwoColumnLayout
      className="pb-12"
      aside={(
        <div className="grid gap-4">
          <DonationAside needs={shelterNeeds} donationsEnabled={donationsEnabled} />
          {donationsEnabled ? <RecentDonations donations={recentDonations} /> : null}
          <div className="rounded-lg bg-white p-5">
            <h2 className="text-lg font-semibold">Сегодня можно познакомиться</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-shelter-ink/70">
              {visitHoursSummary}
            </p>
            <div className="mt-4 grid gap-2 text-sm font-medium">
              <Link href="/animals" className="rounded-lg bg-shelter-ink px-4 py-2 text-center text-white">
                Смотреть анкеты
              </Link>
              <Link href="/contacts" className="rounded-lg bg-shelter-cream px-4 py-2 text-center">
                Связаться с приютом
              </Link>
            </div>
          </div>
        </div>
      )}
    >
      <section>
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Приют для животных
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-shelter-ink/75">
            Найдите животное, чей характер, потребности и ритм жизни могут подойти
            вашему дому. Без давления и лишней драматизации: только понятный путь
            от первого знакомства до ответственной заявки.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/animals"
              className="rounded-lg bg-shelter-moss px-5 py-3 text-sm font-medium text-white"
            >
              Найти животное
            </Link>
            <Link
              href="/how-to-adopt"
              className="rounded-lg border border-shelter-ink/20 px-5 py-3 text-sm font-medium"
            >
              Как проходит передача
            </Link>
            <Link
              href="/contacts"
              className="rounded-lg border border-shelter-ink/20 px-5 py-3 text-sm font-medium"
            >
              Связаться с приютом
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Потребности приюта</h2>
            <p className="mt-2 text-shelter-ink/70">
              Конкретные покупки и сборы, которые можно закрыть донатом.
            </p>
          </div>
          <Link href="/needs" className="hidden text-sm font-medium text-shelter-moss sm:block">
            Все потребности
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shelterNeeds.map((need) => (
            <NeedCard key={need.id} need={need} donationsEnabled={donationsEnabled} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Животные ищут дом</h2>
            <p className="mt-2 text-shelter-ink/70">
              Начните с фотографии, а потом прочитайте историю.
            </p>
          </div>
          <Link href="/animals" className="hidden text-sm font-medium text-shelter-moss sm:block">
            Смотреть всех
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {animals.map((animal) => (
            <AnimalCard key={animal.id} animal={animal} />
          ))}
        </div>
      </section>

      {fulfilledNeeds.length ? (
        <section className="mt-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Реализованные потребности</h2>
              <p className="mt-2 text-shelter-ink/70">
                Закрытые сборы с фотоотчетами о покупке или выполненной работе.
              </p>
            </div>
            <Link href="/needs?status=closed" className="hidden text-sm font-medium text-shelter-moss sm:block">
              Смотреть отчеты
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {fulfilledNeeds.map((need) => (
                <NeedCard key={need.id} need={need} />
            ))}
          </div>
        </section>
      ) : null}
    </PublicTwoColumnLayout>
  );
}
