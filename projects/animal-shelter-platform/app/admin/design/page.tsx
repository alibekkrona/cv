import { DesignThemeForm } from "@/components/admin/DesignThemeForm";
import { requirePermission } from "@/lib/auth/permissions";
import { getActiveDesignThemeId } from "@/lib/services/design-settings.service";

export const dynamic = "force-dynamic";

type AdminDesignPageProps = {
  searchParams: Promise<{
    saved?: string;
  }>;
};

export default async function AdminDesignPage({ searchParams }: AdminDesignPageProps) {
  await requirePermission("design.manage");

  const [{ saved }, activeTheme] = await Promise.all([
    searchParams,
    getActiveDesignThemeId()
  ]);

  return (
    <section>
      <h1 className="text-2xl font-semibold">Дизайн</h1>
      <p className="mt-2 max-w-3xl text-shelter-ink/70">
        Темы меняют только цветовую схему сайта: фон, карточки, текст, бордеры и акцентные цвета. Расположение элементов остается прежним.
      </p>

      <DesignThemeForm activeTheme={activeTheme} saved={saved === "1"} />
    </section>
  );
}
