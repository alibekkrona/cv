import type { ContactSettings } from "@prisma/client";
import { saveContactSettingsAction } from "@/app/actions/settings.actions";
import { SubmitButton } from "@/components/admin/SubmitButton";

type ContactSettingsFormProps = {
  saved?: boolean;
  settings: ContactSettings | null;
};

export function ContactSettingsForm({ saved, settings }: ContactSettingsFormProps) {
  return (
    <form action={saveContactSettingsAction} className="mt-6 grid max-w-4xl gap-6 rounded border border-shelter-ink/10 bg-white p-5">
      {saved ? (
        <div className="min-h-11 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Настройки сохранены.
        </div>
      ) : (
        <div className="min-h-11" aria-hidden="true" />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm">
          Телефон
          <input
            name="phone"
            defaultValue={settings?.phone ?? ""}
            placeholder="+380..."
            className="rounded border border-shelter-ink/20 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            defaultValue={settings?.email ?? ""}
            placeholder="info@example.org"
            className="rounded border border-shelter-ink/20 px-3 py-2"
          />
        </label>
      </div>

      <label className="grid gap-1 text-sm">
        Адрес
        <input
          name="address"
          defaultValue={settings?.address ?? ""}
          placeholder="Город, улица, номер"
          className="rounded border border-shelter-ink/20 px-3 py-2"
        />
      </label>

      <label className="grid gap-1 text-sm">
        График работы
        <textarea
          name="schedule"
          defaultValue={settings?.schedule ?? ""}
          placeholder="Например: ежедневно, 09:00-18:00"
          className="min-h-28 rounded border border-shelter-ink/20 px-3 py-2"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-1 text-sm">
          Telegram
          <input
            name="telegram"
            defaultValue={settings?.telegram ?? ""}
            placeholder="@animal_shelter или https://t.me/..."
            className="rounded border border-shelter-ink/20 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Facebook
          <input
            name="facebook"
            type="url"
            defaultValue={settings?.facebook ?? ""}
            placeholder="https://facebook.com/..."
            className="rounded border border-shelter-ink/20 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Официальный сайт
          <input
            name="officialSiteUrl"
            type="url"
            defaultValue={settings?.officialSiteUrl ?? ""}
            placeholder="https://..."
            className="rounded border border-shelter-ink/20 px-3 py-2"
          />
        </label>
      </div>

      <SubmitButton>
        Сохранить настройки
      </SubmitButton>
    </form>
  );
}
