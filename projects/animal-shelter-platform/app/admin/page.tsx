import Link from "next/link";
import type { ApplicationStatus, ApplicationType } from "@prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
import { getAdminDashboard } from "@/lib/services/dashboard.service";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requirePermission("admin.dashboard");

  const dashboard = await getAdminDashboard();

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Панель администратора</h1>
        <p className="mt-2 text-shelter-ink/70">
          Рабочий обзор для сотрудников приюта.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard href="/admin/animals" label="Животные" value={dashboard.totalAnimals} />
        <MetricCard href="/admin/animals" label="Ищут дом" value={dashboard.availableAnimals} />
        <MetricCard href="/admin/applications?status=NEW" label="Новые заявки" value={dashboard.newApplications} />
        <MetricCard href="/admin/applications" label="Все заявки" value={dashboard.totalApplications} />
        <MetricCard href="/admin/applications?status=CONTACTED" label="Есть контакт" value={dashboard.contactedApplications} />
        <MetricCard href="/admin/needs?attention=1" label="Потребности требуют внимания" value={dashboard.needsRequiringAttention} />
        <MetricCard href="/admin/animals" label="Черновики" value={dashboard.draftAnimals} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded border border-shelter-ink/10 bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-shelter-ink/10 px-4 py-3">
            <h2 className="font-semibold">Последние заявки</h2>
            <Link href="/admin/applications" className="text-sm font-medium text-shelter-moss">
              Смотреть все
            </Link>
          </div>
          {dashboard.recentApplications.length ? (
            dashboard.recentApplications.map((application) => (
              <div
                key={application.id}
                className="grid gap-2 border-b border-shelter-ink/10 px-4 py-3 last:border-0 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{application.applicantName}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusClassName(application.status)}`}>
                      {formatStatus(application.status)}
                    </span>
                    <span className="rounded-full bg-shelter-cream px-2 py-1 text-xs font-medium text-shelter-ink/65">
                      {formatApplicationType(application.type)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-shelter-ink/60">
                    {application.animal?.name ?? "Животное не выбрано"}
                  </p>
                </div>
                <time className="text-sm text-shelter-ink/50" dateTime={application.createdAt.toISOString()}>
                  {application.createdAt.toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "short"
                  })}
                </time>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-shelter-ink/60">
              Заявок пока нет.
            </div>
          )}
        </section>
        <section className="rounded border border-shelter-ink/10 bg-white p-4">
          <h2 className="font-semibold">Быстрые действия</h2>
          <div className="mt-4 grid gap-2">
            <Link href="/admin/animals/new" className="rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
              Добавить животное
            </Link>
            <Link href="/admin/applications?status=NEW" className="rounded border border-shelter-ink/15 px-4 py-2 text-sm font-medium">
              Проверить новые заявки
            </Link>
            <Link href="/admin/needs?attention=1" className="rounded border border-shelter-ink/15 px-4 py-2 text-sm font-medium">
              Потребности требуют внимания
            </Link>
            <Link href="/admin/animals" className="rounded border border-shelter-ink/15 px-4 py-2 text-sm font-medium">
              Управлять животными
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}

function MetricCard({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href} className="rounded border border-shelter-ink/10 bg-white p-4 transition hover:border-shelter-moss">
      <p className="text-sm text-shelter-ink/60">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Link>
  );
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
