import { ContactSettingsForm } from "@/components/admin/ContactSettingsForm";
import { DonationSettingsForm } from "@/components/admin/DonationSettingsForm";
import { SettingsScrollRestorer } from "@/components/admin/SettingsScrollRestorer";
import { VisitHoursForm, WalkingHoursForm } from "@/components/admin/VisitHoursForm";
import { hasPermission, requirePermission } from "@/lib/auth/permissions";
import { getContactSettings } from "@/lib/services/contact-settings.service";
import { getDonationSettings } from "@/lib/services/donation-settings.service";
import { getVisitHours, getWalkingHours } from "@/lib/services/visit-hours.service";

export const dynamic = "force-dynamic";

type AdminSettingsPageProps = {
  searchParams: Promise<{
    saved?: string;
    donationSettingsSaved?: string;
    visitHoursSaved?: string;
    walkingHoursSaved?: string;
  }>;
};

export default async function AdminSettingsPage({ searchParams }: AdminSettingsPageProps) {
  const user = await requirePermission("settings.manage");

  const canManageDonationSettings = hasPermission(user.role, "super.manage");
  const [{ saved, donationSettingsSaved, visitHoursSaved, walkingHoursSaved }, settings, donationSettings, visitHours, walkingHours] = await Promise.all([
    searchParams,
    getContactSettings(),
    canManageDonationSettings ? getDonationSettings() : Promise.resolve(null),
    getVisitHours(),
    getWalkingHours()
  ]);

  return (
    <section>
      <SettingsScrollRestorer />
      <h1 className="text-2xl font-semibold">Настройки</h1>
      <p className="mt-2 text-shelter-ink/70">
        Контактная информация и настройки портала.
      </p>
      <ContactSettingsForm settings={settings} saved={saved === "1"} />
      {canManageDonationSettings ? (
        <DonationSettingsForm settings={donationSettings} saved={donationSettingsSaved === "1"} />
      ) : null}
      <VisitHoursForm hours={visitHours} saved={visitHoursSaved === "1"} />
      <WalkingHoursForm hours={walkingHours} saved={walkingHoursSaved === "1"} />
    </section>
  );
}
