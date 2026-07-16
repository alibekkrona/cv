type PublicTwoColumnLayoutProps = {
  aside: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function PublicTwoColumnLayout({
  aside,
  children,
  className = "pb-8"
}: PublicTwoColumnLayoutProps) {
  return (
    <section className={`mx-auto grid w-full max-w-[1760px] gap-6 px-4 pt-0 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:px-8 ${className}`}>
      <div className="min-w-0">{children}</div>
      <div className="lg:sticky lg:top-6 lg:self-start">{aside}</div>
    </section>
  );
}
