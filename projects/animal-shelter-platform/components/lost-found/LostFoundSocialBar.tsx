"use client";

import { useState, useTransition } from "react";
import { toggleLostFoundLikeAction } from "@/app/actions/social.actions";

type LostFoundSocialBarProps = {
  commentCount: number;
  initialIsLiked: boolean;
  initialLikeCount: number;
  reportId: number;
  reportSlug: string;
};

export function LostFoundSocialBar({
  commentCount,
  initialIsLiked,
  initialLikeCount,
  reportId,
  reportSlug
}: LostFoundSocialBarProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [shareState, setShareState] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggleLike() {
    const nextIsLiked = !isLiked;
    setIsLiked(nextIsLiked);
    setLikeCount((count) => Math.max(0, count + (nextIsLiked ? 1 : -1)));

    const formData = new FormData();
    formData.set("reportId", String(reportId));
    formData.set("reportSlug", reportSlug);

    startTransition(async () => {
      await toggleLostFoundLikeAction(formData);
    });
  }

  async function shareReport() {
    const url = window.location.href;

    if (navigator.share) {
      await navigator.share({ title: document.title, url });
      return;
    }

    await navigator.clipboard.writeText(url);
    setShareState("Ссылка скопирована");
    window.setTimeout(() => setShareState(""), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggleLike}
        disabled={isPending}
        className="inline-flex h-10 min-w-[68px] items-center justify-center gap-1 rounded-full bg-shelter-ink/5 px-3 text-sm font-semibold text-shelter-ink/85 hover:bg-shelter-ink/10"
      >
        <span aria-hidden="true" className={`w-6 text-center text-3xl leading-none ${isLiked ? "text-rose-600" : "text-shelter-ink/85"}`}>
          {isLiked ? "♥" : "♡"}
        </span>
        <span className="min-w-3 text-left">{formatCount(likeCount)}</span>
      </button>
      <a href="#comments" className="inline-flex h-10 items-center rounded-full bg-shelter-ink/5 px-4 text-sm font-semibold text-shelter-ink/85 hover:bg-shelter-ink/10">
        Комментарии {formatCount(commentCount)}
      </a>
      <button
        type="button"
        onClick={shareReport}
        className="inline-flex h-10 items-center rounded-full bg-shelter-ink/5 px-4 text-sm font-semibold text-shelter-ink/85 hover:bg-shelter-ink/10"
      >
        Поделиться
      </button>
      {shareState ? <span className="text-sm text-shelter-moss">{shareState}</span> : null}
    </div>
  );
}

function formatCount(value: number) {
  if (value < 1000) {
    return new Intl.NumberFormat("ru-RU").format(value);
  }

  if (value < 10000) {
    return `${(value / 1000).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} тыс.`;
  }

  return `${Math.round(value / 1000).toLocaleString("ru-RU")} тыс.`;
}
