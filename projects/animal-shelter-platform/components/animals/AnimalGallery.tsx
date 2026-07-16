"use client";

import { useEffect, useState } from "react";

type AnimalGalleryPhoto = {
  alt: string | null;
  id: number;
  url: string;
};

type AnimalGalleryProps = {
  animalName: string;
  className?: string;
  fillAvailable?: boolean;
  photos: AnimalGalleryPhoto[];
};

export function AnimalGallery({ animalName, className = "", fillAvailable = false, photos }: AnimalGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");
  const selectedPhoto = photos[selectedIndex];

  useEffect(() => {
    if (!isLightboxOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsLightboxOpen(false);
        setIsZoomed(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen]);

  if (!selectedPhoto) {
    return (
      <div className={`${fillAvailable ? "h-full min-h-0" : "aspect-video max-h-[calc(100vh-195px)]"} overflow-hidden rounded-lg bg-shelter-leaf/20 ${className}`} />
    );
  }

  function showPreviousPhoto() {
    setIsZoomed(false);
    setZoomOrigin("50% 50%");
    setSelectedIndex((current) => (current === 0 ? photos.length - 1 : current - 1));
  }

  function showNextPhoto() {
    setIsZoomed(false);
    setZoomOrigin("50% 50%");
    setSelectedIndex((current) => (current === photos.length - 1 ? 0 : current + 1));
  }

  function closeLightbox() {
    setIsLightboxOpen(false);
    setIsZoomed(false);
    setZoomOrigin("50% 50%");
  }

  return (
    <section className={fillAvailable ? "h-full min-h-0" : undefined}>
      <div className={`relative ${fillAvailable ? "h-full min-h-0" : "aspect-video max-h-[calc(100vh-195px)]"} overflow-hidden rounded-lg bg-shelter-leaf/20 ${className}`}>
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="block h-full w-full cursor-zoom-in"
          aria-label="Открыть фото крупно"
        >
          <img
            src={selectedPhoto.url}
            alt={selectedPhoto.alt ?? animalName}
            className="h-full w-full object-cover"
          />
        </button>
      </div>

      {isLightboxOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black"
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр фото"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Закрыть фото"
            className="absolute right-5 top-4 z-30 text-5xl font-light leading-none text-white/80 transition hover:text-white"
          >
            ×
          </button>
          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 text-sm font-semibold text-white/80">
            {selectedIndex + 1} / {photos.length}
          </div>
          {photos.length > 1 ? (
            <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                showPreviousPhoto();
              }}
              aria-label="Предыдущее фото"
              className="absolute left-0 top-0 z-20 flex h-full w-20 items-center justify-center text-6xl font-light text-white/85 transition hover:bg-white/10 hover:text-white"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                showNextPhoto();
              }}
              aria-label="Следующее фото"
              className="absolute right-0 top-0 z-20 flex h-full w-20 items-center justify-center text-6xl font-light text-white/85 transition hover:bg-white/10 hover:text-white"
            >
              ›
            </button>
            </>
          ) : null}
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.alt ?? animalName}
              onClick={(event) => {
                event.stopPropagation();
                if (isZoomed) {
                  setIsZoomed(false);
                  return;
                }

                const rect = event.currentTarget.getBoundingClientRect();
                const x = ((event.clientX - rect.left) / rect.width) * 100;
                const y = ((event.clientY - rect.top) / rect.height) * 100;

                setZoomOrigin(`${x}% ${y}%`);
                setIsZoomed(true);
              }}
              style={{ transformOrigin: zoomOrigin }}
              className={`h-full w-full cursor-zoom-in object-contain transition-transform duration-300 ease-out ${
                isZoomed ? "scale-[2] cursor-zoom-out" : "scale-100"
              }`}
            />
            {photos.length > 1 ? (
              <PhotoStrip
                animalName={animalName}
                photos={photos}
                selectedIndex={selectedIndex}
                onSelect={(index) => {
                  setIsZoomed(false);
                  setZoomOrigin("50% 50%");
                  setSelectedIndex(index);
                }}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PhotoStrip({
  animalName,
  onSelect,
  photos,
  selectedIndex
}: {
  animalName: string;
  onSelect: (index: number) => void;
  photos: AnimalGalleryPhoto[];
  selectedIndex: number;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/75 to-transparent px-8 pb-6 pt-12">
      <div className="flex justify-center gap-3 overflow-x-auto">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(index);
            }}
            aria-label={`Показать фото ${index + 1}`}
            className={`h-24 w-36 shrink-0 overflow-hidden rounded-md border bg-shelter-leaf/20 transition ${
              selectedIndex === index ? "border-white ring-2 ring-white/90" : "border-white/25 opacity-75 hover:opacity-100"
            }`}
          >
            <img
              src={photo.url}
              alt={photo.alt ?? animalName}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
