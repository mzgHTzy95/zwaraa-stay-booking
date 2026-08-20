import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useI18n, formatPrice } from "@/lib/i18n";
import { cabinGallery } from "@/lib/images";
import { PlankPhoto } from "@/components/site/ornaments";
import { PackList } from "@/components/site/pack";
import { CalendarCheck } from "lucide-react";


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
        className={`absolute inset-0 bg-foreground/50 backdrop-blur-sm transition-opacity duration-300 ${
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
          borderRadius: open ? 0 : 16,
          transition:
            "top 420ms cubic-bezier(0.22,1,0.36,1), left 420ms cubic-bezier(0.22,1,0.36,1), width 420ms cubic-bezier(0.22,1,0.36,1), height 420ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        <div
          className={`mx-auto max-w-6xl px-5 pb-20 pt-8 transition-opacity duration-300 ${
            open ? "opacity-100 delay-200" : "opacity-0"
          }`}
        >
          <div className="sticky top-0 z-10 -mx-5 mb-8 flex items-start justify-between gap-6 bg-background/90 px-5 py-4 backdrop-blur-sm">
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
              className="shrink-0 rounded-full border border-input px-4 py-1.5 text-xs uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {t("cabin.close")}
            </button>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left Column: Images */}
            <div>
              <PlankPhoto
                src={photos[0]!}
                alt={cabin.name}
                className="rounded-2xl overflow-hidden"
                imgClassName="aspect-[16/9]"
                priority
              />
              <div className="mt-4 grid grid-cols-3 gap-4">
                {photos.slice(1, 4).map((p, i) => (
                  <PlankPhoto
                    key={i}
                    src={p}
                    alt={`${cabin.name} — ${i + 2}`}
                    className="rounded-xl overflow-hidden"
                    imgClassName="aspect-[4/3]"
                  />
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">

                            <p className="max-w-2xl text-base leading-relaxed text-foreground/85">
                {lang === "ar" ? cabin.description_ar : cabin.description}
              </p>

              </div>
            </div>

            {/* Right Column: Details */}
            <div className="flex flex-col">

              <div className="grid gap-6 sm:grid-cols-2">
                <section className="rounded-xl border border-amber/25 bg-amber/5 p-5">
                  <h3 className="text-lg text-primary">{t("cabin.included")}</h3>
                  <ul className="mt-4 space-y-2.5 text-sm">
                    {included.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
                <PackList />
              </div>

              {/* Pricing + CTA */}
              <div className="mt-3 pt-10 flex flex-wrap items-end justify-between gap-6 rounded-xl border border-primary/20 bg-primary/5 px-6 py-5">
                <dl className="flex gap-10">
                  {/* <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("slot.half_day")}
                    </dt>
                    <dd className="num mt-1 text-xl font-semibold">{formatPrice(cabin.price_half_day, lang)}</dd>
                    <dd className="text-[10px] text-muted-foreground">{t("cabin.perPersonHalf")}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("slot.24h")}
                    </dt>
                    <dd className="num mt-1 text-xl font-semibold">{formatPrice(cabin.price_24h, lang)}</dd>
                    <dd className="mt-0.5 text-[11px] text-muted-foreground">{t("cabin.perPerson")}</dd>
                  </div> */}
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
                  <Link
                    to="/"
                    hash="search"
                    onClick={close}
                    className="btn-pill btn-coral inline-flex w-full items-center justify-center gap-2 py-3.5 sm:w-auto"
                  >
                    <CalendarCheck size={16} /> {t("cabin.reserve")}
                  </Link>

                  <p className="max-w-xs text-[11px] text-muted-foreground">{t("gallery.note")}</p>
                </div>
                </dl>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
