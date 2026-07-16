import Link from "next/link";
import { logoutAction } from "@/app/actions/auth.actions";
import { hasPermission, type AdminPermission } from "@/lib/auth/permissions";
import type { AdminSessionUser } from "@/lib/auth/session";

const adminLinks = [
  { href: "/admin", label: "Панель", permission: "admin.dashboard" },
  { href: "/admin/animals", label: "Животные", permission: "animals.manage" },
  { href: "/admin/lost-found", label: "Потерянные и найденные", permission: "lostFound.manage" },
  { href: "/admin/applications", label: "Заявки", permission: "applications.manage" },
  { href: "/admin/needs", label: "Потребности", permission: "needs.createDraft" },
  { href: "/admin/donations", label: "Донаты", permission: "donations.view" },
  { href: "/admin/audit-log", label: "Журнал действий", permission: "auditLog.view" },
  { href: "/admin/reports", label: "Отчёты", permission: "super.manage" },
  { href: "/admin/statistics", label: "Статистика", permission: "statistics.view" },
  { href: "/admin/design", label: "Дизайн", permission: "design.manage" },
  { href: "/admin/settings", label: "Настройки", permission: "settings.manage" }
] satisfies Array<{ href: string; label: string; permission: AdminPermission }>;

export function AdminShell({
  children,
  user
}: {
  children: React.ReactNode;
  user: AdminSessionUser;
}) {
  return (
    <div className="grid min-h-screen bg-shelter-cream md:grid-cols-[240px_1fr]">
      <aside className="border-r border-shelter-ink/10 bg-white p-5">
        <p className="font-semibold">Админка приюта</p>
        {user.role !== "SUPER_ADMIN" ? (
          <p className="mt-1 break-all text-xs text-shelter-ink/55">
            {user.name ?? user.email}
          </p>
        ) : null}
        <nav className="mt-6 grid gap-2 text-sm">
          {adminLinks.filter((link) => hasPermission(user.role, link.permission)).map((link) => (
            <Link key={link.href} href={link.href} className="rounded px-3 py-2 hover:bg-shelter-cream">
              {link.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="mt-6">
          <button className="rounded border border-shelter-ink/15 px-3 py-2 text-sm font-medium hover:border-shelter-moss">
            Выйти
          </button>
        </form>
      </aside>
      <main className="p-6">{children}</main>
    </div>
  );
}
