import type { ApplicationStatus, ApplicationType } from "@prisma/client";
import Link from "next/link";
import { updateApplicationStatusAction } from "@/app/actions/applications.actions";
import { getAllowedApplicationStatuses } from "@/lib/auth/application-status-permissions";
import { requirePermission } from "@/lib/auth/permissions";
import {
  getApplicationStatusCountsForAdmin,
  listApplicationsForAdmin
} from "@/lib/services/applications.service";
import type { AdminApplicationAnimalFilter } from "@/lib/repositories/applications.repository";
import { findActiveSettlementsByRegionSlug } from "@/lib/repositories/settlements.repository";
import { ApplicationAdminNoteEditor } from "@/components/admin/ApplicationAdminNoteEditor";
import { ApplicationStatusSelect } from "@/components/admin/ApplicationStatusSelect";

export const dynamic = "force-dynamic";

type AdminApplicationsPageProps = {
  searchParams: Promise<{
    animal?: string;
    cityId?: string;
    q?: string;
    status?: string;
    type?: string;
  }>;
};

export default async function AdminApplicationsPage({ searchParams }: AdminApplicationsPageProps) {
  const user = await requirePermission("applications.manage");

  const { animal, cityId, q, status, type } = await searchParams;
  const selectedStatus = pickApplicationStatus(status);
  const selectedType = pickApplicationType(type);
  const selectedAnimalFilter = pickAnimalFilter(animal);
  const selectedCityId = parseOptionalId(cityId);
  const query = normalizeQuery(q);
  const baseFilters = {
    animal: selectedAnimalFilter,
    cityId: selectedCityId,
    query,
    type: selectedType
  };
  const [applications, statusCounts, settlements] = await Promise.all([
    listApplicationsForAdmin({
      ...baseFilters,
      status: selectedStatus
    }),
    getApplicationStatusCountsForAdmin(baseFilters),
    findActiveSettlementsByRegionSlug("kharkiv-oblast")
  ]);
  const activeFilterCount = [selectedStatus, selectedAnimalFilter, selectedCityId, selectedType, query].filter(Boolean).length;
  const allowedStatusOptions = getAllowedApplicationStatuses(user.role).map((applicationStatus) => ({
    label: formatStatus(applicationStatus),
    value: applicationStatus
  }));

  return (
    <section>
      <h1 className="text-2xl font-semibold">Заявки</h1>
      <p className="mt-2 text-shelter-ink/70">
        Найдено заявок: {applications.length}.
      </p>
      <div className="mt-6 flex flex-wrap gap-2" aria-label="Фильтры статуса заявок">
        <Link
          href={buildApplicationsHref({ animal: selectedAnimalFilter, cityId: selectedCityId, query, type: selectedType })}
          className={`rounded border px-3 py-2 text-sm ${selectedStatus ? "border-shelter-ink/10 bg-white" : "border-shelter-moss bg-shelter-leaf/15 text-shelter-moss"}`}
        >
          Все
        </Link>
        {applicationStatuses.map((applicationStatus) => (
          <Link
            key={applicationStatus}
            href={buildApplicationsHref({
              animal: selectedAnimalFilter,
              cityId: selectedCityId,
              query,
              status: applicationStatus,
              type: selectedType
            })}
            className={`rounded border px-3 py-2 text-sm ${selectedStatus === applicationStatus ? "border-shelter-moss bg-shelter-leaf/15 text-shelter-moss" : "border-shelter-ink/10 bg-white"}`}
          >
            {formatStatus(applicationStatus)}{" "}
            <span className="text-shelter-ink/50">{statusCounts[applicationStatus]}</span>
          </Link>
        ))}
      </div>
      <form className="mt-4 grid gap-3 rounded border border-shelter-ink/10 bg-white p-4 xl:grid-cols-[minmax(0,1fr)_180px_180px_220px_auto_auto] xl:items-end">
        {selectedStatus ? <input type="hidden" name="status" value={selectedStatus} /> : null}
        <label className="grid gap-1 text-sm">
          Поиск
          <input
            name="q"
            defaultValue={query}
            placeholder="Имя, телефон, город, животное, заметка"
            className="rounded border border-shelter-ink/20 px-3 py-2"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Животное
          <select
            name="animal"
            defaultValue={selectedAnimalFilter ?? ""}
            className="rounded border border-shelter-ink/20 bg-white px-3 py-2"
          >
            <option value="">Все заявки</option>
            <option value="WITH_ANIMAL">С животным</option>
            <option value="WITHOUT_ANIMAL">Без животного</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Город
          <select
            name="cityId"
            defaultValue={selectedCityId ?? ""}
            className="rounded border border-shelter-ink/20 bg-white px-3 py-2"
          >
            <option value="">Все города</option>
            {settlements.map((settlement) => (
              <option key={settlement.id} value={settlement.id}>
                {settlement.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Тип заявки
          <select
            name="type"
            defaultValue={selectedType ?? ""}
            className="rounded border border-shelter-ink/20 bg-white px-3 py-2"
          >
            <option value="">Все типы</option>
            {applicationTypes.map((applicationType) => (
              <option key={applicationType} value={applicationType}>
                {formatApplicationType(applicationType)}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
          Применить
        </button>
        {activeFilterCount ? (
          <Link
            href="/admin/applications"
            className="rounded border border-shelter-ink/15 px-4 py-2 text-center text-sm font-medium"
          >
            Сбросить
          </Link>
        ) : null}
      </form>
      <div className="mt-6 grid gap-3">
        {applications.length ? (
          applications.map((application) => (
            <article
              key={application.id}
              className="grid gap-3 rounded border border-shelter-ink/10 bg-white px-4 py-4 md:grid-cols-[1.2fr_1fr_auto]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{application.applicantName}</h2>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClassName(application.status)}`}>
                    {formatStatus(application.status)}
                  </span>
                  <span className="rounded-full bg-shelter-cream px-2 py-1 text-xs font-medium text-shelter-ink/65">
                    {formatApplicationType(application.type)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-shelter-ink/65">
                  {application.phone}
                  {application.email ? ` / ${application.email}` : ""}
                </p>
                {application.message ? (
                  <p className="mt-3 text-sm leading-6 text-shelter-ink/75">
                    {application.message}
                  </p>
                ) : null}
                {application.comments[0] ? (
                  <p className="mt-3 rounded bg-shelter-cream px-3 py-2 text-sm leading-6 text-shelter-ink/70">
                    Последний комментарий: {application.comments[0].body}
                  </p>
                ) : null}
                <ApplicationAdminNoteEditor
                  applicationId={application.id}
                  initialNote={application.adminNote}
                />
              </div>
              <div className="text-sm text-shelter-ink/70">
                <p>
                  Животное:{" "}
                  <span className="font-medium text-shelter-ink">
                    {application.animal?.name ?? "Не выбрано"}
                  </span>
                </p>
                <p>Город: {application.cityRef?.name ?? application.city ?? "Не указано"}</p>
                <p>Жильё: {application.housingType ?? "Не указано"}</p>
                <p>Дети: {formatBoolean(application.hasChildren)}</p>
                <p>Другие животные: {formatBoolean(application.hasAnimals)}</p>
              </div>
              <div className="grid gap-3 md:grid-rows-[auto_auto_1fr] md:justify-items-end">
                <div className="flex justify-end">
                  <Link
                    href={`/admin/applications/${application.id}`}
                    className="rounded bg-shelter-moss px-3 py-1.5 text-sm font-medium text-white hover:bg-shelter-ink"
                  >
                    Открыть заявку
                  </Link>
                </div>
                <form action={updateApplicationStatusAction}>
                  <input type="hidden" name="id" value={application.id} />
                  <input
                    type="hidden"
                    name="statusNote"
                    value={`Статус изменён из списка заявок`}
                  />
                  <ApplicationStatusSelect
                    applicationId={application.id}
                    defaultValue={application.status}
                    defaultLabel={formatStatus(application.status)}
                    options={allowedStatusOptions}
                  />
                </form>
                <time className="self-end text-sm text-shelter-ink/55" dateTime={application.createdAt.toISOString()}>
                  {application.createdAt.toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  })}
                </time>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded border border-shelter-ink/10 bg-white px-4 py-8 text-center text-shelter-ink/65">
            {activeFilterCount ? "По этим фильтрам заявок нет." : "Заявок пока нет."}
          </div>
        )}
      </div>
    </section>
  );
}

const applicationStatuses = [
  "NEW",
  "IN_REVIEW",
  "CONTACTED",
  "CALL_SCHEDULED",
  "VISIT_SCHEDULED",
  "APPROVED",
  "REJECTED",
  "CLOSED"
] satisfies ApplicationStatus[];

const applicationTypes = [
  "ADOPTION",
  "ACQUAINTANCE",
  "VISIT",
  "WALKING",
  "GUARDIANSHIP",
  "VOLUNTEERING",
  "OTHER"
] satisfies ApplicationType[];

function formatBoolean(value: boolean | null) {
  if (value === null) {
    return "Не указано";
  }

  return value ? "Да" : "Нет";
}

function formatStatus(status: ApplicationStatus) {
  const labels: Record<ApplicationStatus, string> = {
    NEW: "Новая",
    IN_REVIEW: "На рассмотрении",
    CONTACTED: "Связались",
    CALL_SCHEDULED: "Звонок назначен",
    VISIT_SCHEDULED: "Визит назначен",
    APPROVED: "Одобрена",
    REJECTED: "Отклонена",
    CLOSED: "Закрыта"
  };

  return labels[status];
}

function formatApplicationType(type: ApplicationType) {
  const labels: Record<ApplicationType, string> = {
    ADOPTION: "Усыновление",
    ACQUAINTANCE: "Знакомство",
    VISIT: "Посещение",
    WALKING: "Прогулка",
    GUARDIANSHIP: "Опека",
    VOLUNTEERING: "Волонтёрство",
    OTHER: "Другое"
  };

  return labels[type];
}

function pickApplicationStatus(status?: string) {
  if (!status) {
    return undefined;
  }

  return applicationStatuses.includes(status as ApplicationStatus)
    ? (status as ApplicationStatus)
    : undefined;
}

function pickApplicationType(type?: string) {
  if (!type) {
    return undefined;
  }

  return applicationTypes.includes(type as ApplicationType)
    ? (type as ApplicationType)
    : undefined;
}

function pickAnimalFilter(animal?: string): AdminApplicationAnimalFilter | undefined {
  if (animal === "WITH_ANIMAL" || animal === "WITHOUT_ANIMAL") {
    return animal;
  }

  return undefined;
}

function normalizeQuery(query?: string) {
  const normalized = query?.trim();

  return normalized || undefined;
}

function buildApplicationsHref(filters: {
  animal?: AdminApplicationAnimalFilter;
  cityId?: number;
  query?: string;
  status?: ApplicationStatus;
  type?: ApplicationType;
}) {
  const params = new URLSearchParams();

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.type) {
    params.set("type", filters.type);
  }

  if (filters.query) {
    params.set("q", filters.query);
  }

  if (filters.cityId) {
    params.set("cityId", String(filters.cityId));
  }

  if (filters.animal) {
    params.set("animal", filters.animal);
  }

  const queryString = params.toString();

  return queryString ? `/admin/applications?${queryString}` : "/admin/applications";
}

function parseOptionalId(value?: string) {
  if (!value) {
    return undefined;
  }

  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function getStatusClassName(status: ApplicationStatus) {
  switch (status) {
    case "NEW":
      return "bg-shelter-leaf/15 text-shelter-moss";
    case "IN_REVIEW":
      return "bg-blue-50 text-blue-700";
    case "CONTACTED":
      return "bg-amber-50 text-amber-700";
    case "CALL_SCHEDULED":
      return "bg-cyan-50 text-cyan-700";
    case "VISIT_SCHEDULED":
      return "bg-violet-50 text-violet-700";
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "bg-red-50 text-red-700";
    case "CLOSED":
      return "bg-shelter-ink/10 text-shelter-ink/70";
  }
}
