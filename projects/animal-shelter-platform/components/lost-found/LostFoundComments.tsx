"use client";

import { useState } from "react";
import {
  addLostFoundCommentAction,
  editLostFoundCommentAction,
  reportLostFoundCommentAction
} from "@/app/actions/social.actions";
import type { LostFoundCommentTree } from "@/lib/services/social.service";

type LostFoundCommentsProps = {
  commentCount: number;
  comments: LostFoundCommentTree[];
  reportId: number;
  reportSlug: string;
  visitorKey: string | null;
};

export function LostFoundComments({
  commentCount,
  comments,
  reportId,
  reportSlug,
  visitorKey
}: LostFoundCommentsProps) {
  return (
    <section id="comments" className="mt-8">
      <h2 className="text-xl font-semibold">{formatComments(commentCount)}</h2>
      <CommentComposer reportId={reportId} reportSlug={reportSlug} />
      <div className="mt-6 grid gap-6">
        {comments.length ? (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              depth={0}
              reportId={reportId}
              reportSlug={reportSlug}
              visitorKey={visitorKey}
            />
          ))
        ) : (
          <p className="py-6 text-sm text-shelter-ink/60">Комментариев пока нет.</p>
        )}
      </div>
    </section>
  );
}

function CommentItem({
  comment,
  depth,
  reportId,
  reportSlug,
  visitorKey
}: {
  comment: LostFoundCommentTree;
  depth: number;
  reportId: number;
  reportSlug: string;
  visitorKey: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const canEdit = visitorKey === comment.visitorKey;

  return (
    <article className={depth ? "grid gap-3" : ""}>
      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-shelter-moss text-sm font-semibold text-white">
          А
        </div>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-semibold">Аноним</span>
                <span className="ml-2 text-shelter-ink/50">{formatRelativeTime(comment.createdAt)}</span>
              </p>
              {isEditing ? (
                <form action={editLostFoundCommentAction} className="mt-3 grid gap-2">
                  <input type="hidden" name="commentId" value={comment.id} />
                  <input type="hidden" name="reportSlug" value={reportSlug} />
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
                ...
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
                <form action={reportLostFoundCommentAction}>
                  <input type="hidden" name="commentId" value={comment.id} />
                  <input type="hidden" name="reportSlug" value={reportSlug} />
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
            <CommentComposer compact parentId={comment.id} reportId={reportId} reportSlug={reportSlug} />
          ) : null}
          {comment.replies.length ? (
            <div className="mt-4 grid gap-5 border-l border-shelter-ink/10 pl-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  depth={depth + 1}
                  reportId={reportId}
                  reportSlug={reportSlug}
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
  compact,
  parentId,
  reportId,
  reportSlug
}: {
  compact?: boolean;
  parentId?: number;
  reportId: number;
  reportSlug: string;
}) {
  const [body, setBody] = useState("");
  const isActive = body.trim().length > 0;

  return (
    <form action={addLostFoundCommentAction} className={`${compact ? "mt-3" : "mt-5"} grid grid-cols-[40px_minmax(0,1fr)] gap-3`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-shelter-leaf text-sm font-semibold text-shelter-moss">
        А
      </div>
      <div>
        <input type="hidden" name="reportId" value={reportId} />
        <input type="hidden" name="reportSlug" value={reportSlug} />
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

function formatComments(count: number) {
  return `${new Intl.NumberFormat("ru-RU").format(count)} ${pluralize(count, "комментарий", "комментария", "комментариев")}`;
}

function formatRelativeTime(value: Date | string) {
  const date = new Date(value);
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) return formatUnit(seconds, "секунду", "секунды", "секунд");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return formatUnit(minutes, "минуту", "минуты", "минут");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatUnit(hours, "час", "часа", "часов");
  const days = Math.floor(hours / 24);
  if (days < 31) return formatUnit(days, "день", "дня", "дней");
  const months = Math.floor(days / 30);
  if (months < 12) return formatUnit(months, "месяц", "месяца", "месяцев");
  return formatUnit(Math.floor(months / 12), "год", "года", "лет");
}

function formatUnit(value: number, one: string, few: string, many: string) {
  return `${value} ${pluralize(value, one, few, many)} назад`;
}

function pluralize(value: number, one: string, few: string, many: string) {
  const mod10 = value % 10;
  const mod100 = value % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
