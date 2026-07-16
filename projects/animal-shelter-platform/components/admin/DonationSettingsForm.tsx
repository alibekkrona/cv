import type { DonationSettings } from "@prisma/client";
import { saveDonationSettingsAction } from "@/app/actions/settings.actions";
import { SubmitButton } from "@/components/admin/SubmitButton";

type DonationSettingsFormProps = {
  saved?: boolean;
  settings: DonationSettings | null;
};

export function DonationSettingsForm({ saved, settings }: DonationSettingsFormProps) {
  const enabled = settings?.publicDonationsEnabled ?? false;

  return (
    <form action={saveDonationSettingsAction} className="mt-6 grid max-w-4xl gap-5 rounded border border-shelter-ink/10 bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold">Донаты на сайте</h2>
        <p className="mt-2 text-sm leading-6 text-shelter-ink/65">
          Управляет отображением донатных кнопок и донатных блоков на публичной части сайта.
        </p>
      </div>

      {saved ? (
        <div className="min-h-11 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Настройки донатов сохранены.
        </div>
      ) : (
        <div className="min-h-11" aria-hidden="true" />
      )}

      <label className="flex items-center justify-between gap-4 rounded-lg border border-shelter-ink/10 p-4">
        <span>
          <span className="block text-sm font-semibold">Разрешить донаты на сайте</span>
          <span className="mt-1 block text-sm text-shelter-ink/60">
            Если выключено, пользователи не увидят кнопки донатов и донатные карточки.
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-3">
          <input
            name="publicDonationsEnabled"
            type="checkbox"
            value="true"
            defaultChecked={enabled}
            className="peer sr-only"
          />
          <span className="relative h-7 w-12 rounded-full bg-shelter-ink/15 transition peer-checked:bg-shelter-moss peer-checked:[&>span]:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-shelter-moss">
            <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition" />
          </span>
        </span>
      </label>

      <SubmitButton>
        Сохранить настройки донатов
      </SubmitButton>
    </form>
  );
}
