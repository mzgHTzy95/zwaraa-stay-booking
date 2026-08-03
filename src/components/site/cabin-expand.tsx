import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useI18n, formatPrice } from "@/lib/i18n";
import { cabinGallery } from "@/lib/images";
import { PlankPhoto } from "@/components/site/ornaments";
import { PackList } from "@/components/site/pack";

export type ExpandCabin = {
  id: string;
  slug: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  capacity: number;
  photos: string[] | null;
  included_package: string[];
  included_package_ar: string[];
  price_half_day: number;
  price_24h: number;
};

export type OriginRect = { top: number; left: number; width: number; height: number };

export function CabinExpand({
  cabin,
  origin,
  onClose,
}: {
  cabin: ExpandCabin;
  origin: OriginRect;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    setOpen(false);
    window.setTimeout(onClose, 380);
  };

  const photos = cabinGallery(cabin.slug, cabin.photos);
  const included = lang === "ar" ? cabin.included_package_ar : cabin.included_package;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={t("cabin.close")}
        onClick={close}
        className={`absolute inset-0 bg-foreground/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="absolute overflow-y-auto overscroll-contain bg-background shadow-2xl"
        style={{
          top: open ? 0 : origin.top,
          left: open ? 0 : origin.left,
          width: open ? "100%" : origin.width,
          height: open ? "100%" : origin.height,
          borderRadius: open ? 0 : 2,
          transition:
            "top 420ms cubic-bezier(0.22,1,0.36,1), left 420ms cubic-bezier(0.22,1,0.36,1), width 420ms cubic-bezier(0.22,1,0.36,1), height 420ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div
          className={`mx-auto max-w-4xl px-5 pb-20 pt-8 transition-opacity duration-300 ${
            open ? "opacity-100 delay-200" : "opacity-0"
          }`}
        >
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="num text-[11px] uppercase tracking-[0.22em] text-forest">
                {t("cabin.capacity", { n: cabin.capacity })}
              </p>
              <h2 className="mt-2 text-3xl text-primary sm:text-5xl">
                {lang === "ar" ? cabin.name_ar : cabin.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={close}
              className="shrink-0 border border-input px-3 py-1.5 text-xs uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-primary"
            >
              {t("cabin.close")}
            </button>
          </div>

          <PlankPhoto
            src={photos[0]!}
            alt={cabin.name}
            className="mt-7"
            imgClassName="aspect-[16/9]"
            priority
          />
          <div className="mt-4 grid grid-cols-3 gap-4">
            {photos.slice(1, 4).map((p, i) => (
              <PlankPhoto key={i} src={p} alt={`${cabin.name} — ${i + 2}`} imgClassName="aspect-[4/3]" />
            ))}
          </div>

          <p className="mt-8 max-w-2xl text-base leading-relaxed text-foreground/85">
            {lang === "ar" ? cabin.description_ar : cabin.description}
          </p>

          <div className="mt-9 grid gap-8 sm:grid-cols-2">
            <section>
              <h3 className="text-xl text-primary">{t("cabin.included")}</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {included.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-[6px] block h-[6px] w-[6px] shrink-0 bg-amber" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
            <PackList />
          </div>

          <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t-2 border-primary pt-5">
            <dl className="flex gap-10">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("slot.half_day")}
                </dt>
                <dd className="num mt-1 text-xl">{formatPrice(cabin.price_half_day, lang)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("slot.24h")}
                </dt>
                <dd className="num mt-1 text-xl">{formatPrice(cabin.price_24h, lang)}</dd>
                <dd className="mt-0.5 text-[11px] text-muted-foreground">{t("cabin.perPerson")}</dd>
              </div>
            </dl>
            <div className="flex gap-3">
              <Link
                to="/cabins/$slug"
                params={{ slug: cabin.slug }}
                className="border border-input px-5 py-3 text-sm text-primary"
              >
                {t("cabin.checkAvailability")}
              </Link>
              <Link
                to="/book/$slug"
                params={{ slug: cabin.slug }}
                search={{ date: undefined, slot: "24h" as const }}
                className="bg-coral px-6 py-3 text-sm font-medium text-coral-foreground hover:bg-coral/90"
              >
                {t("cabin.reserve")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
