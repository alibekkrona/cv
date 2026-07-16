import type { Prisma } from "@prisma/client";
import {
  countAnimalLikes,
  countAnimalViews,
  countLostFoundLikes,
  countVisibleAnimalComments,
  countVisibleLostFoundComments,
  deleteAnimalCommentById,
  findAnimalCommentById,
  findAnimalCommentsForAdmin,
  findAnimalLike,
  findLostFoundCommentById,
  findLostFoundLike,
  findVisibleAnimalComments,
  findVisibleLostFoundComments,
  insertAnimalComment,
  insertAnimalCommentReport,
  insertLostFoundComment,
  insertLostFoundCommentReport,
  recordAnimalView,
  setAnimalCommentHidden,
  toggleAnimalLike,
  toggleLostFoundLike,
  updateAnimalCommentBody,
  updateLostFoundCommentBody
} from "@/lib/repositories/social.repository";

type AnimalCommentWithReportCount = Prisma.AnimalCommentGetPayload<{
  include: {
    _count: {
      select: {
        reports: true;
      };
    };
  };
}>;

export type AnimalCommentTree = AnimalCommentWithReportCount & {
  replies: AnimalCommentTree[];
};

type LostFoundCommentWithReportCount = Prisma.LostFoundCommentGetPayload<{
  include: {
    _count: {
      select: {
        reports: true;
      };
    };
  };
}>;

export type LostFoundCommentTree = LostFoundCommentWithReportCount & {
  replies: LostFoundCommentTree[];
};

export async function getAnimalSocialState(
  animalId: number,
  visitorKey: string | null,
  options: { commentsPage?: number; commentsPageSize?: number } = {}
) {
  const commentsPageSize = options.commentsPageSize ?? 10;
  const requestedCommentsPage = options.commentsPage ?? 1;
  const [likeCount, viewCount, commentCount, comments, existingLike] = await Promise.all([
    countAnimalLikes(animalId),
    countAnimalViews(animalId),
    countVisibleAnimalComments(animalId),
    findVisibleAnimalComments(animalId),
    visitorKey ? findAnimalLike(animalId, visitorKey) : null
  ]);
  const commentTree = buildCommentTree(comments);
  const commentsTotal = commentTree.length;
  const commentsTotalPages = Math.max(1, Math.ceil(commentsTotal / commentsPageSize));
  const commentsPage = Math.min(Math.max(requestedCommentsPage, 1), commentsTotalPages);
  const commentStart = (commentsPage - 1) * commentsPageSize;

  return {
    commentCount,
    comments: commentTree.slice(commentStart, commentStart + commentsPageSize),
    commentsPage,
    commentsPageSize,
    commentsTotal,
    commentsTotalPages,
    isLiked: Boolean(existingLike),
    likeCount,
    viewCount
  };
}

export async function toggleLike(animalId: number, visitorKey: string) {
  return toggleAnimalLike(animalId, visitorKey);
}

export async function registerAnimalView(animalId: number, visitorKey: string) {
  return recordAnimalView(animalId, visitorKey);
}

export async function addAnimalComment(input: {
  animalId: number;
  authorName?: string;
  body: string;
  parentId?: number | null;
  visitorKey: string;
}) {
  const body = input.body.trim();

  if (!body) {
    throw new Error("Comment body is required.");
  }

  if (input.parentId) {
    const parent = await findAnimalCommentById(input.parentId);

    if (!parent || parent.animalId !== input.animalId) {
      throw new Error("Comment parent is not allowed.");
    }
  }

  return insertAnimalComment({
    animalId: input.animalId,
    authorName: input.authorName?.trim() || "Аноним",
    body,
    parentId: input.parentId,
    visitorKey: input.visitorKey
  });
}

export async function editAnimalComment(id: number, body: string, visitorKey: string) {
  const comment = await findAnimalCommentById(id);

  if (!comment || comment.visitorKey !== visitorKey) {
    throw new Error("Comment edit is not allowed.");
  }

  const normalizedBody = body.trim();

  if (!normalizedBody) {
    throw new Error("Comment body is required.");
  }

  return updateAnimalCommentBody(id, normalizedBody);
}

export async function getAnimalCommentsForAdmin(animalId: number) {
  return buildCommentTree(await findAnimalCommentsForAdmin(animalId));
}

export async function updateAnimalCommentVisibility(id: number, isHidden: boolean) {
  return setAnimalCommentHidden(id, isHidden);
}

export async function deleteAnimalComment(id: number) {
  return deleteAnimalCommentById(id);
}

export async function reportAnimalComment(id: number, visitorKey: string) {
  const comment = await findAnimalCommentById(id);

  if (!comment) {
    throw new Error("Comment not found.");
  }

  return insertAnimalCommentReport(id, visitorKey);
}

export async function getLostFoundSocialState(
  reportId: number,
  visitorKey: string | null,
  options: { commentsPage?: number; commentsPageSize?: number } = {}
) {
  const commentsPageSize = options.commentsPageSize ?? 10;
  const requestedCommentsPage = options.commentsPage ?? 1;
  const [likeCount, commentCount, comments, existingLike] = await Promise.all([
    countLostFoundLikes(reportId),
    countVisibleLostFoundComments(reportId),
    findVisibleLostFoundComments(reportId),
    visitorKey ? findLostFoundLike(reportId, visitorKey) : null
  ]);
  const commentTree = buildLostFoundCommentTree(comments);
  const commentsTotal = commentTree.length;
  const commentsTotalPages = Math.max(1, Math.ceil(commentsTotal / commentsPageSize));
  const commentsPage = Math.min(Math.max(requestedCommentsPage, 1), commentsTotalPages);
  const commentStart = (commentsPage - 1) * commentsPageSize;

  return {
    commentCount,
    comments: commentTree.slice(commentStart, commentStart + commentsPageSize),
    commentsPage,
    commentsPageSize,
    commentsTotal,
    commentsTotalPages,
    isLiked: Boolean(existingLike),
    likeCount
  };
}

export async function toggleLostFoundReportLike(reportId: number, visitorKey: string) {
  return toggleLostFoundLike(reportId, visitorKey);
}

export async function addLostFoundComment(input: {
  body: string;
  parentId?: number | null;
  reportId: number;
  visitorKey: string;
}) {
  const body = input.body.trim();

  if (!body) {
    throw new Error("Comment body is required.");
  }

  if (input.parentId) {
    const parent = await findLostFoundCommentById(input.parentId);

    if (!parent || parent.reportId !== input.reportId) {
      throw new Error("Comment parent is not allowed.");
    }
  }

  return insertLostFoundComment({
    body,
    parentId: input.parentId,
    reportId: input.reportId,
    visitorKey: input.visitorKey
  });
}

export async function editLostFoundComment(id: number, body: string, visitorKey: string) {
  const comment = await findLostFoundCommentById(id);

  if (!comment || comment.visitorKey !== visitorKey) {
    throw new Error("Comment edit is not allowed.");
  }

  const normalizedBody = body.trim();

  if (!normalizedBody) {
    throw new Error("Comment body is required.");
  }

  return updateLostFoundCommentBody(id, normalizedBody);
}

export async function reportLostFoundComment(id: number, visitorKey: string) {
  const comment = await findLostFoundCommentById(id);

  if (!comment) {
    throw new Error("Comment not found.");
  }

  return insertLostFoundCommentReport(id, visitorKey);
}

function buildCommentTree(comments: AnimalCommentWithReportCount[]) {
  const byId = new Map<number, AnimalCommentTree>();
  const roots: AnimalCommentTree[] = [];

  for (const comment of comments) {
    byId.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of comments) {
    const item = byId.get(comment.id);

    if (!item) {
      continue;
    }

    const parent = comment.parentId ? byId.get(comment.parentId) : null;

    if (parent) {
      parent.replies.push(item);
    } else {
      roots.push(item);
    }
  }

  return roots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function buildLostFoundCommentTree(comments: LostFoundCommentWithReportCount[]) {
  const byId = new Map<number, LostFoundCommentTree>();
  const roots: LostFoundCommentTree[] = [];

  for (const comment of comments) {
    byId.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of comments) {
    const item = byId.get(comment.id);

    if (!item) {
      continue;
    }

    const parent = comment.parentId ? byId.get(comment.parentId) : null;

    if (parent) {
      parent.replies.push(item);
    } else {
      roots.push(item);
    }
  }

  return roots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
