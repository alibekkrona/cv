"use client";

import { useState, useTransition } from "react";
import { updateApplicationAdminNoteAction } from "@/app/actions/applications.actions";

type ApplicationAdminNoteEditorProps = {
  className?: string;
  applicationId: number;
  initialNote: string | null;
};

export function ApplicationAdminNoteEditor({
  className = "mt-4",
  applicationId,
  initialNote
}: ApplicationAdminNoteEditorProps) {
  const [note, setNote] = useState(initialNote ?? "");
  const [draft, setDraft] = useState(initialNote ?? "");
  const [isEditing, setIsEditing] = useState(!initialNote);
  const [isPending, startTransition] = useTransition();

  function cancelEditing() {
    setDraft(note);
    setIsEditing(false);
  }

  return (
    <details className={`${className} rounded border border-shelter-ink/10 bg-shelter-cream/40 px-3 py-2`}>
      <summary className="cursor-pointer text-sm font-medium text-shelter-ink">
        Заметка администрации
      </summary>
      <div className="mt-3">
        {isEditing ? (
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const nextNote = draft.trim();

              startTransition(async () => {
                await updateApplicationAdminNoteAction(formData);
                setNote(nextNote);
                setDraft(nextNote);
                setIsEditing(false);
              });
            }}
          >
            <input type="hidden" name="id" value={applicationId} />
            <label className="sr-only" htmlFor={`application-admin-note-${applicationId}`}>
              Служебная информация для команды
            </label>
            <textarea
              id={`application-admin-note-${applicationId}`}
              name="adminNote"
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              placeholder="Итог звонка, план визита, важный контекст"
              className="min-h-24 rounded border border-shelter-ink/20 bg-white px-3 py-2 text-sm text-shelter-ink"
            />
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded border border-shelter-moss px-3 py-1 text-sm font-medium text-shelter-moss disabled:opacity-60"
                disabled={isPending}
              >
                Сохранить
              </button>
              {note ? (
                <button
                  className="rounded border border-shelter-ink/15 px-3 py-1 text-sm font-medium text-shelter-ink/70 disabled:opacity-60"
                  disabled={isPending}
                  onClick={cancelEditing}
                  type="button"
                >
                  Отмена
                </button>
              ) : null}
            </div>
          </form>
        ) : (
          <button
            className="block w-full rounded px-1 py-1 text-left text-sm leading-6 text-shelter-ink/75 hover:bg-white/70"
            onClick={() => setIsEditing(true)}
            type="button"
          >
            {note}
          </button>
        )}
      </div>
    </details>
  );
}
