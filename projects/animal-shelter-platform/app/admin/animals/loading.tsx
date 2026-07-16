export default function AdminAnimalsLoading() {
  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="h-8 w-40 rounded bg-shelter-ink/10" />
          <div className="mt-3 h-5 w-96 max-w-full rounded bg-shelter-ink/10" />
        </div>
        <div className="h-10 w-36 rounded bg-shelter-ink/10" />
      </div>

      <div className="mt-6 h-28 rounded border border-shelter-ink/10 bg-white" />

      <div className="mt-5 grid gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="grid gap-4 rounded border border-shelter-ink/10 bg-white px-4 py-4 lg:grid-cols-[92px_1fr_180px_140px]">
            <div className="h-24 w-24 rounded bg-shelter-ink/10" />
            <div className="grid content-center gap-3">
              <div className="h-5 w-48 rounded bg-shelter-ink/10" />
              <div className="h-4 w-72 max-w-full rounded bg-shelter-ink/10" />
              <div className="h-4 w-56 max-w-full rounded bg-shelter-ink/10" />
            </div>
            <div className="grid content-center gap-2">
              <div className="h-4 w-32 rounded bg-shelter-ink/10" />
              <div className="h-4 w-28 rounded bg-shelter-ink/10" />
            </div>
            <div className="h-10 w-32 rounded bg-shelter-ink/10" />
          </div>
        ))}
      </div>
    </section>
  );
}
