import { randomUUID } from "crypto";
import type { DonationStatus, DonationTarget, NeedScope, NeedStatus, PaymentProvider, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function findPublicNeeds(options: {
  animalId?: number;
  limit?: number;
  page?: number;
  pageSize?: number;
  scope?: NeedScope;
  status?: "active" | "closed" | "all";
} = {}) {
  const statuses = getPublicNeedStatuses(options.status);

  return prisma.need.findMany({
    where: {
      animalId: options.animalId,
      scope: options.scope,
      status: { in: statuses },
      publishedAt: { not: null }
    },
    orderBy: publicNeedOrderBy,
    take: options.limit,
    include: publicNeedInclude
  });
}

export async function findPublicNeedsPage(options: {
  animalId?: number;
  page?: number;
  pageSize?: number;
  scope?: NeedScope;
  status?: "active" | "closed" | "all";
} = {}) {
  const statuses = getPublicNeedStatuses(options.status);
  const where: Prisma.NeedWhereInput = {
    animalId: options.animalId,
    scope: options.scope,
    status: { in: statuses },
    publishedAt: { not: null }
  };
  const pageSize = options.pageSize ?? 24;
  const requestedPage = options.page ?? 1;
  const requestedSkip = (Math.max(requestedPage, 1) - 1) * pageSize;
  const [total, requestedItems] = await Promise.all([
    prisma.need.count({ where }),
    prisma.need.findMany({
      where,
      skip: requestedSkip,
      take: pageSize,
      orderBy: publicNeedOrderBy,
      include: publicNeedInclude
    })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  const items = page === requestedPage
    ? requestedItems
    : await prisma.need.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: publicNeedOrderBy,
        include: publicNeedInclude
      });

  return {
    items,
    page,
    pageSize,
    total,
    totalPages
  };
}

export async function findPublicNeedBySlug(slug: string) {
  return prisma.need.findFirst({
    where: {
      slug,
      status: { in: ["ACTIVE", "FUNDED", "FULFILLED"] },
      publishedAt: { not: null }
    },
    include: publicNeedInclude
  });
}

export async function findAdminNeeds(filters: { animalId?: number; scope?: NeedScope; status?: NeedStatus } = {}) {
  return prisma.need.findMany({
    where: {
      animalId: filters.animalId,
      scope: filters.scope,
      status: filters.status
    },
    orderBy: [{ updatedAt: "desc" }],
    include: adminNeedInclude
  });
}

export async function findAdminNeedsPage(filters: {
  animalId?: number;
  attention?: boolean;
  page?: number;
  pageSize?: number;
  scope?: NeedScope;
  status?: NeedStatus;
} = {}) {
  const where: Prisma.NeedWhereInput = {
    animalId: filters.animalId,
    scope: filters.scope,
    status: filters.attention
      ? { in: ["FUNDED", "ANIMAL_ADOPTED"] }
      : filters.status
  };
  const pageSize = filters.pageSize ?? 25;
  const requestedPage = filters.page ?? 1;
  const requestedSkip = (Math.max(requestedPage, 1) - 1) * pageSize;
  const [total, requestedItems] = await Promise.all([
    prisma.need.count({ where }),
    prisma.need.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: requestedSkip,
      take: pageSize,
      include: adminNeedInclude
    })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  const items = page === requestedPage
    ? requestedItems
    : await prisma.need.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: adminNeedInclude
      });

  return { items, page, pageSize, total, totalPages };
}

export async function findAdminNeedById(id: number) {
  return prisma.need.findUnique({
    where: { id },
    include: adminNeedInclude
  });
}

export async function findNeedStatusById(id: number) {
  return prisma.need.findUnique({
    where: { id },
    select: { status: true }
  });
}

export async function findNeedAuditSnapshotById(id: number) {
  return prisma.need.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      scope: true,
      animalId: true,
      targetCents: true,
      raisedCents: true,
      status: true,
      isUrgent: true,
      priority: true,
      publishedAt: true,
      updatedAt: true
    }
  });
}

export async function upsertNeedAuditByNeedId(needId: number, data: Prisma.NeedAuditCreateInput) {
  const existing = await prisma.needAudit.findFirst({
    where: { needId },
    select: { id: true }
  });
  const photosCreate = Array.isArray(data.photos?.create) ? data.photos.create : [];

  if (existing) {
    const audit = await prisma.needAudit.update({
      where: { id: existing.id },
      data: {
        description: data.description,
        photos: {
          deleteMany: {},
          create: photosCreate
        },
        publishedAt: data.publishedAt,
        title: data.title
      }
    });

    return { audit, created: false };
  }

  const audit = await prisma.needAudit.create({ data });
  return { audit, created: true };
}

export async function markNeedFulfilled(needId: number, actorUserId?: number) {
  return prisma.need.update({
    where: { id: needId },
    data: {
      status: "FULFILLED",
      statusChangedAt: new Date(),
      statusChangedBy: actorUserId ? { connect: { id: actorUserId } } : undefined
    }
  });
}

export async function findNeedSlugConflict(slug: string, excludeId?: number) {
  return prisma.need.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      slug
    },
    select: { id: true }
  });
}

export async function insertNeed(data: Prisma.NeedCreateInput) {
  return prisma.need.create({ data });
}

export async function updateNeedById(id: number, data: Prisma.NeedUpdateInput) {
  return prisma.need.update({ where: { id }, data });
}

export async function deleteNeedById(id: number) {
  return prisma.need.delete({ where: { id } });
}

export async function insertDonation(data: Prisma.DonationCreateInput) {
  return prisma.$transaction(async (tx) => {
    const donation = await tx.donation.create({ data });

    if (donation.status === "PAID" && donation.needId) {
      await tx.need.update({
        where: { id: donation.needId },
        data: { raisedCents: { increment: donation.amountCents } }
      });
    }

    return donation;
  });
}

export async function insertDonationWithPayment(data: Prisma.DonationCreateInput, provider: PaymentProvider) {
  return prisma.$transaction(async (tx) => {
    const donation = await tx.donation.create({ data });
    const payment = await tx.donationPayment.create({
      data: {
        amountCents: donation.amountCents,
        currency: "UAH",
        donationId: donation.id,
        provider,
        publicId: randomUUID(),
        status: "CREATED",
        events: {
          create: {
            status: "CREATED"
          }
        }
      },
      include: paymentInclude
    });

    return { donation, payment };
  });
}

export async function findPaymentByPublicId(publicId: string) {
  return prisma.donationPayment.findUnique({
    where: { publicId },
    include: paymentInclude
  });
}

export async function findPaymentByProviderPaymentId(provider: PaymentProvider, providerPaymentId: string) {
  return prisma.donationPayment.findFirst({
    where: { provider, providerPaymentId },
    include: paymentInclude
  });
}

export async function updatePaymentCheckoutData(
  id: number,
  data: Pick<Prisma.DonationPaymentUpdateInput, "checkoutUrl" | "providerPaymentId" | "requestJson" | "responseJson" | "status">
) {
  return prisma.donationPayment.update({
    where: { id },
    data,
    include: paymentInclude
  });
}

export async function applyPaymentStatus(
  id: number,
  status: PaymentStatus,
  payload?: Prisma.InputJsonValue
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.donationPayment.update({
      where: { id },
      data: {
        rawCallbackJson: payload,
        status,
        events: {
          create: {
            payload,
            status
          }
        }
      },
      include: paymentInclude
    });

    if (status === "SUCCEEDED" && payment.donation.status !== "PAID") {
      await tx.donation.update({
        where: { id: payment.donationId },
        data: { status: "PAID" }
      });

      if (payment.donation.needId) {
        await tx.need.update({
          where: { id: payment.donation.needId },
          data: { raisedCents: { increment: payment.amountCents } }
        });
      }
    }

    if (["FAILED", "CANCELLED"].includes(status) && payment.donation.status === "PLEDGED") {
      await tx.donation.update({
        where: { id: payment.donationId },
        data: { status: "CANCELLED" }
      });
    }

    return payment;
  });
}

export async function findAdminDonations(filters: {
  status?: DonationStatus;
  target?: DonationTarget;
} = {}) {
  return prisma.donation.findMany({
    where: {
      status: filters.status,
      target: filters.target
    },
    orderBy: { createdAt: "desc" },
    include: donationInclude
  });
}

export async function findAdminDonationsPage(filters: {
  animalQuery?: string;
  page?: number;
  pageSize?: number;
  query?: string;
  sort?: "amount" | "created";
  status?: DonationStatus;
  target?: DonationTarget;
} = {}) {
  const where: Prisma.DonationWhereInput = {
    status: filters.status,
    target: filters.target,
    animal: filters.animalQuery
      ? { name: { contains: filters.animalQuery } }
      : undefined,
    OR: filters.query
      ? [
          { donorName: { contains: filters.query } },
          { donorEmail: { contains: filters.query } },
          { donorPhone: { contains: filters.query } },
          { message: { contains: filters.query } },
          { need: { title: { contains: filters.query } } },
          { animal: { name: { contains: filters.query } } }
        ]
      : undefined
  };
  const pageSize = filters.pageSize ?? 25;
  const requestedPage = filters.page ?? 1;
  const requestedSkip = (Math.max(requestedPage, 1) - 1) * pageSize;
  const orderBy: Prisma.DonationOrderByWithRelationInput =
    filters.sort === "amount" ? { amountCents: "desc" } : { createdAt: "desc" };
  const [total, requestedItems] = await Promise.all([
    prisma.donation.count({ where }),
    prisma.donation.findMany({
      where,
      orderBy,
      skip: requestedSkip,
      take: pageSize,
      include: donationInclude
    })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  const items = page === requestedPage
    ? requestedItems
    : await prisma.donation.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: donationInclude
      });

  return { items, page, pageSize, total, totalPages };
}

export async function findAdminNeedAuditsPage(filters: {
  page?: number;
  pageSize?: number;
  query?: string;
  scope?: NeedScope;
} = {}) {
  const where: Prisma.NeedAuditWhereInput = {
    need: {
      scope: filters.scope
    },
    OR: filters.query
      ? [
          { title: { contains: filters.query } },
          { description: { contains: filters.query } },
          { need: { title: { contains: filters.query } } },
          { need: { animal: { name: { contains: filters.query } } } }
        ]
      : undefined
  };
  const pageSize = filters.pageSize ?? 25;
  const requestedPage = filters.page ?? 1;
  const requestedSkip = (Math.max(requestedPage, 1) - 1) * pageSize;
  const [total, requestedItems] = await Promise.all([
    prisma.needAudit.count({ where }),
    prisma.needAudit.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: requestedSkip,
      take: pageSize,
      include: adminNeedAuditInclude
    })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);
  const items = page === requestedPage
    ? requestedItems
    : await prisma.needAudit.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: adminNeedAuditInclude
      });

  return { items, page, pageSize, total, totalPages };
}

export async function findRecentPublicDonations(limit = 8) {
  return prisma.donation.findMany({
    where: {
      publicConsent: true,
      status: { in: ["PAID", "PLEDGED"] }
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: donationInclude
  });
}

export async function getDonationStats() {
  const [paid, paidCount, pledged, activeNeedsCount] = await Promise.all([
    prisma.donation.aggregate({
      _sum: { amountCents: true },
      where: { status: "PAID" }
    }),
    prisma.donation.count({
      where: { status: "PAID" }
    }),
    prisma.donation.count({
      where: { status: "PLEDGED" }
    }),
    prisma.need.count({
      where: {
        status: { in: ["ACTIVE", "FUNDED"] },
        publishedAt: { not: null }
      }
    })
  ]);

  return {
    paidCents: paid._sum.amountCents ?? 0,
    paidCount,
    activeNeedsCount,
    pledgedCount: pledged
  };
}

function getPublicNeedStatuses(status?: "active" | "closed" | "all"): NeedStatus[] {
  if (status === "closed") {
    return ["FULFILLED"];
  }

  if (status === "all") {
    return ["ACTIVE", "FUNDED", "FULFILLED"];
  }

  return ["ACTIVE", "FUNDED"];
}

const publicNeedOrderBy = [
  { isUrgent: "desc" },
  { priority: "desc" },
  { publishedAt: "desc" },
  { createdAt: "desc" }
] satisfies Prisma.NeedOrderByWithRelationInput[];

const publicNeedInclude = {
  animal: {
    select: {
      id: true,
      ageMonths: true,
      ageText: true,
      description: true,
      name: true,
      photos: {
        orderBy: [{ isCover: "desc" }, { position: "asc" }],
        take: 1,
        select: {
          alt: true,
          url: true
        }
      },
      sex: true,
      size: true,
      slug: true,
      species: true
    }
  },
  photos: {
    orderBy: [{ isCover: "desc" }, { position: "asc" }]
  },
  audits: {
    orderBy: { publishedAt: "desc" },
    take: 1,
    include: {
      photos: {
        orderBy: [{ isCover: "desc" }, { position: "asc" }]
      }
    }
  },
  _count: {
    select: { donations: true }
  }
} satisfies Prisma.NeedInclude;

const adminNeedInclude = {
  animal: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  },
  statusChangedBy: {
    select: {
      email: true,
      id: true,
      name: true
    }
  },
  createdBy: {
    select: {
      email: true,
      id: true,
      name: true
    }
  },
  updatedBy: {
    select: {
      email: true,
      id: true,
      name: true
    }
  },
  photos: {
    orderBy: [{ isCover: "desc" }, { position: "asc" }]
  },
  donations: {
    orderBy: { createdAt: "desc" },
    take: 5
  },
  audits: {
    orderBy: { publishedAt: "desc" },
    take: 1,
    include: {
      photos: {
        orderBy: [{ isCover: "desc" }, { position: "asc" }]
      }
    }
  },
  _count: {
    select: { audits: true, donations: true, photos: true }
  }
} satisfies Prisma.NeedInclude;

const donationInclude = {
  animal: {
    select: {
      id: true,
      name: true,
      slug: true
    }
  },
  need: {
    select: {
      id: true,
      slug: true,
      title: true
    }
  },
  payments: {
    orderBy: { createdAt: "desc" },
    take: 1,
    select: {
      provider: true,
      providerPaymentId: true,
      publicId: true,
      status: true
    }
  }
} satisfies Prisma.DonationInclude;

const paymentInclude = {
  donation: {
    include: donationInclude
  }
} satisfies Prisma.DonationPaymentInclude;

const adminNeedAuditInclude = {
  createdBy: {
    select: {
      email: true,
      id: true,
      name: true
    }
  },
  need: {
    select: {
      id: true,
      scope: true,
      slug: true,
      status: true,
      title: true,
      animal: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  },
  photos: {
    orderBy: [{ isCover: "desc" }, { position: "asc" }]
  },
  _count: {
    select: { photos: true }
  }
} satisfies Prisma.NeedAuditInclude;
