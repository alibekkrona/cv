"use client";

import type { ApplicationType, Settlement, Species } from "@prisma/client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  type AdoptionApplicationActionState,
  submitAdoptionApplicationAction
} from "@/app/actions/applications.actions";

const initialAdoptionApplicationState: AdoptionApplicationActionState = {
  ok: false,
  message: ""
};

type AdoptionApplicationFormProps = {
  animalId: number;
  animalSpecies: Species;
  settlementOptions: Pick<Settlement, "id" | "name">[];
  walkingHoursSummary: string;
};

export function AdoptionApplicationForm({
  animalId,
  animalSpecies,
  settlementOptions,
  walkingHoursSummary
}: AdoptionApplicationFormProps) {
  const [state, formAction] = useActionState(
    submitAdoptionApplicationAction,
    initialAdoptionApplicationState
  );
  const [selectedType, setSelectedType] = useState<ApplicationType>("ACQUAINTANCE");
  const formRef = useRef<HTMLFormElement>(null);
  const isDog = animalSpecies === "DOG";
  const availableApplicationTypes = applicationTypeOptions.filter((option) => option.value !== "WALKING" || isDog);
  const formCopy = getApplicationTypeFormCopy(selectedType, walkingHoursSummary);
  const showHomeContext = selectedType === "ADOPTION";

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  useEffect(() => {
    if (selectedType === "WALKING" && !isDog) {
      setSelectedType("ACQUAINTANCE");
    }
  }, [isDog, selectedType]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-lg bg-white p-5"
    >
      <h2 className="text-xl font-semibold">Оставить заявку</h2>
      <p className="mt-2 text-sm leading-6 text-shelter-ink/70">
        Оставьте контакты и несколько деталей. Команда приюта свяжется с вами,
        чтобы обсудить следующий шаг.
      </p>
      <input type="hidden" name="animalId" value={animalId} />
      <label className="mt-4 grid gap-1 text-sm">
        Тип заявки
        <select
          name="type"
          value={selectedType}
          onChange={(event) => setSelectedType(event.currentTarget.value as ApplicationType)}
          className="rounded border border-shelter-ink/20 bg-white px-3 py-2"
        >
          {availableApplicationTypes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-4 grid gap-1 text-sm">
        Имя
        <input name="applicantName" required className="rounded border border-shelter-ink/20 px-3 py-2" />
        <FieldError errors={state.fieldErrors?.applicantName} />
      </label>
      <label className="mt-3 grid gap-1 text-sm">
        Телефон
        <input name="phone" required className="rounded border border-shelter-ink/20 px-3 py-2" />
        <FieldError errors={state.fieldErrors?.phone} />
      </label>
      <label className="mt-3 grid gap-1 text-sm">
        Email
        <input name="email" type="email" className="rounded border border-shelter-ink/20 px-3 py-2" />
        <FieldError errors={state.fieldErrors?.email} />
      </label>
      <label className="mt-3 grid gap-1 text-sm">
        Messenger
        <input name="messenger" placeholder="Telegram, Viber, WhatsApp" className="rounded border border-shelter-ink/20 px-3 py-2" />
      </label>
      {showHomeContext ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Город
            <CitySelect settlementOptions={settlementOptions} />
          </label>
          <label className="grid gap-1 text-sm">
            Жильё
            <select name="housingType" className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
              <option value="">Не указано</option>
              <option value="Apartment">Квартира</option>
              <option value="House">Дом</option>
              <option value="Other">Другое</option>
            </select>
          </label>
        </div>
      ) : (
        <label className="grid gap-1 text-sm">
          Город
          <CitySelect settlementOptions={settlementOptions} />
        </label>
      )}
      {showHomeContext ? (
        <div className="mt-3 grid gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input name="hasChildren" type="checkbox" className="h-4 w-4 rounded border-shelter-ink/20" />
            Дома есть дети
          </label>
          <label className="flex items-center gap-2">
            <input name="hasAnimals" type="checkbox" className="h-4 w-4 rounded border-shelter-ink/20" />
            Дома есть другие животные
          </label>
        </div>
      ) : null}
      <label className="mt-3 grid gap-1 text-sm">
        {formCopy.messageLabel}
        <textarea
          name="message"
          placeholder={formCopy.messagePlaceholder}
          className="min-h-28 rounded border border-shelter-ink/20 px-3 py-2"
        />
      </label>
      {state.message ? (
        <p className={`mt-4 rounded px-3 py-2 text-sm ${state.ok ? "bg-shelter-leaf/20 text-shelter-moss" : "bg-red-50 text-red-700"}`}>
          {state.message}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function CitySelect({ settlementOptions }: { settlementOptions: Pick<Settlement, "id" | "name">[] }) {
  return (
    <select name="cityId" defaultValue={String(settlementOptions[0]?.id ?? "")} className="rounded border border-shelter-ink/20 bg-white px-3 py-2">
      {settlementOptions.map((settlement) => (
        <option key={settlement.id} value={settlement.id}>
          {settlement.name}
        </option>
      ))}
    </select>
  );
}

const applicationTypeOptions = [
  { label: "Знакомство", value: "ACQUAINTANCE" },
  { label: "Усыновление", value: "ADOPTION" },
  { label: "Посещение", value: "VISIT" },
  { label: "Прогулка", value: "WALKING" },
  { label: "Опека", value: "GUARDIANSHIP" },
  { label: "Волонтёрство", value: "VOLUNTEERING" },
  { label: "Другое", value: "OTHER" }
] satisfies Array<{ label: string; value: ApplicationType }>;

const applicationTypeFormCopy: Record<ApplicationType, {
  messageLabel: string;
  messagePlaceholder: string;
}> = {
  ADOPTION: {
    messageLabel: "Почему хотите усыновить питомца?",
    messagePlaceholder: "Расскажите, почему выбрали этого питомца, какой у вас опыт и что важно знать приюту."
  },
  ACQUAINTANCE: {
    messageLabel: "Что хотите уточнить перед знакомством?",
    messagePlaceholder: "Например: когда удобно приехать, есть ли вопросы о характере, здоровье или поведении."
  },
  VISIT: {
    messageLabel: "Цель и удобное время посещения",
    messagePlaceholder: "Например: хочу приехать в субботу, познакомиться с питомцем и уточнить правила визита."
  },
  WALKING: {
    messageLabel: "Опыт и удобные дни для прогулки",
    messagePlaceholder: "Расскажите об опыте прогулок с собаками."
  },
  GUARDIANSHIP: {
    messageLabel: "Какой формат опеки вам подходит?",
    messagePlaceholder: "Например: хочу помогать кормом раз в месяц или поддерживать лечение конкретного питомца."
  },
  VOLUNTEERING: {
    messageLabel: "Чем вы хотите помогать?",
    messagePlaceholder: "Например: могу фотографировать животных, помогать с перевозкой или приходить по будням."
  },
  OTHER: {
    messageLabel: "Сообщение",
    messagePlaceholder: "Напишите вопрос, предложение или детали, которые помогут приюту ответить."
  }
};

function getApplicationTypeFormCopy(type: ApplicationType, walkingHoursSummary: string) {
  if (type !== "WALKING") {
    return applicationTypeFormCopy[type];
  }

  return {
    ...applicationTypeFormCopy.WALKING,
    messagePlaceholder: `Прогулка: ${walkingHoursSummary}. Расскажите об опыте прогулок с собаками.`
  };
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return <span className="text-xs text-red-700">{errors[0]}</span>;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="mt-4 rounded bg-shelter-moss px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Отправляем..." : "Отправить заявку"}
    </button>
  );
}
