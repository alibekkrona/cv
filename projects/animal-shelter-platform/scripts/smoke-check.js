const { existsSync } = require("fs");
const { unlink } = require("fs/promises");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
const created = {
  animalIds: [],
  applicationIds: [],
  lostFoundReportIds: [],
  uploadedFiles: []
};

async function main() {
  console.log(`Smoke-check target: ${baseUrl}`);

  await checkPublicAnimalsApi();
  const animal = await checkAnimalCreateEdit();
  await checkApplicationSubmit(animal.id);
  await checkUpload();
  await checkLostFoundSubmit();

  console.log("Smoke-check passed.");
}

async function checkPublicAnimalsApi() {
  const response = await fetch(`${baseUrl}/api/animals`);
  assert(response.ok, `/api/animals returned ${response.status}`);
  const payload = await response.json();

  assert(Array.isArray(payload.animals), "/api/animals should return animals array");
  console.log("OK /api/animals");
}

async function checkAnimalCreateEdit() {
  const slug = `smoke-animal-${Date.now()}`;
  const animal = await prisma.animal.create({
    data: {
      name: "Smoke Animal",
      slug,
      species: "DOG",
      sex: "MALE",
      status: "DRAFT",
      description: "Temporary smoke-check animal.",
      photos: {
        create: {
          url: "/uploads/animals/smoke-placeholder.jpg",
          alt: "Smoke animal",
          isCover: true,
          position: 0
        }
      }
    }
  });
  created.animalIds.push(animal.id);

  const updatedAnimal = await prisma.animal.update({
    where: { id: animal.id },
    data: {
      name: "Smoke Animal Updated",
      status: "AVAILABLE",
      publishedAt: new Date()
    }
  });

  assert(updatedAnimal.name === "Smoke Animal Updated", "animal update should persist name");
  assert(updatedAnimal.status === "AVAILABLE", "animal update should persist status");
  console.log("OK animal create/edit");

  return updatedAnimal;
}

async function checkApplicationSubmit(animalId) {
  const response = await fetch(`${baseUrl}/api/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      animalId,
      type: "ACQUAINTANCE",
      applicantName: "Smoke Applicant",
      phone: "+380000000000",
      email: "smoke@example.org",
      city: "Smoke City",
      housingType: "Квартира",
      hasChildren: false,
      hasAnimals: false,
      message: "Temporary smoke-check application."
    })
  });

  assert(response.status === 201, `/api/applications returned ${response.status}`);
  const payload = await response.json();
  const applicationId = payload.application?.id;
  assert(Number.isInteger(applicationId), "application response should include id");
  created.applicationIds.push(applicationId);

  const historyCount = await prisma.adoptionApplicationStatusEvent.count({
    where: { applicationId }
  });
  assert(historyCount > 0, "application submit should create status history");
  console.log("OK application submit");
}

async function checkUpload() {
  const formData = new FormData();
  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  formData.append("folder", "lost-found");
  formData.append("file", new Blob([pngBytes], { type: "image/png" }), "smoke.png");

  const response = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    body: formData
  });

  assert(response.status === 200, `/api/upload returned ${response.status}`);
  const payload = await response.json();
  assert(typeof payload.url === "string" && payload.url.startsWith("/uploads/lost-found/"), "upload should return lost/found upload URL");

  const filePath = path.join(process.cwd(), "public", payload.url);
  assert(existsSync(filePath), "uploaded file should exist on disk");
  created.uploadedFiles.push(filePath);
  console.log("OK upload");
}

async function checkLostFoundSubmit() {
  const slug = `smoke-lost-found-${Date.now()}`;
  const response = await fetch(`${baseUrl}/api/lost-found`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "FOUND",
      species: "CAT",
      sex: "UNKNOWN",
      size: "SMALL",
      title: "Smoke Found Cat",
      slug,
      description: "Temporary smoke-check lost/found report.",
      city: "Smoke City",
      district: "Smoke District",
      contactName: "Smoke Contact",
      contactPhone: "+380000000001",
      contactEmail: "lost-found-smoke@example.org"
    })
  });

  assert(response.status === 201, `/api/lost-found returned ${response.status}`);
  const payload = await response.json();
  const reportId = payload.report?.id;
  assert(Number.isInteger(reportId), "lost/found response should include id");
  created.lostFoundReportIds.push(reportId);
  console.log("OK lost/found submit");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanup() {
  for (const applicationId of created.applicationIds) {
    await prisma.adoptionApplication.delete({ where: { id: applicationId } }).catch(() => {});
  }

  for (const reportId of created.lostFoundReportIds) {
    await prisma.lostFoundReport.delete({ where: { id: reportId } }).catch(() => {});
  }

  for (const animalId of created.animalIds) {
    await prisma.animal.delete({ where: { id: animalId } }).catch(() => {});
  }

  for (const filePath of created.uploadedFiles) {
    await unlink(filePath).catch(() => {});
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });
