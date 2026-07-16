"use client";

export default function AdminAnimalsError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="rounded border border-red-200 bg-white p-6">
      <h1 className="text-2xl font-semibold text-red-700">Не удалось загрузить животных</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-shelter-ink/70">
        Попробуйте обновить список. Если ошибка повторится, стоит проверить подключение к базе
        и последние изменения в фильтрах.
      </p>
      {error.digest ? (
        <p className="mt-3 text-xs text-shelter-ink/45">Код ошибки: {error.digest}</p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white"
      >
        Попробовать снова
      </button>
    </section>
  );
}
