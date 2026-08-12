import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export type LightboxPhoto = {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  categoryLabel?: string;
  mediaType?: "image" | "video";
  thumbSrc?: string;
  bookingHref?: string;
};

type LightboxProps = {
  photos: LightboxPhoto[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

const AUTOPLAY_MS = 4500;

export function Lightbox({ photos, index, onClose, onNavigate }: LightboxProps) {
  const { dir, t } = useI18n();
  const touchStartX = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);
  const directionRef = useRef<"next" | "prev">("next");
  const [zoomed, setZoomed] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const open = index !== null;
  const current = open ? photos[index!] : null;
  const isVideo = current?.mediaType === "video";

  const goPrev = useCallback(() => {
    if (index === null) return;
    directionRef.current = "prev";
    onNavigate((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onNavigate]);

  const goNext = useCallback(() => {
    if (index === null) return;
    directionRef.current = "next";
    onNavigate((index + 1) % photos.length);
  }, [index, photos.length, onNavigate]);

  const jumpTo = (target: number) => {
    if (index === null) return;
    directionRef.current = target > index ? "next" : "prev";
    onNavigate(target);
  };

  useEffect(() => setZoomed(false), [index]);
  useEffect(() => {
    if (open) setAutoplay(true); // reset to on each time the lightbox is opened
  }, [open]);

  // Autoplay — pauses automatically on video slides so playback isn't interrupted.
  useEffect(() => {
    if (!open || !autoplay || isVideo || zoomed || photos.length < 2) return;
    const timer = setTimeout(goNext, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [open, autoplay, isVideo, zoomed, index, goNext, photos.length]);

  // Preload neighbouring images.
  useEffect(() => {
    if (index === null) return;
    [index - 1, index + 1].forEach((i) => {
      const neighbor = photos[(i + photos.length) % photos.length];
      if (neighbor && neighbor.mediaType !== "video") {
        const img = new Image();
        img.src = neighbor.src;
      }
    });
  }, [index, photos]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") (dir === "rtl" ? goNext : goPrev)();
      if (e.key === "ArrowRight") (dir === "rtl" ? goPrev : goNext)();
      if (e.key === " ") {
        e.preventDefault();
        setAutoplay((a) => !a);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, dir, goPrev, goNext, onClose]);

  if (!open || !current) return null;

  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  // Visual slide direction, flipped for RTL so it still reads naturally.
  const goingForward = directionRef.current === "next";
  const effectiveForward = dir === "rtl" ? !goingForward : goingForward;
  const slideClass = effectiveForward ? "lb-slide-in-next" : "lb-slide-in-prev";

  function handleDoubleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) setZoomed((z) => !z);
    lastTapRef.current = now;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-foreground/90 px-4 py-8 animate-fade"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
        if (!zoomed && Math.abs(dx) > 40) {
          const swipedForward = dx < 0;
          const goForward = dir === "rtl" ? !swipedForward : swipedForward;
          goForward ? goNext() : goPrev();
        }
        touchStartX.current = null;
      }}
    >
      <style>{`
        @keyframes lbSlideInNext { from { transform: translateX(28px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes lbSlideInPrev { from { transform: translateX(-28px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .lb-slide-in-next { animation: lbSlideInNext 0.32s ease-out; }
        .lb-slide-in-prev { animation: lbSlideInPrev 0.32s ease-out; }
        .lb-no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .lb-no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <p className="sr-only" role="status" aria-live="polite">
        {t("lightbox.position", { current: index! + 1, total: photos.length })}
        {current.categoryLabel ? ` — ${current.categoryLabel}` : ""}
        {current.caption ? ` — ${current.caption}` : ""}
      </p>

      <div className="absolute top-5 right-5 flex items-center gap-2">
        {photos.length > 1 && !isVideo && (
          <button
            type="button"
            aria-label={autoplay ? t("lightbox.pause") : t("lightbox.play")}
            onClick={(e) => {
              e.stopPropagation();
              setAutoplay((a) => !a);
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {autoplay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        )}
        <button
          type="button"
          aria-label={t("cabin.close")}
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {photos.length > 1 && !zoomed && (
        <button
          type="button"
          aria-label="previous"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-3 md:left-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <PrevIcon className="h-6 w-6" />
        </button>
      )}

      <div
        className="relative max-h-[75vh] max-w-4xl overflow-hidden"
        onClick={(e) => {
          e.stopPropagation();
          if (!isVideo) handleDoubleTap();
        }}
        onDoubleClick={() => !isVideo && setZoomed((z) => !z)}
      >
        <div key={current.id} className={slideClass}>
          {isVideo ? (
            <video
              src={current.src}
              controls
              autoPlay
              className="max-h-[75vh] w-auto rounded-2xl object-contain shadow-soft"
            />
          ) : (
            <img
              src={current.src}
              alt={current.alt}
              className={[
                "max-h-[75vh] w-auto rounded-2xl object-contain shadow-soft transition-transform duration-300 cursor-zoom-in",
                zoomed ? "scale-[1.8] cursor-zoom-out" : "scale-100",
              ].join(" ")}
            />
          )}
        </div>

        {(current.caption || current.categoryLabel || current.bookingHref) && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-center">
            {current.categoryLabel && (
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
                {current.categoryLabel}
              </span>
            )}
            {current.caption && <span className="text-sm text-white/85">{current.caption}</span>}
            {current.bookingHref && (
              <Link
                to={current.bookingHref}
                onClick={(e) => e.stopPropagation()}
                className="btn-pill btn-coral py-1.5 px-4 text-xs"
              >
                {t("gallery.reserveThis")}
              </Link>
            )}
          </div>
        )}
        <p className="mt-1 text-center text-xs text-white/50 num">
          {index! + 1} / {photos.length}
        </p>
      </div>

      {photos.length > 1 && !zoomed && (
        <button
          type="button"
          aria-label="next"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-3 md:right-6 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <NextIcon className="h-6 w-6" />
        </button>
      )}

      {photos.length > 1 && (
        <div
          className="lb-no-scrollbar mt-5 flex max-w-full gap-2 overflow-x-auto px-2 pb-1"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`${i + 1}`}
              onClick={() => jumpTo(i)}
              className={[
                "h-12 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-opacity focus-visible:outline-none",
                i === index ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-80",
              ].join(" ")}
            >
              <img src={p.thumbSrc ?? p.src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}