export const designThemes = [
  {
    description: "Текущая темная схема сайта в стиле YouTube.",
    id: "youtube",
    name: "YouTube",
    swatches: ["#0f0f0f", "#212121", "#f1f1f1", "#3ea6ff", "#ff0033"]
  },
  {
    description: "Светлая нейтральная схема для максимально спокойной админской работы.",
    id: "white",
    name: "Белая",
    swatches: ["#f7f7f7", "#ffffff", "#1f2933", "#2563eb", "#e11d48"]
  },
  {
    description: "Светло-серая схема с мягкими контрастами и сдержанным синим акцентом.",
    id: "gray",
    name: "Серая",
    swatches: ["#e5e7eb", "#f9fafb", "#1f2937", "#3b82f6", "#d9466a"]
  },
  {
    description: "Мягкая теплая схема с кремовым фоном и зелеными акцентами.",
    id: "cream",
    name: "Кремовая",
    swatches: ["#f4eadf", "#fffaf3", "#332820", "#3f7a4d", "#c65a42"]
  },
  {
    description: "Контрастная глубокая схема с ночным фоном и янтарными акцентами.",
    id: "midnight",
    name: "Midnight",
    swatches: ["#07111f", "#101b2d", "#eef5ff", "#60a5fa", "#f59e0b"]
  },
  {
    description: "Спокойная природная схема с зеленым акцентом и прохладным фоном.",
    id: "forest",
    name: "Forest",
    swatches: ["#111a14", "#1c261f", "#f3f7ef", "#7ddf8b", "#ef6f6c"]
  }
] as const;

export type DesignThemeId = typeof designThemes[number]["id"];

export const defaultDesignThemeId: DesignThemeId = "youtube";

export function isDesignThemeId(value: string): value is DesignThemeId {
  return designThemes.some((theme) => theme.id === value);
}

export function getDesignThemeById(id: string | null | undefined) {
  return designThemes.find((theme) => theme.id === id) ?? designThemes[0];
}
