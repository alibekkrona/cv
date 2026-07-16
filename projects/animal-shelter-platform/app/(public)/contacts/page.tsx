import { getContactSettings } from "@/lib/services/contact-settings.service";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contacts = await getContactSettings();
  const links = [
    contacts?.telegram ? ["Telegram", normalizeTelegramUrl(contacts.telegram)] : null,
    contacts?.facebook ? ["Facebook", contacts.facebook] : null,
    contacts?.officialSiteUrl ? ["Официальный сайт", contacts.officialSiteUrl] : null
  ].filter((item): item is [string, string] => Boolean(item?.[1]));

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Контакты</h1>
      <dl className="mt-6 grid gap-4 rounded border border-shelter-ink/10 bg-white p-5">
        <div className="grid gap-1">
          <dt className="text-sm text-shelter-ink/55">Телефон</dt>
          <dd className="font-medium">{contacts?.phone ?? "Не настроено"}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-sm text-shelter-ink/55">Email</dt>
          <dd className="font-medium">{contacts?.email ?? "Не настроено"}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-sm text-shelter-ink/55">Адрес</dt>
          <dd className="font-medium">{contacts?.address ?? "Не настроено"}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-sm text-shelter-ink/55">График работы</dt>
          <dd className="whitespace-pre-line font-medium">{contacts?.schedule ?? "Не настроено"}</dd>
        </div>
      </dl>

      {links.length ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {links.map(([label, href]) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="rounded border border-shelter-ink/15 px-4 py-2 text-sm font-medium hover:border-shelter-moss"
            >
              {label}
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function normalizeTelegramUrl(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://t.me/${value.replace(/^@/, "")}`;
}
