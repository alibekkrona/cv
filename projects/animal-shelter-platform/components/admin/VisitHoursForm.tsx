import type { ShelterVisitHour, ShelterWalkingHour } from "@prisma/client";
import { saveVisitHoursAction, saveWalkingHoursAction } from "@/app/actions/settings.actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { weekdays } from "@/lib/services/visit-hours.service";

type VisitHoursFormProps = {
  hours: ShelterVisitHour[];
  saved?: boolean;
};

export function VisitHoursForm({ hours, saved }: VisitHoursFormProps) {
  return (
    <ScheduleHoursForm
      action={saveVisitHoursAction}
      checkboxPrefix="isEnabled"
      closesAtPrefix="closesAt"
      defaultClosesAt="16:30"
      defaultOpensAt="09:00"
      description="Эти часы показываются на публичных анкетах животных. Каждый день настраивается отдельно."
      hours={hours}
      opensAtPrefix="opensAt"
      saved={saved}
      savedText="Часы посещения сохранены."
      submitText="Сохранить часы посещения"
      title="Часы посещения"
    />
  );
}

type WalkingHoursFormProps = {
  hours: ShelterWalkingHour[];
  saved?: boolean;
};

export function WalkingHoursForm({ hours, saved }: WalkingHoursFormProps) {
  return (
    <ScheduleHoursForm
      action={saveWalkingHoursAction}
      checkboxPrefix="walkingIsEnabled"
      closesAtPrefix="walkingClosesAt"
      defaultClosesAt="13:00"
      defaultOpensAt="10:00"
      description="Эти часы используются для заявок на прогулку с собаками. Для кошек прогулка не показывается."
      hours={hours}
      opensAtPrefix="walkingOpensAt"
      saved={saved}
      savedText="Время прогулки сохранено."
      submitText="Сохранить время прогулки"
      title="Время прогулки"
    />
  );
}

type ScheduleHoursFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  checkboxPrefix: string;
  closesAtPrefix: string;
  defaultClosesAt: string;
  defaultOpensAt: string;
  description: string;
  hours: Array<Pick<ShelterVisitHour | ShelterWalkingHour, "dayOfWeek" | "opensAt" | "closesAt" | "isEnabled">>;
  opensAtPrefix: string;
  saved?: boolean;
  savedText: string;
  submitText: string;
  title: string;
};

function ScheduleHoursForm({
  action,
  checkboxPrefix,
  closesAtPrefix,
  defaultClosesAt,
  defaultOpensAt,
  description,
  hours,
  opensAtPrefix,
  saved,
  savedText,
  submitText,
  title
}: ScheduleHoursFormProps) {
  const hoursByDay = new Map(hours.map((entry) => [entry.dayOfWeek, entry]));

  return (
    <form action={action} className="mt-6 grid max-w-4xl gap-4 rounded border border-shelter-ink/10 bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-shelter-ink/65">
          {description}
        </p>
      </div>
      {saved ? (
        <div className="min-h-11 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {savedText}
        </div>
      ) : (
        <div className="min-h-11" aria-hidden="true" />
      )}
      <div className="grid gap-3">
        {weekdays.map(({ dayOfWeek, label }) => {
          const entry = hoursByDay.get(dayOfWeek);

          return (
            <div key={dayOfWeek} className="grid gap-3 rounded border border-shelter-ink/10 px-3 py-3 md:grid-cols-[180px_1fr_1fr] md:items-center">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  name={`${checkboxPrefix}-${dayOfWeek}`}
                  type="checkbox"
                  defaultChecked={entry?.isEnabled ?? true}
                  className="h-4 w-4"
                />
                {label}
              </label>
              <label className="grid gap-1 text-sm">
                Начало
                <input
                  name={`${opensAtPrefix}-${dayOfWeek}`}
                  type="time"
                  defaultValue={entry?.opensAt ?? defaultOpensAt}
                  className="rounded border border-shelter-ink/20 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Конец
                <input
                  name={`${closesAtPrefix}-${dayOfWeek}`}
                  type="time"
                  defaultValue={entry?.closesAt ?? defaultClosesAt}
                  className="rounded border border-shelter-ink/20 px-3 py-2"
                />
              </label>
            </div>
          );
        })}
      </div>
      <SubmitButton>
        {submitText}
      </SubmitButton>
    </form>
  );
}
