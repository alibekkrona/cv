import type { Metadata } from "next";
import { getActiveDesignThemeId } from "@/lib/services/design-settings.service";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Приют для животных",
  description: "Портал пристройства животных."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const activeTheme = await getActiveDesignThemeId();

  return (
    <html lang="ru" data-theme={activeTheme} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
