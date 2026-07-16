import {
  findDesignSettings,
  upsertDesignSettings
} from "@/lib/repositories/design-settings.repository";
import {
  defaultDesignThemeId,
  isDesignThemeId,
  type DesignThemeId
} from "@/lib/design/themes";

export async function getActiveDesignThemeId(): Promise<DesignThemeId> {
  const settings = await findDesignSettings();

  return isDesignThemeId(settings?.activeTheme ?? "")
    ? settings!.activeTheme as DesignThemeId
    : defaultDesignThemeId;
}

export async function saveActiveDesignTheme(themeId: string) {
  if (!isDesignThemeId(themeId)) {
    throw new Error("Unknown design theme.");
  }

  return upsertDesignSettings(themeId);
}
