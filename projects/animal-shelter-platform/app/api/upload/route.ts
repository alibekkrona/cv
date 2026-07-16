import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getAdminSessionUser } from "@/lib/auth/session";
import { type AdminPermission, hasPermission } from "@/lib/auth/permissions";

export const runtime = "nodejs";

const allowedImageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
} as const;

const maxFileSize = 5 * 1024 * 1024;
const uploadFolders = ["animals", "lost-found", "needs"] as const;

type UploadFolder = (typeof uploadFolders)[number];

const folderPermissions: Record<UploadFolder, AdminPermission | null> = {
  animals: "animals.manage",
  "lost-found": null,
  needs: "needs.createDraft"
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const folder = normalizeFolder(formData.get("folder"));

  if (!folder) {
    return NextResponse.json({ error: "Некорректная папка загрузки." }, { status: 422 });
  }

  const permission = folderPermissions[folder];

  if (permission) {
    const user = await getAdminSessionUser();

    if (!user) {
      return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
    }

    if (!hasPermission(user.role, permission)) {
      return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
    }
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл обязателен." }, { status: 422 });
  }

  if (!Object.hasOwn(allowedImageTypes, file.type)) {
    return NextResponse.json({ error: "Допустимы только изображения JPG, PNG, WEBP или GIF." }, { status: 422 });
  }

  if (file.size > maxFileSize) {
    return NextResponse.json({ error: "Размер изображения должен быть не больше 5 МБ." }, { status: 422 });
  }

  const extension = allowedImageTypes[file.type as keyof typeof allowedImageTypes];
  const fileName = `${randomUUID()}.${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  const filePath = path.join(uploadDir, fileName);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({
    url: `/uploads/${folder}/${fileName}`
  });
}

function normalizeFolder(value: FormDataEntryValue | null): UploadFolder | null {
  return typeof value === "string" && uploadFolders.includes(value as UploadFolder)
    ? (value as UploadFolder)
    : null;
}
