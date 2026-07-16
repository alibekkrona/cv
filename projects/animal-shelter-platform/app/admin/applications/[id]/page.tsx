import type { ApplicationStatus, ApplicationType } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addApplicationCommentAction,
  updateApplicationStatusAction
} from "@/app/actions/applications.actions";
import { ApplicationAdminNoteEditor } from "@/components/admin/ApplicationAdminNoteEditor";
import { ApplicationStatusSelect } from "@/components/admin/ApplicationStatusSelect";
import { getAllowedApplicationStatuses } from "@/lib/auth/application-status-permissions";
import { requirePermission } from "@/lib/auth/permissions";
import { getApplicationForAdmin } from "@/lib/services/applications.service";

export const dynamic = "force-dynamic";

type AdminApplicationDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminApplicationDetailPage({ params }: AdminApplicationDetailPageProps) {
  const user = await requirePermission("applications.manage");

  const { id } = await params;
  const applicationId = Number(id);

  if (!Number.isInteger(applicationId)) {
    notFound();
  }

  const application = await getApplicationForAdmin(applicationId);

  if (!application) {
    notFound();
  }

  const coverPhoto = application.animal?.photos[0];
  const statusOptions = getAllowedApplicationStatuses(user.role).map((status) => ({
    label: formatStatus(status),
    value: status
  }));

  return (
    <section>
      <Link href="/admin/applications" className="text-sm font-medium text-shelter-moss">
        Назад к заявкам
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{application.applicantName}</h1>
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClassName(application.status)}`}>
              {formatStatus(application.status)}
            </span>
            <span className="rounded-full bg-shelter-cream px-2 py-1 text-xs font-medium text-shelter-ink/65">
              {formatApplicationType(application.type)}
            </span>
          </div>
          <p className="mt-2 text-shelter-ink/65">
            Заявка #{application.id} получена{" "}
            <time dateTime={application.createdAt.toISOString()}>
              {application.createdAt.toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              })}
            </time>
          </p>
        </div>
        <form action={updateApplicationStatusAction}>
          <input type="hidden" name="id" value={application.id} />
          <input
            type="hidden"
            name="statusNote"
            value="Статус изменён со страницы заявки"
          />
          <ApplicationStatusSelect
            applicationId={application.id}
            defaultValue={application.status}
            defaultLabel={formatStatus(application.status)}
            options={statusOptions}
          />
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6">
          <section className="rounded border border-shelter-ink/10 bg-white p-4">
            <h2 className="font-semibold">Заявитель</h2>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <InfoItem label="Телефон" value={application.phone} />
              <InfoItem label="Тип заявки" value={formatApplicationType(application.type)} />
              <InfoItem label="Email" value={application.email} />
              <InfoItem label="Мессенджер" value={application.messenger} />
              <InfoItem label="Город" value={application.cityRef?.name ?? application.city} />
              <InfoItem label="Жильё" value={application.housingType} />
              <InfoItem label="Дети" value={formatBoolean(application.hasChildren)} />
              <InfoItem label="Другие животные" value={formatBoolean(application.hasAnimals)} />
            </dl>
          </section>

          <section className="rounded border border-shelter-ink/10 bg-white p-4">
            <h2 className="font-semibold">Сообщение</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-shelter-ink/75">
              {application.message || "Сообщение не указано."}
            </p>
          </section>

          <section className="rounded border border-shelter-ink/10 bg-white p-4">
            <ApplicationAdminNoteEditor
              className=""
              applicationId={application.id}
              initialNote={application.adminNote}
            />
          </section>

          <section className="rounded border border-shelter-ink/10 bg-white p-4">
            <h2 className="font-semibold">Комментарии</h2>
            <form action={addApplicationCommentAction} className="mt-4 grid gap-3">
              <input type="hidden" name="id" value={application.id} />
              <input type="hidden" name="authorName" value="Админ" />
              <label className="grid gap-2 text-sm font-medium">
                Новый комментарий
                <textarea
                  name="body"
                  required
                  placeholder="Например: договорились о звонке завтра после 12:00"
                  className="min-h-28 rounded border border-shelter-ink/20 px-3 py-2 font-normal"
                />
              </label>
              <button className="w-fit rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
                Добавить комментарий
              </button>
            </form>
            <div className="mt-5 grid gap-3">
              {application.comments.length ? (
                application.comments.map((comment) => (
                  <div key={comment.id} className="rounded bg-shelter-cream px-4 py-3">
                    <p className="whitespace-pre-line text-sm leading-6 text-shelter-ink/75">{comment.body}</p>
                    <p className="mt-2 text-xs text-shelter-ink/50">
                      {comment.authorName ?? "Админ"} / {formatDateTime(comment.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-shelter-ink/60">Комментариев пока нет.</p>
              )}
            </div>
          </section>

          <section className="rounded border border-shelter-ink/10 bg-white p-4">
            <h2 className="font-semibold">История статусов</h2>
            <div className="mt-4 grid gap-3">
              {application.statusEvents.length ? (
                application.statusEvents.map((event) => (
                  <div key={event.id} className="rounded border border-shelter-ink/10 px-4 py-3">
                    <p className="text-sm font-medium">
                      {event.fromStatus ? `${formatStatus(event.fromStatus)} -> ` : ""}
                      {formatStatus(event.toStatus)}
                    </p>
                    {event.note ? (
                      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-shelter-ink/70">{event.note}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-shelter-ink/50">
                      {formatDateTime(event.createdAt)}
                      {event.actor ? ` / ${event.actor.name || event.actor.email}` : ""}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-shelter-ink/60">Истории статусов пока нет.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="rounded border border-shelter-ink/10 bg-white p-4">
          <h2 className="font-semibold">Животное</h2>
          {application.animal ? (
            <div className="mt-4 grid gap-4">
              {coverPhoto ? (
                <img
                  src={coverPhoto.url}
                  alt={coverPhoto.alt ?? application.animal.name}
                  className="aspect-[4/3] w-full rounded object-cover"
                />
              ) : null}
              <div>
                <p className="text-lg font-semibold">{application.animal.name}</p>
                <p className="text-sm text-shelter-ink/60">
                  {formatEnum(application.animal.species)} / {formatEnum(application.animal.sex)}
                  {application.animal.ageMonths ? ` / ${formatAge(application.animal.ageMonths)}` : ""}
                </p>
              </div>
              <dl className="grid gap-2 text-sm">
                <InfoItem label="Порода" value={application.animal.breed} />
                <InfoItem label="Окрас" value={application.animal.color} />
                <InfoItem label="Размер" value={application.animal.size ? formatEnum(application.animal.size) : null} />
                <InfoItem label="Статус" value={formatEnum(application.animal.status)} />
              </dl>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/animals/${application.animal.id}/edit`}
                  className="rounded border border-shelter-ink/15 px-3 py-2 text-sm font-medium"
                >
                  Редактировать животное
                </Link>
                <Link
                  href={`/animals/${application.animal.slug}`}
                  className="rounded bg-shelter-moss px-3 py-2 text-sm font-medium text-white"
                >
                  Публичная страница
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-shelter-ink/65">
              Эта заявка не привязана к конкретному животному.
            </p>
          )}
        </aside>
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

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-shelter-ink/50">{label}</dt>
      <dd className="mt-1 font-medium text-shelter-ink">{value || "Не указано"}</dd>
    </div>
  );
}

function formatBoolean(value: boolean | null) {
  if (value === null) {
    return "Не указано";
  }

  return value ? "Да" : "Нет";
}

function formatAge(ageMonths: number) {
  if (ageMonths < 12) {
    return `${ageMonths} мес.`;
  }

  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;

  return months ? `${years} г. ${months} мес.` : `${years} г.`;
}

function formatEnum(value: string) {
  const labels: Record<string, string> = {
    NEW: "Новая",
    IN_REVIEW: "На рассмотрении",
    CONTACTED: "Связались",
    CALL_SCHEDULED: "Звонок назначен",
    VISIT_SCHEDULED: "Визит назначен",
    APPROVED: "Одобрена",
    REJECTED: "Отклонена",
    CLOSED: "Закрыта",
    AVAILABLE: "Ищет дом",
    DRAFT: "Черновик",
    RESERVED: "Зарезервирован",
    ADOPTED: "Нашёл дом",
    TREATMENT: "Лечение",
    HIDDEN: "Скрыт",
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

function formatStatus(status: ApplicationStatus) {
  return formatEnum(status);
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

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
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
