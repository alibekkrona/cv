import {
  deleteAnimalCommentAction,
  toggleAnimalCommentVisibilityAction
} from "@/app/actions/social.actions";
import type { AnimalCommentTree } from "@/lib/services/social.service";

type AnimalCommentsModerationProps = {
  animalId: number;
  canDelete?: boolean;
  comments: AnimalCommentTree[];
};

export function AnimalCommentsModeration({ animalId, canDelete = false, comments }: AnimalCommentsModerationProps) {
  return (
    <section id="animal-comments" className="mt-6 max-w-4xl rounded border border-shelter-ink/10 bg-white p-5">
      <h2 className="text-lg font-semibold">Комментарии</h2>
      <p className="mt-1 text-sm leading-6 text-shelter-ink/65">
        Комментарии публикуются сразу. Здесь их можно скрыть, вернуть или удалить.
      </p>
      <div className="mt-4 grid gap-3">
        {comments.length ? (
          comments.map((comment) => (
            <ModerationItem key={comment.id} animalId={animalId} canDelete={canDelete} comment={comment} />
          ))
        ) : (
          <p className="rounded border border-shelter-ink/10 px-4 py-6 text-sm text-shelter-ink/60">
            Комментариев пока нет.
          </p>
        )}
      </div>
    </section>
  );
}

function ModerationItem({
  animalId,
  canDelete,
  comment
}: {
  animalId: number;
  canDelete: boolean;
  comment: AnimalCommentTree;
}) {
  return (
    <article className={`rounded border px-4 py-3 ${comment.isHidden ? "border-amber-200 bg-amber-50" : "border-shelter-ink/10"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{comment.authorName}</p>
          <p className="mt-1 text-xs text-shelter-ink/50">{formatDate(comment.createdAt)}</p>
          <p className="mt-1 text-xs font-medium text-red-700">
            Жалоб: {comment._count.reports}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={toggleAnimalCommentVisibilityAction}>
            <input type="hidden" name="animalId" value={animalId} />
            <input type="hidden" name="commentId" value={comment.id} />
            <input type="hidden" name="isHidden" value={String(!comment.isHidden)} />
            <button className="rounded border border-shelter-ink/15 px-3 py-1.5 text-sm font-medium">
              {comment.isHidden ? "Показать" : "Скрыть"}
            </button>
          </form>
          {canDelete ? (
            <form action={deleteAnimalCommentAction}>
              <input type="hidden" name="animalId" value={animalId} />
              <input type="hidden" name="commentId" value={comment.id} />
              <button className="rounded border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700">
                Удалить
              </button>
            </form>
          ) : null}
        </div>
      </div>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-shelter-ink/75">{comment.body}</p>
      {comment.replies.length ? (
        <div className="mt-4 grid gap-2 border-l border-shelter-ink/10 pl-4">
          {comment.replies.map((reply) => (
            <ModerationItem key={reply.id} animalId={animalId} canDelete={canDelete} comment={reply} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
