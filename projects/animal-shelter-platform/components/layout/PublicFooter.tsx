import Link from "next/link";
import { DonationButton } from "@/components/donations/DonationButton";
import { getContactSettings } from "@/lib/services/contact-settings.service";
import { arePublicDonationsEnabled } from "@/lib/services/donation-settings.service";
import {
  formatVisitHoursSummary,
  getVisitHours
} from "@/lib/services/visit-hours.service";

export async function PublicFooter() {
  const [settings, visitHours, donationsEnabled] = await Promise.all([
    getContactSettings(),
    getVisitHours(),
    arePublicDonationsEnabled()
  ]);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 bg-white">
      <div className="mx-auto grid w-full max-w-[1760px] gap-8 px-4 py-8 sm:px-6 md:grid-cols-[minmax(0,1fr)_360px] xl:px-8">
        <div>
          <h2 className="text-lg font-semibold">Приют для животных</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-shelter-ink/65">
            Помогаем животным находить дом, а людям — знакомиться с питомцами спокойно и ответственно.
          </p>
          <nav className="mt-5 flex flex-wrap gap-4 text-sm font-medium text-shelter-ink/75">
            <Link href="/animals">Животные</Link>
            <Link href="/needs">Потребности</Link>
            <Link href="/how-to-adopt">Как забрать</Link>
            <Link href="/help">Помочь</Link>
            <Link href="/contacts">Контакты</Link>
          </nav>
          <p className="mt-6 text-xs text-shelter-ink/45">
            © {year} Bearing Knowledge. Все права защищены.
          </p>
          {donationsEnabled ? (
          <div className="mt-5">
            <DonationButton label="Донат приюту" target="SHELTER" className="rounded-lg bg-shelter-moss px-4 py-2 text-sm font-semibold text-white" />
          </div>
          ) : null}
        </div>

        <div className="grid gap-4 text-sm">
          <section className="rounded-lg bg-shelter-cream p-4">
            <h3 className="font-semibold">Когда можно приехать</h3>
            <p className="mt-2 whitespace-pre-line leading-6 text-shelter-ink/70">
              {formatVisitHoursSummary(visitHours)}
            </p>
          </section>
          <section className="rounded-lg bg-shelter-cream p-4">
            <h3 className="font-semibold">Связь</h3>
            <div className="mt-2 grid gap-1 text-shelter-ink/70">
              <p>{settings?.phone ?? "Телефон будет добавлен"}</p>
              <p>{settings?.email ?? "Email будет добавлен"}</p>
              <p>{settings?.address ?? "Адрес приюта будет добавлен"}</p>
            </div>
          </section>
          <section className="rounded-lg bg-shelter-cream p-4">
            <h3 className="font-semibold">Партнёры</h3>
            <p className="mt-2 text-shelter-ink/70">Ветеринарные клиники, волонтёры и локальные сообщества помощи животным.</p>
          </section>
        </div>
      </div>
    </footer>
  );
}
