"use client";

import { useState } from "react";

type ManagedPhoto = {
  alt: string;
  isCover: boolean;
  url: string;
};

type AnimalPhotoFieldsProps = {
  coverPhotoUrl?: string;
  coverPhotoAlt?: string;
  extraPhotoUrls?: string;
  galleryLabel?: string;
  manualUrlPlaceholder?: string;
  uploadFolder?: "animals" | "lost-found" | "needs";
};

export function AnimalPhotoFields({
  coverPhotoUrl = "",
  coverPhotoAlt = "",
  extraPhotoUrls = "",
  galleryLabel = "галерее животного",
  manualUrlPlaceholder = "/uploads/animals/example.jpg или https://...",
  uploadFolder = "animals"
}: AnimalPhotoFieldsProps) {
  const [photos, setPhotos] = useState<ManagedPhoto[]>(() => buildInitialPhotos(coverPhotoUrl, coverPhotoAlt, extraPhotoUrls));
  const [manualUrl, setManualUrl] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const coverPhoto = photos.find((photo) => photo.isCover) ?? photos[0];
  const extraPhotoUrlsValue = photos
    .filter((photo) => photo.url !== coverPhoto?.url)
    .map((photo) => photo.url)
    .join("\n");

  async function uploadFiles(files: FileList | File[]) {
    const selectedFiles = Array.from(files);

    if (!selectedFiles.length) {
      return;
    }

    setMessage("");
    setUploading(true);
    setMessage(`Выбрано файлов: ${selectedFiles.length}.`);
    setUploadProgress(`Загрузка 0/${selectedFiles.length}`);

    try {
      const uploadedPhotos: ManagedPhoto[] = [];

      for (const [index, file] of selectedFiles.entries()) {
        setUploadProgress(`Загрузка ${index + 1}/${selectedFiles.length}`);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", uploadFolder);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });
        const payload = (await response.json()) as { url?: string; error?: string };

        if (!response.ok || !payload.url) {
          setMessage(payload.error ?? "Загрузка не удалась.");
          return;
        }

        uploadedPhotos.push({
          alt: file.name.replace(/\.[^.]+$/, "").replaceAll(/[-_]+/g, " "),
          isCover: false,
          url: payload.url
        });
      }

      setPhotos((current) => normalizePhotos([...current, ...uploadedPhotos]));
      setMessage(`Загружено изображений: ${uploadedPhotos.length}.`);
    } catch {
      setMessage("Загрузка не удалась. Попробуйте другое изображение.");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  function addManualUrl() {
    const url = manualUrl.trim();

    if (!url) {
      return;
    }

    setPhotos((current) => normalizePhotos([
      ...current,
      {
        alt: "",
        isCover: false,
        url
      }
    ]));
    setManualUrl("");
    setMessage("Ссылка на фото добавлена.");
  }

  function updatePhoto(index: number, patch: Partial<ManagedPhoto>) {
    setPhotos((current) => normalizePhotos(current.map((photo, photoIndex) => (
      photoIndex === index ? { ...photo, ...patch } : photo
    ))));
  }

  function removePhoto(index: number) {
    setPhotos((current) => normalizePhotos(current.filter((_, photoIndex) => photoIndex !== index)));
  }

  return (
    <section className="grid gap-4 rounded border border-shelter-ink/10 p-4">
      <input type="hidden" name="photosJson" value={JSON.stringify(photos)} />
      <input type="hidden" name="coverPhotoUrl" value={coverPhoto?.url ?? ""} />
      <input type="hidden" name="coverPhotoAlt" value={coverPhoto?.alt ?? ""} />
      <input type="hidden" name="extraPhotoUrls" value={extraPhotoUrlsValue} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Фотографии</h2>
          <p className="mt-1 text-sm text-shelter-ink/60">
            Фотографий: {photos.length} в этой {galleryLabel}.
          </p>
        </div>
        <label className="grid gap-1 text-sm">
          Загрузить фото
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="max-w-full rounded border border-shelter-ink/20 bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-shelter-moss file:px-3 file:py-1 file:text-sm file:font-medium file:text-white"
            disabled={uploading}
            multiple
            onChange={(event) => {
              const files = Array.from(event.currentTarget.files ?? []);
              event.target.value = "";

              if (files.length) {
                void uploadFiles(files);
              }
            }}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          {uploadProgress ? <span className="text-sm text-shelter-ink/60">{uploadProgress}</span> : null}
          {message ? <span className="text-sm text-shelter-ink/60">{message}</span> : null}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={manualUrl}
          onChange={(event) => setManualUrl(event.target.value)}
          placeholder={manualUrlPlaceholder}
          className="rounded border border-shelter-ink/20 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addManualUrl}
          className="rounded border border-shelter-ink/15 px-3 py-2 text-sm font-medium"
        >
          Добавить ссылку
        </button>
      </div>

      {photos.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {photos.map((photo, index) => (
            <div key={`${photo.url}-${index}`} className="grid gap-3 rounded border border-shelter-ink/10 p-3">
              <img
                src={photo.url}
                alt={photo.alt || "Загруженное фото"}
                className="aspect-[4/3] w-full rounded object-cover"
              />
              <div className="grid gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="coverPhotoChoice"
                    checked={photo.isCover}
                    onChange={() => updatePhoto(index, { isCover: true })}
                  />
                  Обложка
                </label>
                <label className="grid gap-1 text-sm">
                  Alt-текст
                  <input
                    value={photo.alt}
                    onChange={(event) => updatePhoto(index, { alt: event.target.value })}
                    placeholder="Короткое описание изображения"
                    className="rounded border border-shelter-ink/20 px-3 py-2"
                  />
                </label>
                <p className="break-all text-xs text-shelter-ink/50">{photo.url}</p>
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="w-fit rounded border border-red-200 px-3 py-1 text-sm font-medium text-red-700"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-shelter-ink/20 px-4 py-8 text-center text-sm text-shelter-ink/60">
          Фотографий пока нет.
        </div>
      )}
    </section>
  );
}

function buildInitialPhotos(coverPhotoUrl: string, coverPhotoAlt: string, extraPhotoUrls: string): ManagedPhoto[] {
  const photos: ManagedPhoto[] = [];

  if (coverPhotoUrl.trim()) {
    photos.push({
      alt: coverPhotoAlt,
      isCover: true,
      url: coverPhotoUrl.trim()
    });
  }

  extraPhotoUrls
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean)
    .forEach((url) => {
      photos.push({
        alt: "",
        isCover: false,
        url
      });
    });

  return normalizePhotos(photos);
}

function normalizePhotos(photos: ManagedPhoto[]) {
  const seenUrls = new Set<string>();
  const normalizedPhotos = photos.filter((photo) => {
    const url = photo.url.trim();

    if (!url || seenUrls.has(url)) {
      return false;
    }

    seenUrls.add(url);
    photo.url = url;
    return true;
  });

  const coverIndex = normalizedPhotos.findIndex((photo) => photo.isCover);

  return normalizedPhotos.map((photo, index) => ({
    ...photo,
    isCover: coverIndex >= 0 ? index === coverIndex : index === 0
  }));
}
