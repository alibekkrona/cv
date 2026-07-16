import { saveDesignThemeAction } from "@/app/actions/design.actions";
import { designThemes, type DesignThemeId } from "@/lib/design/themes";

type DesignThemeFormProps = {
  activeTheme: DesignThemeId;
  saved?: boolean;
};

export function DesignThemeForm({ activeTheme, saved }: DesignThemeFormProps) {
  return (
    <form action={saveDesignThemeAction} className="mt-6 grid gap-5">
      {saved ? (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          Тема применена.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {designThemes.map((theme) => {
          const isActive = theme.id === activeTheme;

          return (
            <label
              key={theme.id}
              className={`cursor-pointer rounded border bg-white p-5 transition ${
                isActive ? "border-shelter-moss ring-2 ring-shelter-moss/40" : "border-shelter-ink/10 hover:border-shelter-moss"
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  name="themeId"
                  type="radio"
                  value={theme.id}
                  defaultChecked={isActive}
                  className="mt-1 h-4 w-4"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{theme.name}</h2>
                    {isActive ? (
                      <span className="rounded-full bg-shelter-moss px-2 py-1 text-xs font-semibold text-white">
                        Активна
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-shelter-ink/65">
                    {theme.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2" aria-hidden="true">
                    {theme.swatches.map((color) => (
                      <span
                        key={color}
                        className="h-9 w-9 rounded-full border border-shelter-ink/15"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <button className="w-fit rounded bg-shelter-moss px-4 py-2 text-sm font-medium text-white">
        Применить тему
      </button>
    </form>
  );
}
