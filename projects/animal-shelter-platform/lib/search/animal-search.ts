import type { Animal, AnimalSize, Prisma, Sex, Species } from "@prisma/client";
import type { AnimalFormInput } from "@/lib/validation/animal.schema";

type AnimalSearchCriteria = {
  coats: string[];
  colors: string[];
  remainingTokens: string[];
  sexes: string[];
  sizes: string[];
  species: string[];
  sterilized?: boolean;
  vaccinated?: boolean;
};

const speciesTerms = {
  CAT: ["кошка", "кошки", "кошечка", "кот", "котик", "котёнок", "котенок", "cat", "cats"],
  DOG: ["собака", "собаки", "собачка", "пёс", "пес", "щенок", "dog", "dogs"],
  OTHER: ["другое", "другие", "other"]
};

const sexTerms = {
  FEMALE: ["девочка", "девушка", "самка", "сучка", "female", "girl"],
  MALE: ["мальчик", "самец", "кобель", "кот", "пёс", "пес", "male", "boy"],
  UNKNOWN: ["пол неизвестен", "неизвестный пол"]
};

const sizeTerms: Partial<Record<AnimalSize, string[]>> = {
  LARGE: ["большой", "большая", "крупный", "крупная", "large"],
  MEDIUM: ["средний", "средняя", "medium"],
  SMALL: ["маленький", "маленькая", "небольшой", "небольшая", "small"]
};

const coatTerms: Record<string, string[]> = {
  "curling": ["кудрявая", "кудрявый", "curling", "curly"],
  "long-haired": ["длинная шерсть", "длинношерстный", "длинношёрстный", "long-haired"],
  "medium-length": ["средняя шерсть", "medium-length"],
  "short-haired": ["короткая шерсть", "короткошерстный", "короткошёрстный", "short-haired"]
};

const colorTerms: Record<string, string[]> = {
  bicolor: ["двухцветный", "двухцветная", "bicolor"],
  black: ["черный", "чёрный", "черная", "чёрная", "black"],
  brown: ["коричневый", "коричневая", "brown"],
  cream: ["кремовый", "кремовая", "cream"],
  gray: ["серый", "серая", "gray", "grey"],
  redhead: ["рыжий", "рыжая", "redhead"],
  tricolor: ["трехцветный", "трёхцветный", "трехцветная", "трёхцветная", "tricolor"],
  white: ["белый", "белая", "white"]
};

const booleanTerms = {
  sterilized: ["стерилизован", "стерилизована", "стерилизованная", "стерилизованные", "стерильный", "стерильная", "sterilized"],
  vaccinated: ["вакцинирован", "вакцинирована", "вакцинированная", "вакцинированные", "привит", "привита", "привитая", "привитые", "vaccinated"]
};

export const defaultAnimalSearchSuggestions = [
  "собака",
  "кошка",
  "маленькая собака",
  "вакцинированная собака",
  "стерилизованная кошка",
  "девочка 2 года",
  "короткая шерсть",
  "маленькая девочка"
];

export function buildAnimalSearchText(input: AnimalFormInput, slug: string) {
  return normalizeSearchText([
    input.name,
    slug,
    input.species,
    ...speciesTerms[input.species],
    input.sex,
    ...sexTerms[input.sex],
    input.size,
    ...(input.size ? sizeTerms[input.size] ?? [] : []),
    input.coat,
    ...(input.coat ? coatTerms[input.coat] ?? [] : []),
    input.color,
    ...(input.color ? colorTerms[input.color] ?? [] : []),
    input.breed,
    input.ageText,
    input.ageMonths ? `${input.ageMonths} месяцев` : null,
    input.sterilized ? booleanTerms.sterilized.join(" ") : null,
    input.vaccinated ? booleanTerms.vaccinated.join(" ") : null,
    input.goodWithChildren ? "можно с детьми семья дети" : null,
    input.goodWithElderly ? "можно пожилым людям пожилые" : null,
    input.goodWithAnimals ? "можно с другими животными" : null,
    input.apartmentFriendly ? "подходит для квартиры квартира" : null,
    input.needsExperiencedOwner ? "нужен опытный владелец" : null,
    input.needsSpecialCare ? "нужен особый уход" : null,
    input.healthStatus,
    input.description,
    input.story,
    input.cardNumber,
    input.aviaryNumber
  ]);
}

export function buildAnimalSearchTextFromAnimal(animal: Animal) {
  return normalizeSearchText([
    animal.name,
    animal.slug,
    animal.species,
    ...speciesTerms[animal.species],
    animal.sex,
    ...sexTerms[animal.sex],
    animal.size,
    ...(animal.size ? sizeTerms[animal.size] ?? [] : []),
    animal.coat,
    ...(animal.coat ? coatTerms[animal.coat] ?? [] : []),
    animal.color,
    ...(animal.color ? colorTerms[animal.color] ?? [] : []),
    animal.breed,
    animal.ageText,
    animal.ageMonths ? `${animal.ageMonths} месяцев` : null,
    animal.sterilized ? booleanTerms.sterilized.join(" ") : null,
    animal.vaccinated ? booleanTerms.vaccinated.join(" ") : null,
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

export function buildAnimalSearchWhere(query?: string) {
  const criteria = parseAnimalSearchQuery(query);
  const where: Prisma.AnimalWhereInput = {};

  if (criteria.species.length) {
    where.species = { in: criteria.species as Species[] };
  }

  if (criteria.sexes.length) {
    where.sex = { in: criteria.sexes as Sex[] };
  }

  if (criteria.sizes.length) {
    where.size = { in: criteria.sizes as AnimalSize[] };
  }

  if (criteria.coats.length) {
    where.coat = { in: criteria.coats };
  }

  if (criteria.colors.length) {
    where.color = { in: criteria.colors };
  }

  if (criteria.sterilized) {
    where.sterilized = true;
  }

  if (criteria.vaccinated) {
    where.vaccinated = true;
  }

  if (criteria.remainingTokens.length) {
    where.AND = criteria.remainingTokens.map((token) => ({
      OR: [
        { searchText: { contains: token } },
        { name: { contains: token } },
        { breed: { contains: token } },
        { color: { contains: token } },
        { description: { contains: token } },
        { story: { contains: token } }
      ]
    }));
  }

  return where;
}

export function getAnimalSearchSuggestions(query?: string) {
  const normalizedQuery = normalizeToken(query ?? "");
  const suggestions = normalizedQuery
    ? defaultAnimalSearchSuggestions.filter((item) => normalizeToken(item).includes(normalizedQuery))
    : defaultAnimalSearchSuggestions;

  return suggestions.slice(0, 8);
}

function parseAnimalSearchQuery(query?: string): AnimalSearchCriteria {
  const normalizedQuery = normalizeSearchText([query]);
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const usedTokens = new Set<string>();
  const coats = collectMatches(tokens, coatTerms, usedTokens);
  const colors = collectMatches(tokens, colorTerms, usedTokens);
  const sexes = collectMatches(tokens, sexTerms, usedTokens);
  const sizes = collectMatches(tokens, sizeTerms, usedTokens);
  const species = collectMatches(tokens, speciesTerms, usedTokens);
  const sterilized = hasAnyTerm(tokens, booleanTerms.sterilized, usedTokens);
  const vaccinated = hasAnyTerm(tokens, booleanTerms.vaccinated, usedTokens);

  return {
    coats,
    colors,
    remainingTokens: tokens.filter((token) => !usedTokens.has(token)),
    sexes,
    sizes,
    species,
    sterilized,
    vaccinated
  };
}

function collectMatches<T extends string>(
  tokens: string[],
  dictionary: Partial<Record<T, string[]>>,
  usedTokens: Set<string>
) {
  const matches: T[] = [];

  for (const [key, terms] of Object.entries(dictionary) as Array<[T, string[] | undefined]>) {
    if (!terms) {
      continue;
    }

    if (hasAnyTerm(tokens, terms, usedTokens)) {
      matches.push(key);
    }
  }

  return matches;
}

function hasAnyTerm(tokens: string[], terms: string[], usedTokens: Set<string>) {
  let matched = false;

  for (const term of terms) {
    const termTokens = normalizeSearchText([term]).split(" ").filter(Boolean);
    const termMatched = termTokens.every((termToken) => tokens.includes(termToken));

    if (termMatched) {
      matched = true;
      termTokens.forEach((termToken) => usedTokens.add(termToken));
    }
  }

  return matched;
}

function normalizeSearchText(values: Array<string | number | null | undefined>) {
  return values
    .filter((value): value is string | number => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/ё/g, "е").trim();
}
