const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const speciesTerms = {
  CAT: ["кошка", "кошки", "кошечка", "кот", "котик", "котенок", "cat", "cats"],
  DOG: ["собака", "собаки", "собачка", "пес", "щенок", "dog", "dogs"],
  OTHER: ["другое", "другие", "other"]
};

const sexTerms = {
  FEMALE: ["девочка", "самка", "сучка", "female", "girl"],
  MALE: ["мальчик", "самец", "кобель", "кот", "пес", "male", "boy"],
  UNKNOWN: ["пол неизвестен", "неизвестный пол"]
};

const sizeTerms = {
  LARGE: ["большой", "большая", "крупный", "крупная", "large"],
  MEDIUM: ["средний", "средняя", "medium"],
  SMALL: ["маленький", "маленькая", "небольшой", "небольшая", "small"]
};

const coatTerms = {
  "curling": ["кудрявая", "кудрявый", "curling", "curly"],
  "long-haired": ["длинная шерсть", "длинношерстный", "long-haired"],
  "medium-length": ["средняя шерсть", "medium-length"],
  "short-haired": ["короткая шерсть", "короткошерстный", "short-haired"]
};

const colorTerms = {
  bicolor: ["двухцветный", "двухцветная", "bicolor"],
  black: ["черный", "черная", "black"],
  brown: ["коричневый", "коричневая", "brown"],
  cream: ["кремовый", "кремовая", "cream"],
  gray: ["серый", "серая", "gray", "grey"],
  redhead: ["рыжий", "рыжая", "redhead"],
  tricolor: ["трехцветный", "трехцветная", "tricolor"],
  white: ["белый", "белая", "white"]
};

async function main() {
  const animals = await prisma.animal.findMany();

  for (const animal of animals) {
    await prisma.animal.update({
      where: { id: animal.id },
      data: { searchText: buildSearchText(animal) }
    });
  }

  console.log(`Rebuilt search index for ${animals.length} animals.`);
}

function buildSearchText(animal) {
  return normalize([
    animal.name,
    animal.slug,
    animal.species,
    ...(speciesTerms[animal.species] ?? []),
    animal.sex,
    ...(sexTerms[animal.sex] ?? []),
    animal.size,
    ...(animal.size ? sizeTerms[animal.size] ?? [] : []),
    animal.coat,
    ...(animal.coat ? coatTerms[animal.coat] ?? [] : []),
    animal.color,
    ...(animal.color ? colorTerms[animal.color] ?? [] : []),
    animal.breed,
    animal.ageText,
    animal.ageMonths ? `${animal.ageMonths} месяцев` : null,
    animal.sterilized ? "стерилизован стерилизована стерилизованная стерилизованные стерильный стерильная sterilized" : null,
    animal.vaccinated ? "вакцинирован вакцинирована вакцинированная вакцинированные привит привита привитая привитые vaccinated" : null,
    animal.goodWithChildren ? "можно с детьми семья дети" : null,
    animal.goodWithElderly ? "можно пожилым людям пожилые" : null,
    animal.goodWithAnimals ? "можно с другими животными" : null,
    animal.apartmentFriendly ? "подходит для квартиры квартира" : null,
    animal.needsExperiencedOwner ? "нужен опытный владелец" : null,
    animal.needsSpecialCare ? "нужен особый уход" : null,
    animal.healthStatus,
    animal.description,
    animal.story,
    animal.cardNumber,
    animal.aviaryNumber
  ]);
}

function normalize(values) {
  return values
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

main().finally(() => prisma.$disconnect());
