import { prisma } from "@/lib/prisma";

export async function countAnimalLikes(animalId: number) {
  return prisma.animalLike.count({ where: { animalId } });
}

export async function countAnimalViews(animalId: number) {
  return prisma.animalView.count({ where: { animalId } });
}

export async function recordAnimalView(animalId: number, visitorKey: string) {
  await prisma.animalView.upsert({
    where: {
      animalId_visitorKey: {
        animalId,
        visitorKey
      }
    },
    create: {
      animalId,
      visitorKey
    },
    update: {}
  });

  return countAnimalViews(animalId);
}

export async function findAnimalLike(animalId: number, visitorKey: string) {
  return prisma.animalLike.findUnique({
    where: {
      animalId_visitorKey: {
        animalId,
        visitorKey
      }
    }
  });
}

export async function toggleAnimalLike(animalId: number, visitorKey: string) {
  const existingLike = await findAnimalLike(animalId, visitorKey);

  if (existingLike) {
    await prisma.animalLike.delete({ where: { id: existingLike.id } });
    return { liked: false, count: await countAnimalLikes(animalId) };
  }

  await prisma.animalLike.create({
    data: {
      animalId,
      visitorKey
    }
  });

  return { liked: true, count: await countAnimalLikes(animalId) };
}

export async function findVisibleAnimalComments(animalId: number) {
  return prisma.animalComment.findMany({
    where: {
      animalId,
      isHidden: false
    },
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: {
          reports: true
        }
      }
    }
  });
}

export async function findAnimalCommentsForAdmin(animalId: number) {
  return prisma.animalComment.findMany({
    where: { animalId },
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: {
          reports: true
        }
      }
    }
  });
}

export async function countVisibleAnimalComments(animalId: number) {
  return prisma.animalComment.count({
    where: {
      animalId,
      isHidden: false
    }
  });
}

export async function insertAnimalComment(data: {
  animalId: number;
  authorName?: string;
  body: string;
  parentId?: number | null;
  visitorKey: string;
}) {
  return prisma.animalComment.create({
    data: {
      animalId: data.animalId,
      authorName: data.authorName ?? "Аноним",
      body: data.body,
      parentId: data.parentId ?? null,
      visitorKey: data.visitorKey
    }
  });
}

export async function findAnimalCommentById(id: number) {
  return prisma.animalComment.findUnique({ where: { id } });
}

export async function updateAnimalCommentBody(id: number, body: string) {
  return prisma.animalComment.update({
    where: { id },
    data: { body }
  });
}

export async function setAnimalCommentHidden(id: number, isHidden: boolean) {
  return prisma.animalComment.update({
    where: { id },
    data: { isHidden }
  });
}

export async function deleteAnimalCommentById(id: number) {
  return prisma.animalComment.delete({ where: { id } });
}

export async function insertAnimalCommentReport(commentId: number, visitorKey: string) {
  return prisma.animalCommentReport.upsert({
    where: {
      commentId_visitorKey: {
        commentId,
        visitorKey
      }
    },
    create: {
      commentId,
      visitorKey
    },
    update: {}
  });
}

export async function countLostFoundLikes(reportId: number) {
  return prisma.lostFoundLike.count({ where: { reportId } });
}

export async function findLostFoundLike(reportId: number, visitorKey: string) {
  return prisma.lostFoundLike.findUnique({
    where: {
      reportId_visitorKey: {
        reportId,
        visitorKey
      }
    }
  });
}

export async function toggleLostFoundLike(reportId: number, visitorKey: string) {
  const existingLike = await findLostFoundLike(reportId, visitorKey);

  if (existingLike) {
    await prisma.lostFoundLike.delete({ where: { id: existingLike.id } });
    return { liked: false, count: await countLostFoundLikes(reportId) };
  }

  await prisma.lostFoundLike.create({
    data: {
      reportId,
      visitorKey
    }
  });

  return { liked: true, count: await countLostFoundLikes(reportId) };
}

export async function findVisibleLostFoundComments(reportId: number) {
  return prisma.lostFoundComment.findMany({
    where: {
      reportId,
      isHidden: false
    },
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: {
          reports: true
        }
      }
    }
  });
}

export async function countVisibleLostFoundComments(reportId: number) {
  return prisma.lostFoundComment.count({
    where: {
      reportId,
      isHidden: false
    }
  });
}

export async function insertLostFoundComment(data: {
  authorName?: string;
  body: string;
  parentId?: number | null;
  reportId: number;
  visitorKey: string;
}) {
  return prisma.lostFoundComment.create({
    data: {
      authorName: data.authorName ?? "Аноним",
      body: data.body,
      parentId: data.parentId ?? null,
      reportId: data.reportId,
      visitorKey: data.visitorKey
    }
  });
}

export async function findLostFoundCommentById(id: number) {
  return prisma.lostFoundComment.findUnique({ where: { id } });
}

export async function updateLostFoundCommentBody(id: number, body: string) {
  return prisma.lostFoundComment.update({
    where: { id },
    data: { body }
  });
}

export async function insertLostFoundCommentReport(commentId: number, visitorKey: string) {
  return prisma.lostFoundCommentReport.upsert({
    where: {
      commentId_visitorKey: {
        commentId,
        visitorKey
      }
    },
    create: {
      commentId,
      visitorKey
    },
    update: {}
  });
}
