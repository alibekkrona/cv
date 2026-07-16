/* eslint-disable no-console */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const ROOT = path.resolve(__dirname, "..");
const SQL_PATH = path.join(ROOT, "docs/_incoming/old-site-data/localhost (1).sql");
const ZIP_PATHS = ["2026.zip", "2025.zip", "2024.zip", "2023.zip", "2022.zip", "2020-03.zip"]
  .map((filename) => path.join(ROOT, "docs/_incoming/old-site-data", filename))
  .filter((zipPath) => fs.existsSync(zipPath));
const UPLOAD_ROOT = path.join(ROOT, "public/uploads/animals");
const REPORT_DIR = path.join(ROOT, "docs/_incoming/migration-reports");

const ADOPTION_TERMS = new Set([17, 19, 21]);
const LOST_FOUND_TERMS = new Set([25, 27, 29, 31, 33, 35]);
const RESERVED_TERMS = new Set([37, 39, 41, 49, 51, 53]);
const TREATMENT_TERMS = new Set([43, 45, 47]);

const mode = process.argv.includes("--apply") ? "apply" : "dry-run";
const operation = process.argv.includes("--sync-photos") ? "sync-photos" : "import-animals";

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

async function main() {
  const parsed = parseWordPressDump(SQL_PATH);
  const zipIndex = buildZipIndex(ZIP_PATHS);
  const existingAnimals = await prisma.animal.findMany({
    where: { cardNumber: { not: null } },
    select: {
      id: true,
      slug: true,
      cardNumber: true,
      photos: {
        orderBy: { position: "asc" },
        select: {
          url: true,
          position: true
        }
      }
    }
  });
  const existingByCardNumber = new Map(existingAnimals.map((animal) => [animal.cardNumber, animal]));
  const existingSlugs = new Set((await prisma.animal.findMany({ select: { slug: true } })).map((animal) => animal.slug));
  const existingCardNumbers = new Set(
    (await prisma.animal.findMany({
      where: { cardNumber: { not: null } },
      select: { cardNumber: true }
    }))
      .map((animal) => animal.cardNumber)
      .filter(Boolean)
  );

  const activePostIds = findActivePostIds(parsed);
  const candidates = activePostIds
    .map((postId) => buildAnimalCandidate(postId, parsed, zipIndex, existingSlugs, existingByCardNumber))
    .filter(Boolean);

  if (operation === "sync-photos") {
    await syncExistingAnimalPhotos(candidates, existingByCardNumber, zipIndex);
    return;
  }

  const skippedAsExisting = candidates.filter((candidate) => candidate.cardNumber && existingCardNumbers.has(candidate.cardNumber));
  const toImport = candidates.filter((candidate) => !candidate.cardNumber || !existingCardNumbers.has(candidate.cardNumber));
  const extractionManifest = toImport.flatMap((candidate) => candidate.photos.map((photo) => ({
    zipPath: photo.zipPath,
    internalPath: photo.internalPath,
    outputPath: photo.outputPath
  })));

  const report = {
    mode,
    operation,
    generatedAt: new Date().toISOString(),
    archives: ZIP_PATHS.map((zipPath) => path.basename(zipPath)),
    totals: {
      publishPosts: Object.values(parsed.posts).filter((post) => post.status === "publish").length,
      activeCandidates: candidates.length,
      skippedAsExisting: skippedAsExisting.length,
      willImport: toImport.length,
      archiveExcluded: countArchivePosts(parsed),
      lostFoundPosts: countLostFoundPosts(parsed),
      photosFoundInZip: candidates.reduce((sum, item) => sum + item.photos.length, 0),
      photosMissingFromZip: candidates.reduce((sum, item) => sum + item.missingPhotos.length, 0)
    },
    distributions: buildDistributions(candidates),
    missingPhotoSamples: candidates
      .flatMap((candidate) => candidate.missingPhotos.map((photo) => ({
        animal: candidate.name,
        cardNumber: candidate.cardNumber,
        guid: photo.guid,
        expectedPath: photo.expectedPath
      })))
      .slice(0, 40),
    sampleAnimals: candidates.slice(0, 20).map((candidate) => ({
      name: candidate.name,
      species: candidate.species,
      sex: candidate.sex,
      sterilized: candidate.sterilized,
      ageText: candidate.ageText,
      size: candidate.size,
      status: candidate.status,
      cardNumber: candidate.cardNumber,
      aviaryNumber: candidate.aviaryNumber,
      photos: candidate.photos.length,
      missingPhotos: candidate.missingPhotos.length
    }))
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const reportPath = path.join(REPORT_DIR, `wp-animal-migration-${mode}-${timestamp()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  printReport(report, reportPath);

  if (mode !== "apply") {
    return;
  }

  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  extractPhotos(extractionManifest);

  let imported = 0;
  for (const candidate of toImport) {
    await prisma.animal.create({
      data: {
        slug: candidate.slug,
        name: candidate.name,
        species: candidate.species,
        sex: candidate.sex,
        sterilized: candidate.sterilized,
        ageMonths: candidate.ageMonths,
        ageText: candidate.ageText,
        size: candidate.size,
        breed: candidate.breed,
        color: candidate.color,
        coat: candidate.coat,
        cardNumber: candidate.cardNumber,
        aviaryNumber: candidate.aviaryNumber,
        arrivalDate: candidate.arrivalDate,
        statusDate: candidate.statusDate,
        videoUrl: candidate.videoUrl,
        status: candidate.status,
        publishedAt: candidate.publishedAt,
        description: candidate.description,
        photos: {
          create: candidate.photos.map((photo, index) => ({
            url: photo.publicUrl,
            alt: `${candidate.name} photo${index ? ` ${index + 1}` : ""}`,
            isCover: index === 0,
            position: index
          }))
        }
      }
    });
    imported += 1;
  }

  console.log(`Imported ${imported} animals.`);
}

function parseWordPressDump(sqlPath) {
  const terms = {};
  const taxonomy = {};
  const archiveTerms = new Set();
  const postTerms = new Map();
  const posts = {};
  const attachments = {};
  const meta = {};

  for (const row of readInsertRows(sqlPath, "ac_terms")) {
    terms[number(row[0])] = { name: row[1], slug: row[2] };
  }

  for (const row of readInsertRows(sqlPath, "ac_term_taxonomy")) {
    taxonomy[number(row[0])] = {
      termId: number(row[1]),
      taxonomy: row[2],
      count: number(row[5])
    };
  }

  for (const row of readInsertRows(sqlPath, "ac_termmeta")) {
    if (row[2] === "archive_cat_in_archive" && row[3] === "1") {
      archiveTerms.add(number(row[1]));
    }
  }

  for (const row of readInsertRows(sqlPath, "ac_term_relationships")) {
    const objectId = number(row[0]);
    const termTaxonomyId = number(row[1]);
    const item = taxonomy[termTaxonomyId];
    if (!item || item.taxonomy !== "category") {
      continue;
    }
    if (!postTerms.has(objectId)) {
      postTerms.set(objectId, new Set());
    }
    postTerms.get(objectId).add(item.termId);
  }

  for (const row of readInsertRows(sqlPath, "ac_posts")) {
    if (row.length < 23) {
      continue;
    }
    const post = {
      id: number(row[0]),
      date: row[2],
      content: row[4],
      title: row[5],
      status: row[7],
      slug: row[11],
      parentId: number(row[17]),
      guid: row[18],
      type: row[20],
      mime: row[21]
    };
    if (post.type === "post") {
      posts[post.id] = post;
    }
    if (post.type === "attachment" && post.mime.startsWith("image/")) {
      attachments[post.id] = post;
    }
  }

  for (const row of readInsertRows(sqlPath, "ac_postmeta")) {
    const postId = number(row[1]);
    if (!meta[postId]) {
      meta[postId] = {};
    }
    meta[postId][row[2]] = row[3];
  }

  return { terms, taxonomy, archiveTerms, postTerms, posts, attachments, meta };
}

function readInsertRows(sqlPath, table) {
  const rows = [];
  const prefix = `INSERT INTO \`${table}\``;
  const lines = fs.readFileSync(sqlPath, "utf8").split(/\r?\n/);
  let statement = "";

  for (const line of lines) {
    if (!statement && line.startsWith(prefix)) {
      statement = line;
    } else if (statement) {
      statement += `\n${line}`;
    }

    if (statement && line.trimEnd().endsWith(";")) {
      const valuesIndex = statement.indexOf(" VALUES");
      if (valuesIndex >= 0) {
        rows.push(...splitSqlTuples(statement.slice(valuesIndex + " VALUES".length).replace(/;$/, "")));
      }
      statement = "";
    }
  }

  return rows;
}

function splitSqlTuples(values) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuote = false;
  let escaping = false;
  let inRow = false;

  for (const char of values) {
    if (escaping) {
      value += unescapeSqlChar(char);
      escaping = false;
      continue;
    }
    if (inQuote && char === "\\") {
      escaping = true;
      continue;
    }
    if (char === "'") {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && char === "(") {
      inRow = true;
      row = [];
      value = "";
      continue;
    }
    if (!inQuote && char === ")" && inRow) {
      row.push(cleanSqlValue(value));
      rows.push(row);
      inRow = false;
      continue;
    }
    if (!inQuote && char === "," && inRow) {
      row.push(cleanSqlValue(value));
      value = "";
      continue;
    }
    if (inRow) {
      value += char;
    }
  }

  return rows;
}

function unescapeSqlChar(char) {
  switch (char) {
    case "n":
      return "\n";
    case "r":
      return "\r";
    case "t":
      return "\t";
    case "0":
      return "\0";
    default:
      return char;
  }
}

function cleanSqlValue(value) {
  const trimmed = value.trim();
  return trimmed === "NULL" ? null : trimmed;
}

function findActivePostIds(parsed) {
  return Object.values(parsed.posts)
    .filter((post) => post.status === "publish")
    .filter((post) => {
      const terms = parsed.postTerms.get(post.id) ?? new Set();
      return intersects(terms, ADOPTION_TERMS) && !intersects(terms, parsed.archiveTerms) && !intersects(terms, LOST_FOUND_TERMS);
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((post) => post.id);
}

function buildAnimalCandidate(postId, parsed, zipFiles, existingSlugs, existingByCardNumber = new Map()) {
  const post = parsed.posts[postId];
  const meta = parsed.meta[postId] ?? {};
  const name = firstText(meta.animal_nickname, post.title);
  const cardNumber = textOrNull(meta.animal_card_number);
  const existingAnimal = cardNumber ? existingByCardNumber.get(cardNumber) : null;
  const slug = existingAnimal?.slug ?? uniqueSlug(slugify(`${name}-${cardNumber || postId}`), existingSlugs);
  const gender = mapGender(meta.animal_gender);
  const terms = parsed.postTerms.get(postId) ?? new Set();
  const photos = resolvePhotos(post, meta, parsed.attachments, zipFiles, slug);

  return {
    slug,
    name,
    species: mapSpecies(meta.kind_animal),
    sex: gender.sex,
    sterilized: gender.sterilized,
    ageText: textOrNull(meta.animal_age),
    ageMonths: parseAgeMonths(meta.animal_age),
    size: mapSize(meta.animal_size),
    breed: textOrNull(meta.animal_breed),
    color: textOrNull(meta.animal_color),
    coat: textOrNull(meta.animal_wool),
    cardNumber,
    aviaryNumber: textOrNull(meta.animal_aviary_number),
    arrivalDate: parseDate(meta.animal_arrival_date),
    publishedAt: parseDate(meta.animal_publication_date) ?? parseDate(post.date) ?? new Date(),
    statusDate: parseDate(meta.animal_status_date),
    videoUrl: textOrNull(meta.animal_video_url),
    status: mapStatus(terms),
    description: textOrNull(post.content),
    photos: photos.found,
    missingPhotos: photos.missing
  };
}

function resolvePhotos(post, meta, attachments, zipFiles, slug) {
  const ids = [];
  if (meta._thumbnail_id) {
    ids.push(number(meta._thumbnail_id));
  }
  ids.push(...parseGalleryIds(meta.animal_photo_gallery));

  const childAttachmentIds = Object.values(attachments)
    .filter((attachment) => attachment.parentId === post.id)
    .sort((a, b) => a.id - b.id)
    .map((attachment) => attachment.id);

  ids.push(...childAttachmentIds);

  const seenIds = new Set();
  const seenPaths = new Set();
  const found = [];
  const missing = [];

  for (const id of ids) {
    if (!id || seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);
    const attachment = attachments[id];
    if (!attachment) {
      continue;
    }
    const expectedPath = wpUploadPathFromGuid(attachment.guid);
    if (!expectedPath || seenPaths.has(expectedPath)) {
      continue;
    }
    seenPaths.add(expectedPath);

    const zipEntry = findOriginalZipPath(expectedPath, zipFiles);
    if (!zipEntry) {
      missing.push({ id, guid: attachment.guid, expectedPath });
      continue;
    }

    const extension = path.extname(zipEntry.internalPath).toLowerCase() || ".jpg";
    const filename = `${slug}-${found.length + 1}-${shortHash(zipEntry.internalPath)}${extension}`;
    const outputPath = path.join(UPLOAD_ROOT, filename);
    found.push({
      zipPath: zipEntry.zipPath,
      internalPath: zipEntry.internalPath,
      outputPath,
      publicUrl: `/uploads/animals/${filename}`
    });
  }

  return { found, missing };
}

function parseGalleryIds(value) {
  if (!value) {
    return [];
  }
  return [...String(value).matchAll(/s:\d+:"(\d+)"/g)].map((match) => number(match[1])).filter(Boolean);
}

function wpUploadPathFromGuid(guid) {
  if (!guid) {
    return null;
  }
  const marker = "/wp-content/uploads/";
  const index = guid.indexOf(marker);
  if (index < 0) {
    return null;
  }
  return decodeURIComponent(guid.slice(index + marker.length));
}

function findOriginalZipPath(expectedPath, zipFiles) {
  if (!expectedPath || isWordPressResizedImage(expectedPath)) {
    return null;
  }
  const zipPath = zipFiles.files.get(expectedPath);
  if (zipPath) {
    return { zipPath, internalPath: expectedPath };
  }
  return null;
}

function isWordPressResizedImage(value) {
  return /-\d+x\d+\.(jpe?g|png|webp)$/i.test(value);
}

function listZipFiles(zipPath) {
  const output = execFileSync("python3", [
    "-c",
    [
      "import sys, zipfile",
      "with zipfile.ZipFile(sys.argv[1]) as z:",
      "    print('\\n'.join(z.namelist()))"
    ].join("\n"),
    zipPath
  ], { encoding: "utf8", maxBuffer: 1024 * 1024 * 20 });
  return new Set(output.split(/\r?\n/).filter(Boolean));
}

function buildZipIndex(zipPaths) {
  const files = new Map();
  for (const zipPath of zipPaths) {
    for (const filename of listZipFiles(zipPath)) {
      files.set(filename, zipPath);
    }
  }
  return { files, zipPaths };
}

function extractPhotos(manifest) {
  if (!manifest.length) {
    return;
  }

  const byZipPath = new Map();
  for (const item of manifest) {
    if (!byZipPath.has(item.zipPath)) {
      byZipPath.set(item.zipPath, []);
    }
    byZipPath.get(item.zipPath).push(item);
  }

  for (const [zipPath, files] of byZipPath.entries()) {
    const payload = JSON.stringify({ zipPath, files });

    execFileSync("python3", [
      "-c",
      [
        "import json, os, sys, zipfile",
        "payload=json.load(sys.stdin)",
        "with zipfile.ZipFile(payload['zipPath']) as z:",
        "    for item in payload['files']:",
        "        os.makedirs(os.path.dirname(item['outputPath']), exist_ok=True)",
        "        with z.open(item['internalPath']) as src, open(item['outputPath'], 'wb') as dst:",
        "            dst.write(src.read())"
      ].join("\n")
    ], { input: payload, encoding: "utf8", maxBuffer: 1024 * 1024 * 20 });
  }
}

async function syncExistingAnimalPhotos(candidates, existingByCardNumber) {
  const syncItems = [];
  const missing = [];

  for (const candidate of candidates) {
    const animal = candidate.cardNumber ? existingByCardNumber.get(candidate.cardNumber) : null;
    if (!animal) {
      continue;
    }

    const existingUrls = new Set(animal.photos.map((photo) => photo.url));
    const newPhotos = candidate.photos.filter((photo) => !existingUrls.has(photo.publicUrl));

    if (newPhotos.length) {
      syncItems.push({ animal, candidate, newPhotos });
    }

    missing.push(...candidate.missingPhotos.map((photo) => ({
      animal: candidate.name,
      cardNumber: candidate.cardNumber,
      guid: photo.guid,
      expectedPath: photo.expectedPath
    })));
  }

  const report = {
    mode,
    operation,
    generatedAt: new Date().toISOString(),
    archives: ZIP_PATHS.map((zipPath) => path.basename(zipPath)),
    totals: {
      existingAnimals: existingByCardNumber.size,
      animalsWithNewPhotos: syncItems.length,
      photosToAdd: syncItems.reduce((sum, item) => sum + item.newPhotos.length, 0),
      photosStillMissing: missing.length
    },
    missingByYear: countMissingByPathPart(missing, 1),
    missingByMonth: countMissingByPathPart(missing, 2),
    sampleAnimals: syncItems.slice(0, 20).map((item) => ({
      name: item.candidate.name,
      cardNumber: item.candidate.cardNumber,
      existingPhotos: item.animal.photos.length,
      photosToAdd: item.newPhotos.length
    })),
    missingPhotoSamples: missing.slice(0, 40)
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const reportPath = path.join(REPORT_DIR, `wp-animal-photo-sync-${mode}-${timestamp()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  printReport(report, reportPath);

  if (mode !== "apply") {
    return;
  }

  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  extractPhotos(syncItems.flatMap((item) => item.newPhotos.map((photo) => ({
    zipPath: photo.zipPath,
    internalPath: photo.internalPath,
    outputPath: photo.outputPath
  }))));

  for (const item of syncItems) {
    const startPosition = item.animal.photos.reduce((max, photo) => Math.max(max, photo.position), -1) + 1;
    await prisma.animal.update({
      where: { id: item.animal.id },
      data: {
        photos: {
          create: item.newPhotos.map((photo, index) => ({
            url: photo.publicUrl,
            alt: `${item.candidate.name} photo ${startPosition + index + 1}`,
            isCover: item.animal.photos.length === 0 && index === 0,
            position: startPosition + index
          }))
        }
      }
    });
  }

  console.log(`Added ${report.totals.photosToAdd} photos to ${report.totals.animalsWithNewPhotos} animals.`);
}

function countArchivePosts(parsed) {
  return Object.values(parsed.posts).filter((post) => {
    const terms = parsed.postTerms.get(post.id) ?? new Set();
    return post.status === "publish" && intersects(terms, parsed.archiveTerms);
  }).length;
}

function countLostFoundPosts(parsed) {
  return Object.values(parsed.posts).filter((post) => {
    const terms = parsed.postTerms.get(post.id) ?? new Set();
    return post.status === "publish" && intersects(terms, LOST_FOUND_TERMS);
  }).length;
}

function buildDistributions(candidates) {
  return {
    species: countBy(candidates, "species"),
    sex: countBy(candidates, "sex"),
    sterilized: countBy(candidates, (item) => String(item.sterilized)),
    status: countBy(candidates, "status"),
    size: countBy(candidates, (item) => item.size ?? "UNKNOWN"),
    photos: countBy(candidates, (item) => String(item.photos.length))
  };
}

function countBy(items, key) {
  const values = {};
  for (const item of items) {
    const value = typeof key === "function" ? key(item) : item[key];
    values[value] = (values[value] ?? 0) + 1;
  }
  return values;
}

function countMissingByPathPart(items, partsCount) {
  const values = {};
  for (const item of items) {
    const parts = item.expectedPath?.split("/");
    if (!parts || parts.length < partsCount) {
      continue;
    }
    const key = parts.slice(0, partsCount).join("/");
    values[key] = (values[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(values).sort(([a], [b]) => a.localeCompare(b)));
}

function printReport(report, reportPath) {
  console.log(`Mode: ${report.mode}`);
  console.log(`Report: ${reportPath}`);
  console.log("Totals:", report.totals);
  console.log("Distributions:", report.distributions);
  console.log("Sample animals:", report.sampleAnimals.slice(0, 5));
  if (report.missingPhotoSamples.length) {
    console.log("Missing photo samples:", report.missingPhotoSamples.slice(0, 5));
  }
}

function mapSpecies(value) {
  switch (value) {
    case "dog":
      return "DOG";
    case "cat":
      return "CAT";
    default:
      return "OTHER";
  }
}

function mapGender(value) {
  switch (value) {
    case "castrated-male":
      return { sex: "MALE", sterilized: true };
    case "female-sterilized":
      return { sex: "FEMALE", sterilized: true };
    case "male":
      return { sex: "MALE", sterilized: false };
    case "female":
      return { sex: "FEMALE", sterilized: false };
    default:
      return { sex: "UNKNOWN", sterilized: false };
  }
}

function mapSize(value) {
  switch (value) {
    case "small":
      return "SMALL";
    case "average":
      return "MEDIUM";
    case "big":
      return "LARGE";
    default:
      return null;
  }
}

function mapStatus(terms) {
  if (intersects(terms, TREATMENT_TERMS)) {
    return "TREATMENT";
  }
  if (intersects(terms, RESERVED_TERMS)) {
    return "RESERVED";
  }
  return "AVAILABLE";
}

function parseAgeMonths(value) {
  if (!value) {
    return null;
  }
  const normalized = String(value).toLowerCase().replace(",", ".");
  const numberMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!numberMatch) {
    return null;
  }
  const amount = Number(numberMatch[1]);
  if (!Number.isFinite(amount)) {
    return null;
  }
  if (/(міс|месяц|month)/.test(normalized)) {
    return Math.round(amount);
  }
  if (/(рік|рок|лет|год|year)/.test(normalized)) {
    return Math.round(amount * 12);
  }
  return null;
}

function parseDate(value) {
  if (!value) {
    return null;
  }
  const text = String(value).trim();
  const wpDate = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (wpDate) {
    return new Date(`${wpDate[1]}-${wpDate[2]}-${wpDate[3]}T00:00:00.000Z`);
  }
  const localDate = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (localDate) {
    const year = localDate[3].length === 2 ? `20${localDate[3]}` : localDate[3];
    const first = Number(localDate[1]);
    const second = Number(localDate[2]);
    const day = first > 12 || second <= 12 ? first : second;
    const month = first > 12 || second <= 12 ? second : first;
    return validDate(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00.000Z`);
  }
  return validDate(text);
}

function validDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function firstText(...values) {
  for (const value of values) {
    const text = textOrNull(value);
    if (text) {
      return text;
    }
  }
  return "Animal";
}

function textOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text ? text : null;
}

function uniqueSlug(base, existingSlugs) {
  const fallback = base || "animal";
  let slug = fallback;
  let suffix = 2;
  while (existingSlugs.has(slug)) {
    slug = `${fallback}-${suffix}`;
    suffix += 1;
  }
  existingSlugs.add(slug);
  return slug;
}

function slugify(value) {
  const transliterated = String(value)
    .toLowerCase()
    .replace(/[аіїєґ]/g, (char) => ({
      а: "a",
      і: "i",
      ї: "yi",
      є: "ye",
      ґ: "g"
    })[char])
    .replace(/[бвгдеёжзийклмнопрстуфхцчшщъыьэюя]/g, (char) => ({
      б: "b",
      в: "v",
      г: "h",
      д: "d",
      е: "e",
      ё: "yo",
      ж: "zh",
      з: "z",
      и: "y",
      й: "y",
      к: "k",
      л: "l",
      м: "m",
      н: "n",
      о: "o",
      п: "p",
      р: "r",
      с: "s",
      т: "t",
      у: "u",
      ф: "f",
      х: "kh",
      ц: "ts",
      ч: "ch",
      ш: "sh",
      щ: "shch",
      ъ: "",
      ы: "y",
      ь: "",
      э: "e",
      ю: "yu",
      я: "ya"
    })[char])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return transliterated || `animal-${shortHash(value)}`;
}

function shortHash(value) {
  return crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 8);
}

function intersects(a, b) {
  for (const item of a) {
    if (b.has(item)) {
      return true;
    }
  }
  return false;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
}
