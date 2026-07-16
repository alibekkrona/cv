const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const tags = [
  { slug: "calm", name: "Calm", type: "CHARACTER" },
  { slug: "gentle", name: "Gentle", type: "CHARACTER" },
  { slug: "active", name: "Active", type: "CHARACTER" },
  { slug: "curious", name: "Curious", type: "CHARACTER" },
  { slug: "good-with-children", name: "Good with children", type: "COMPATIBILITY" },
  { slug: "apartment-friendly", name: "Apartment friendly", type: "COMPATIBILITY" },
  { slug: "needs-patient-family", name: "Needs patient family", type: "CARE" },
  { slug: "needs-active-family", name: "Needs active family", type: "CARE" },
  { slug: "needs-experienced-owner", name: "Needs experienced owner", type: "CARE" }
];

const animals = [
  {
    slug: "murka-tabby-cat",
    name: "Murka",
    species: "CAT",
    sex: "FEMALE",
    ageMonths: 28,
    size: "SMALL",
    color: "Tabby",
    sterilized: true,
    vaccinated: true,
    status: "AVAILABLE",
    description: "A careful tabby cat who watches first and comes closer when she feels safe.",
    story: "Murka will suit a calm home where trust can grow without pressure.",
    goodWithElderly: true,
    apartmentFriendly: true,
    tagSlugs: ["calm", "gentle", "apartment-friendly", "needs-patient-family"],
    photos: [{ url: "/images/animals/murka.jpg", alt: "Tabby cat sitting in a soft bed" }]
  },
  {
    slug: "graf-shepherd-dog",
    name: "Graf",
    species: "DOG",
    sex: "MALE",
    ageMonths: 54,
    size: "LARGE",
    color: "Black and tan",
    sterilized: false,
    vaccinated: true,
    status: "AVAILABLE",
    description: "A large shepherd-type dog with a steady look and confident presence.",
    story: "Graf needs a person who understands strong dogs and enjoys structured walks.",
    needsExperiencedOwner: true,
    tagSlugs: ["active", "needs-experienced-owner"],
    photos: [{ url: "/images/animals/graf.jpg", alt: "Large shepherd dog standing outside" }]
  },
  {
    slug: "sandy-young-dog",
    name: "Sandy",
    species: "DOG",
    sex: "FEMALE",
    ageMonths: 14,
    size: "MEDIUM",
    color: "Sand",
    sterilized: false,
    vaccinated: true,
    status: "AVAILABLE",
    description: "A young sandy dog with soft eyes, bright attention, and a lot to learn.",
    story: "Sandy is still growing into herself and will blossom with patient guidance.",
    goodWithChildren: true,
    needsExperiencedOwner: false,
    tagSlugs: ["curious", "gentle", "needs-active-family"],
    photos: [
      { url: "/images/animals/sandy-1.jpg", alt: "Young sandy dog sitting on grass" },
      { url: "/images/animals/sandy-2.jpg", alt: "Portrait of a young sandy dog" }
    ]
  },
  {
    slug: "tim-small-terrier",
    name: "Tim",
    species: "DOG",
    sex: "MALE",
    ageMonths: 16,
    size: "SMALL",
    color: "Black and tan",
    sterilized: false,
    vaccinated: true,
    status: "AVAILABLE",
    description: "A small terrier-type dog with an attentive face and lively energy.",
    story: "Tim is compact, expressive, and ready for a person who likes spirited little dogs.",
    apartmentFriendly: true,
    tagSlugs: ["active", "curious", "apartment-friendly"],
    photos: [{ url: "/images/animals/tim.jpg", alt: "Small black and tan terrier sitting indoors" }]
  },
  {
    slug: "pixel-small-dog",
    name: "Pixel",
    species: "DOG",
    sex: "MALE",
    ageMonths: 24,
    size: "SMALL",
    color: "Black and white",
    sterilized: true,
    vaccinated: true,
    status: "AVAILABLE",
    description: "A small bright dog who looks straight at people and likes attention.",
    story: "Pixel can be a cheerful companion for a home that wants a little shadow nearby.",
    apartmentFriendly: true,
    goodWithElderly: true,
    tagSlugs: ["curious", "apartment-friendly"],
    photos: [{ url: "/images/animals/pixel.jpg", alt: "Small black and white dog on grass" }]
  },
  {
    slug: "noir-black-dog",
    name: "Noir",
    species: "DOG",
    sex: "MALE",
    ageMonths: 30,
    size: "MEDIUM",
    color: "Black",
    sterilized: true,
    vaccinated: true,
    status: "AVAILABLE",
    description: "A black medium-sized dog with a calm face and a red bandana.",
    story: "Noir is observant and people-oriented, best suited to steady daily contact.",
    tagSlugs: ["calm", "gentle", "needs-active-family"],
    photos: [{ url: "/images/animals/noir.jpg", alt: "Black dog wearing a red bandana" }]
  },
  {
    slug: "rada-brown-dog",
    name: "Rada",
    species: "DOG",
    sex: "FEMALE",
    ageMonths: 42,
    size: "MEDIUM",
    color: "Brown and black",
    sterilized: true,
    vaccinated: true,
    status: "AVAILABLE",
    description: "A medium dog with upright ears, thoughtful eyes, and a grounded character.",
    story: "Rada will appreciate a home that gives her clear rules and warm attention.",
    needsExperiencedOwner: true,
    tagSlugs: ["calm", "needs-experienced-owner"],
    photos: [{ url: "/images/animals/rada.jpg", alt: "Brown and black dog standing on grass" }]
  },
  {
    slug: "bella-cream-dog",
    name: "Bella",
    species: "DOG",
    sex: "FEMALE",
    ageMonths: 36,
    size: "MEDIUM",
    color: "Cream",
    sterilized: true,
    vaccinated: true,
    status: "AVAILABLE",
    description: "A cream-colored dog with a serious, tender expression.",
    story: "Bella needs a safe routine and someone who will notice her quiet signals.",
    goodWithElderly: true,
    tagSlugs: ["calm", "gentle", "needs-patient-family"],
    photos: [{ url: "/images/animals/bella.jpg", alt: "Cream-colored dog standing in grass" }]
  }
];

async function main() {
  await prisma.adoptionApplication.deleteMany();
  await prisma.animalCommentReport.deleteMany();
  await prisma.animalComment.deleteMany();
  await prisma.animalView.deleteMany();
  await prisma.animalLike.deleteMany();
  await prisma.animalTag.deleteMany();
  await prisma.animalPhoto.deleteMany();
  await prisma.animal.deleteMany();
  await prisma.tag.deleteMany();

  const tagMap = new Map();

  for (const tag of tags) {
    const savedTag = await prisma.tag.create({ data: tag });
    tagMap.set(tag.slug, savedTag.id);
  }

  for (const animal of animals) {
    const { tagSlugs, photos, ...animalData } = animal;

    const savedAnimal = await prisma.animal.create({
      data: {
        ...animalData,
        publishedAt: new Date(),
        photos: {
          create: photos.map((photo, index) => ({
            ...photo,
            position: index,
            isCover: index === 0
          }))
        }
      }
    });

    await prisma.animalTag.createMany({
      data: tagSlugs.map((slug) => ({
        animalId: savedAnimal.id,
        tagId: tagMap.get(slug)
      }))
    });
  }

  const existingContacts = await prisma.contactSettings.findFirst();

  if (!existingContacts) {
    await prisma.contactSettings.create({
      data: {
        phone: "+380 XX XXX XX XX",
        email: "shelter@example.org",
        address: "Address not configured",
        schedule: "Daily, 09:00-18:00",
        officialSiteUrl: "https://example.org"
      }
    });
  }

  console.log(`Seeded ${animals.length} animals, ${tags.length} tags, and ${animals.reduce((sum, animal) => sum + animal.photos.length, 0)} photos.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
