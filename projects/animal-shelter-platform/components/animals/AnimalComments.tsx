"use client";

import { useState } from "react";
import {
  addAnimalCommentAction,
  editAnimalCommentAction,
  reportAnimalCommentAction
} from "@/app/actions/social.actions";
import type { AnimalCommentTree } from "@/lib/services/social.service";

type AnimalCommentsProps = {
  animalId: number;
  animalSlug: string;
  commentCount: number;
  commentsPage: number;
  commentsPageSize: number;
  commentsTotal: number;
  commentsTotalPages: number;
  comments: AnimalCommentTree[];
  visitorKey: string | null;
};

export function AnimalComments({
  animalId,
  animalSlug,
  commentCount,
  commentsPage,
  commentsPageSize,
  commentsTotal,
  commentsTotalPages,
  comments,
  visitorKey
}: AnimalCommentsProps) {
  return (
    <section id="comments" className="mt-8">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-xl font-semibold">{formatComments(commentCount)}</h2>
      </div>
      <CommentComposer animalId={animalId} animalSlug={animalSlug} />
      <div className="mt-6 grid gap-6">
        {comments.length ? (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              animalId={animalId}
              animalSlug={animalSlug}
              comment={comment}
              depth={0}
              visitorKey={visitorKey}
            />
          ))
        ) : (
          <p className="py-6 text-sm text-shelter-ink/60">Комментариев пока нет.</p>
        )}
      </div>
      <CommentsPagination
        animalSlug={animalSlug}
        currentPage={commentsPage}
        pageSize={commentsPageSize}
        total={commentsTotal}
        totalPages={commentsTotalPages}
      />
    </section>
  );
}

function CommentsPagination({
  animalSlug,
  currentPage,
  pageSize,
  total,
  totalPages
}: {
  animalSlug: string;
  currentPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  const pages = getVisiblePageItems(currentPage, totalPages);

  return (
    <nav className="mt-8 flex flex-col gap-4 border-t border-shelter-ink/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-shelter-ink/60">
        Показано {start}-{end} из {total}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <CommentPageLink disabled={currentPage <= 1} href={buildCommentsPageHref(animalSlug, currentPage - 1)} label="Назад" />
        {pages.map((item, index) => item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="inline-flex min-h-10 min-w-10 items-center justify-center px-2 text-sm text-shelter-ink/45">
            ...
          </span>
        ) : (
          <CommentPageLink key={item} active={item === currentPage} href={buildCommentsPageHref(animalSlug, item)} label={String(item)} />
        ))}
        <CommentPageLink disabled={currentPage >= totalPages} href={buildCommentsPageHref(animalSlug, currentPage + 1)} label="Вперёд" />
      </div>
    </nav>
  );
}

function CommentPageLink({
  active,
  disabled,
  href,
  label
}: {
  active?: boolean;
  disabled?: boolean;
  href: string;
  label: string;
}) {
  const className = [
    "inline-flex min-h-10 min-w-10 items-center justify-center rounded border px-3 text-sm font-medium",
    active ? "border-shelter-moss bg-shelter-moss text-white" : "border-shelter-ink/15 bg-white text-shelter-ink",
    disabled ? "pointer-events-none opacity-45" : "hover:border-shelter-moss"
  ].join(" ");

  return (
    <a href={href} aria-current={active ? "page" : undefined} className={className}>
      {label}
    </a>
  );
}

type PageItem = number | "ellipsis";

function getVisiblePageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const visiblePages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const items: PageItem[] = [];

  for (const page of visiblePages) {
    const previous = items.at(-1);
    if (typeof previous === "number" && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  }

  return items;
}

function buildCommentsPageHref(animalSlug: string, page: number) {
  const query = page > 1 ? `?commentsPage=${page}` : "";
  return `/animals/${animalSlug}${query}#comments`;
}

function CommentItem({
  animalId,
  animalSlug,
  comment,
  depth,
  visitorKey
}: {
  animalId: number;
  animalSlug: string;
  comment: AnimalCommentTree;
  depth: number;
  visitorKey: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const canEdit = visitorKey === comment.visitorKey;
  const displayName = "Аноним";
  const avatarLetter = "А";

  return (
    <article className={depth ? "grid gap-3" : ""}>
      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-shelter-moss text-sm font-semibold text-white">
          {avatarLetter}
        </div>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-semibold">{displayName}</span>
                <span className="ml-2 text-shelter-ink/50">{formatRelativeTime(comment.createdAt)}</span>
              </p>
              {isEditing ? (
                <form action={editAnimalCommentAction} className="mt-3 grid gap-2">
                  <input type="hidden" name="commentId" value={comment.id} />
                  <input type="hidden" name="animalSlug" value={animalSlug} />
                  <textarea
                    name="body"
                    required
                    defaultValue={comment.body}
                    className="min-h-24 rounded border border-shelter-ink/20 bg-white px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button className="rounded-full bg-shelter-ink px-4 py-2 text-sm font-medium text-white">
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="rounded-full px-4 py-2 text-sm font-medium hover:bg-shelter-ink/5"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              ) : (
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-shelter-ink/80">{comment.body}</p>
              )}
            </div>
            <details className="relative shrink-0">
              <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-lg hover:bg-shelter-ink/5">
                ⋯
              </summary>
              <div className="absolute right-0 z-10 mt-1 min-w-40 rounded border border-shelter-ink/10 bg-white py-1 text-sm shadow-lg">
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="block w-full px-4 py-2 text-left hover:bg-shelter-ink/5"
                  >
                    Редактировать
                  </button>
                ) : null}
                <form action={reportAnimalCommentAction}>
                  <input type="hidden" name="animalId" value={animalId} />
                  <input type="hidden" name="commentId" value={comment.id} />
                  <input type="hidden" name="animalSlug" value={animalSlug} />
                  <button className="block w-full px-4 py-2 text-left hover:bg-shelter-ink/5">
                    Пожаловаться
                  </button>
                </form>
              </div>
            </details>
          </div>
          <div className="mt-2 flex gap-3 text-sm font-medium">
            <button
              type="button"
              onClick={() => setIsReplying((value) => !value)}
              className="rounded-full px-3 py-1.5 hover:bg-shelter-ink/5"
            >
              Ответить
            </button>
          </div>
          {isReplying ? (
            <CommentComposer
              animalId={animalId}
              animalSlug={animalSlug}
              compact
              parentId={comment.id}
            />
          ) : null}
          {comment.replies.length ? (
            <div className="mt-4 grid gap-5 border-l border-shelter-ink/10 pl-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  animalId={animalId}
                  animalSlug={animalSlug}
                  comment={reply}
                  depth={depth + 1}
                  visitorKey={visitorKey}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CommentComposer({
  animalId,
  animalSlug,
  compact,
  parentId
}: {
  animalId: number;
  animalSlug: string;
  compact?: boolean;
  parentId?: number;
}) {
  const [body, setBody] = useState("");
  const isActive = body.trim().length > 0;

  return (
    <form action={addAnimalCommentAction} className={`${compact ? "mt-3" : "mt-5"} grid grid-cols-[40px_minmax(0,1fr)] gap-3`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-shelter-leaf text-sm font-semibold text-shelter-moss">
        А
      </div>
      <div>
        <input type="hidden" name="animalId" value={animalId} />
        <input type="hidden" name="animalSlug" value={animalSlug} />
        {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
        <textarea
          name="body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={parentId ? "Введите ответ" : "Введите комментарий"}
          required
          rows={1}
          className="min-h-10 w-full resize-y border-0 border-b border-shelter-ink/20 bg-transparent px-0 py-2 text-sm outline-none focus:border-shelter-ink"
        />
        <div className={`mt-2 flex justify-end gap-2 ${isActive ? "" : "hidden"}`}>
          <button
            type="button"
            onClick={() => setBody("")}
            className="rounded-full px-4 py-2 text-sm font-medium hover:bg-shelter-ink/5"
          >
            Отмена
          </button>
          <button
            disabled={!isActive}
            className="rounded-full bg-shelter-moss px-4 py-2 text-sm font-medium text-white disabled:bg-shelter-ink/20"
          >
            {parentId ? "Ответить" : "Оставить комментарий"}
          </button>
        </div>
      </div>
    </form>
  );
}

function formatRelativeTime(value: Date | string) {
  const date = new Date(value);
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) {
    return formatUnit(seconds, "секунду", "секунды", "секунд");
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return formatUnit(minutes, "минуту", "минуты", "минут");
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return formatUnit(hours, "час", "часа", "часов");
  }

  const days = Math.floor(hours / 24);
  if (days < 31) {
    return formatUnit(days, "день", "дня", "дней");
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return formatUnit(months, "месяц", "месяца", "месяцев");
  }

  return formatUnit(Math.floor(months / 12), "год", "года", "лет");
}

function formatUnit(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10;
  const mod100 = value % 100;
  const word = mod10 === 1 && mod100 !== 11
    ? one
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
      ? few
      : many;

  return `${value} ${word} назад`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatComments(value: number) {
  return `${formatCount(value)} ${pluralize(value, "комментарий", "комментария", "комментариев")}`;
}

function pluralize(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }

  return many;
}
