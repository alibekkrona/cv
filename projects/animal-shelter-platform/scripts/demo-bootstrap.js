const bcrypt = require("bcryptjs");
const { execFileSync } = require("node:child_process");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  if ((await prisma.animal.count()) === 0) {
    execFileSync("node", ["prisma/seed.js"], { stdio: "inherit" });
  }

  const [admin, staff] = await Promise.all([
    upsertUser("admin@demo.local", "DemoAdmin123!", "Demo Administrator", "SUPER_ADMIN"),
    upsertUser("staff@demo.local", "DemoStaff123!", "Demo Staff", "STAFF")
  ]);

  const region = await prisma.region.upsert({
    where: { slug: "demo-region" },
    update: { name: "Demo Region" },
    create: { countryCode: "UA", name: "Demo Region", slug: "demo-region" }
  });

  const city = await prisma.settlement.upsert({
    where: { slug: "demo-city" },
    update: { isActive: true, name: "Demo City", regionId: region.id },
    create: {
      isActive: true,
      name: "Demo City",
      regionId: region.id,
      slug: "demo-city",
      sortOrder: 1
    }
  });

  await ensureSettings();
  await ensureHours();

  const animals = await prisma.animal.findMany({
    orderBy: { id: "asc" },
    take: 4
  });

  const urgentNeed = await upsertNeed({
    description: "A limited demonstration of a transparent shelter fundraising workflow.",
    isUrgent: true,
    priority: 20,
    raisedCents: 460000,
    slug: "demo-shelter-food",
    status: "ACTIVE",
    targetCents: 1200000,
    title: "Monthly food supply"
  });

  const fulfilledNeed = await upsertNeed({
    description: "A completed demonstration need with an auditable result.",
    isUrgent: false,
    priority: 10,
    raisedCents: 650000,
    slug: "demo-aviary-repair",
    status: "FULFILLED",
    targetCents: 650000,
    title: "Aviary repair materials"
  });

  if ((await prisma.donation.count({ where: { adminNote: "public-demo" } })) === 0) {
    await prisma.donation.createMany({
      data: [
        {
          adminNote: "public-demo",
          amountCents: 280000,
          donorName: "Anonymous",
          isAnonymous: true,
          method: "CARD",
          needId: urgentNeed.id,
          publicConsent: true,
          status: "PAID",
          target: "NEED"
        },
        {
          adminNote: "public-demo",
          amountCents: 180000,
          donorName: "Demo Supporter",
          method: "INVOICE",
          needId: urgentNeed.id,
          publicConsent: true,
          status: "PAID",
          target: "NEED"
        },
        {
          adminNote: "public-demo",
          amountCents: 650000,
          donorName: "Community Fund",
          method: "INVOICE",
          needId: fulfilledNeed.id,
          publicConsent: true,
          status: "PAID",
          target: "NEED"
        }
      ]
    });
  }

  await prisma.lostFoundReport.upsert({
    where: { slug: "demo-lost-cat-luna" },
    update: {
      city: city.name,
      cityId: city.id,
      publishedAt: new Date(),
      status: "PUBLISHED"
    },
    create: {
      city: city.name,
      cityId: city.id,
      contactEmail: "contact@demo.local",
      contactName: "Demo Contact",
      contactPhone: "+380 00 000 00 00",
      description: "Synthetic lost-and-found record created for the public portfolio demonstration.",
      district: "Central District",
      eventDate: new Date(),
      locationText: "Near the central park",
      photos: {
        create: {
          alt: "Demo lost cat",
          isCover: true,
          url: "/images/demo/lost-cat.jpg"
        }
      },
      publishedAt: new Date(),
      sex: "FEMALE",
      size: "SMALL",
      slug: "demo-lost-cat-luna",
      species: "CAT",
      status: "PUBLISHED",
      title: "Lost cat Luna",
      type: "LOST"
    }
  });

  if (
    animals.length > 0 &&
    (await prisma.adoptionApplication.count({
      where: { email: { endsWith: "@demo.local" } }
    })) === 0
  ) {
    const statuses = ["NEW", "CONTACTED", "APPROVED"];

    for (let index = 0; index < Math.min(animals.length, statuses.length); index += 1) {
      const application = await prisma.adoptionApplication.create({
        data: {
          animalId: animals[index].id,
          applicantName: `Demo Applicant ${index + 1}`,
          city: city.name,
          cityId: city.id,
          email: `applicant${index + 1}@demo.local`,
          hasAnimals: index % 2 === 0,
          hasChildren: index % 2 === 1,
          housingType: index % 2 === 0 ? "Apartment" : "House",
          message: "Synthetic application used to demonstrate the operational workflow.",
          phone: `+3800000000${index + 1}`,
          status: statuses[index],
          type: "ADOPTION"
        }
      });

      await prisma.adoptionApplicationStatusEvent.create({
        data: {
          actorUserId: index === 0 ? staff.id : admin.id,
          applicationId: application.id,
          note: "Public demo workflow event",
          toStatus: statuses[index]
        }
      });
    }
  }

  console.log("Public demonstration data is ready.");
}

async function upsertUser(email, password, name, role) {
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.upsert({
    where: { email },
    update: { isActive: true, name, passwordHash, role },
    create: { email, isActive: true, name, passwordHash, role }
  });
}

async function ensureSettings() {
  const contacts = await prisma.contactSettings.findFirst();

  if (contacts) {
    await prisma.contactSettings.update({
      where: { id: contacts.id },
      data: {
        address: "Demo City, Portfolio Street 1",
        email: "contact@demo.local",
        officialSiteUrl: "http://localhost:3100",
        phone: "+380 00 000 00 00",
        schedule: "Daily, 09:00-18:00"
      }
    });
  } else {
    await prisma.contactSettings.create({
      data: {
        address: "Demo City, Portfolio Street 1",
        email: "contact@demo.local",
        officialSiteUrl: "http://localhost:3100",
        phone: "+380 00 000 00 00",
        schedule: "Daily, 09:00-18:00"
      }
    });
  }

  const donationSettings = await prisma.donationSettings.findFirst();

  if (donationSettings) {
    await prisma.donationSettings.update({
      where: { id: donationSettings.id },
      data: { publicDonationsEnabled: false }
    });
  } else {
    await prisma.donationSettings.create({
      data: { publicDonationsEnabled: false }
    });
  }

  if ((await prisma.designSettings.count()) === 0) {
    await prisma.designSettings.create({ data: { activeTheme: "youtube" } });
  }
}

async function ensureHours() {
  if ((await prisma.shelterVisitHour.count()) === 0) {
    await prisma.shelterVisitHour.createMany({
      data: [
        { closesAt: "18:00", dayOfWeek: 1, opensAt: "09:00" },
        { closesAt: "18:00", dayOfWeek: 3, opensAt: "09:00" },
        { closesAt: "16:00", dayOfWeek: 6, opensAt: "10:00" }
      ]
    });
  }

  if ((await prisma.shelterWalkingHour.count()) === 0) {
    await prisma.shelterWalkingHour.createMany({
      data: [
        { closesAt: "12:00", dayOfWeek: 2, opensAt: "10:00" },
        { closesAt: "15:00", dayOfWeek: 6, opensAt: "11:00" }
      ]
    });
  }
}

async function upsertNeed(data) {
  return prisma.need.upsert({
    where: { slug: data.slug },
    update: {
      ...data,
      publishedAt: new Date(),
      photos: {
        deleteMany: {},
        create: {
          alt: data.title,
          isCover: true,
          url: "/images/demo/shelter-need.jpg"
        }
      }
    },
    create: {
      ...data,
      publishedAt: new Date(),
      photos: {
        create: {
          alt: data.title,
          isCover: true,
          url: "/images/demo/shelter-need.jpg"
        }
      }
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
