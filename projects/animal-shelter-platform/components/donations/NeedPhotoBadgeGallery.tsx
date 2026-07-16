"use client";

import { useEffect, useState } from "react";

type NeedPhoto = {
  alt: string | null;
  id?: number;
  url: string;
};

type NeedPhotoBadgeGalleryProps = {
  children?: React.ReactNode;
  className?: string;
  imageClassName?: string;
  label: string;
  photos: NeedPhoto[];
};

export function NeedPhotoBadgeGallery({
  children,
  className = "absolute bottom-3 right-3 z-10 h-16 w-24 overflow-hidden rounded-md border border-white/80 bg-black shadow-lg ring-1 ring-black/20 transition hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-white md:h-20 md:w-28",
  imageClassName = "h-full w-full object-cover",
  label,
  photos
}: NeedPhotoBadgeGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");
  const selectedPhoto = photos[selectedIndex];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeGallery();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!selectedPhoto) {
    return null;
  }

  function closeGallery() {
    setIsOpen(false);
    setIsZoomed(false);
    setZoomOrigin("50% 50%");
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

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setSelectedIndex(0);
          setIsOpen(true);
        }}
        className={className}
        aria-label={`Открыть фото потребности: ${label}`}
      >
        {children ?? (
          <img src={selectedPhoto.url} alt={selectedPhoto.alt ?? label} className={imageClassName} />
        )}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black"
          role="dialog"
          aria-modal="true"
          aria-label={`Галерея потребности: ${label}`}
          onClick={closeGallery}
        >
          <button
            type="button"
            onClick={closeGallery}
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
              alt={selectedPhoto.alt ?? label}
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
              <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/75 to-transparent px-8 pb-6 pt-12">
                <div className="flex justify-center gap-3 overflow-x-auto">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id ?? `${photo.url}-${index}`}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsZoomed(false);
                        setZoomOrigin("50% 50%");
                        setSelectedIndex(index);
                      }}
                      aria-label={`Показать фото ${index + 1}`}
                      className={`h-24 w-36 shrink-0 overflow-hidden rounded-md border bg-shelter-leaf/20 transition ${
                        selectedIndex === index ? "border-white ring-2 ring-white/90" : "border-white/25 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img src={photo.url} alt={photo.alt ?? label} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
