import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useMemo } from "react";
import { format, addMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, formatPrice } from "@/lib/i18n";
import { SiteHeader, SiteFooter } from "@/components/site/chrome";
import { PlankPhoto, WaveDivider, SectionTitle } from "@/components/site/ornaments";
import { CabinExpand } from "@/components/site/cabin-expand";
import type { ExpandCabin, OriginRect } from "@/components/site/cabin-expand";
import { cabinCover, heroLagoon } from "@/lib/images";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zwaraa — Bungalows sur pilotis, lagune de Nefza" },
      {
        name: "description",
        content:
          "Réservez un bungalow sur l'eau à Zwaraa, Nefza : demi-journée ou 24 heures, repas et tour en barque compris.",
      },
      { property: "og:title", content: "Zwaraa — Bungalows sur pilotis, lagune de Nefza" },
      {
        property: "og:description",
        content: "Demi-journée ou 24 heures au-dessus de la lagune de Nefza, en Tunisie.",
      },
    ],
  }),
  component: Home,
});

function useCabins() {
  return useQuery({
    queryKey: ["cabins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cabins")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });
}

/** Fetch today + next 14 days booked slots for all cabins */
function useAllBooked(cabinIds: string[]) {
  return useQuery({
    queryKey: ["all-booked", cabinIds.join(",")],
    enabled: cabinIds.length > 0,
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const soon = format(addMonths(new Date(), 1), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("reservations")
        .select("cabin_id, reservation_date, nights, slot")
        .in("cabin_id", cabinIds)
        .neq("status", "cancelled")
        .gte("reservation_date", today)
        .lte("reservation_date", soon);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function Home() {
  const { t, lang } = useI18n();
  const { data: cabins, isLoading } = useCabins();
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [expanded, setExpanded] = useState<{ cabin: ExpandCabin; origin: OriginRect } | null>(null);

  const cabinIds = useMemo(() => (cabins ?? []).map((c) => c.id), [cabins]);
  const { data: bookedRows } = useAllBooked(cabinIds);

  // Build a set of cabin IDs that are currently reserved (today booked)
  const reservedCabinIds = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const ids = new Set<string>();
    for (const row of bookedRows ?? []) {
      const nights = Math.max(1, Number(row.nights ?? 1));
      const start = new Date(`${row.reservation_date}T00:00:00Z`).getTime();
      for (let i = 0; i < nights; i++) {
        const d = new Date(start + i * 86400000).toISOString().slice(0, 10);
        if (d === today) ids.add(row.cabin_id);
      }
    }
    return ids;
  }, [bookedRows]);

  const openCabin = (cabin: ExpandCabin) => {
    const el = cardRefs.current[cabin.id];
    const r = el?.getBoundingClientRect();
    setExpanded({
      cabin,
      origin: r
        ? { top: r.top, left: r.left, width: r.width, height: r.height }
        : { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 },
    });
  };


  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <PlankPhoto
          src={heroLagoon}
          alt="Bungalows blancs à toit corail sur pilotis au-dessus de la lagune de Nefza"
          className="w-full"
          imgClassName="aspect-[21/9] min-h-[340px] object-cover"
          priority
          width={1920}
          height={1080}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-foreground/20 to-transparent" />

        {/* Hero text + CTA */}
        <div className="absolute inset-0 flex flex-col items-start justify-end p-6 sm:p-12 max-w-5xl mx-auto left-0 right-0">
          <p className="num text-[11px] uppercase tracking-[0.22em] text-white/80 mb-2">
            {t("brand.location")}
          </p>
          <h1 className="text-3xl sm:text-5xl text-white leading-tight max-w-xl">
            {t("hero.title")}
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/80 hidden sm:block">
            {t("hero.text")}
          </p>
          <a
            href="#cabins"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-medium text-coral-foreground transition-all hover:bg-coral/90 hover:shadow-lg"
          >
            {t("hero.cta")}
            <span>→</span>
          </a>
        </div>
      </section>

      <WaveDivider />

      {/* Cabins Section */}
      <section id="cabins" className="mx-auto max-w-5xl px-5 pb-12">
        <SectionTitle kicker={t("nav.cabins")}>{t("cabins.title")}</SectionTitle>
        <p className="mt-3 text-sm text-muted-foreground">{t("cabins.subtitle")}</p>

        {isLoading ? (
          <div className="mt-12 flex flex-col items-center gap-3 py-16">
            <span className="block h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {(cabins ?? []).map((cabin) => {
              const isReserved = reservedCabinIds.has(cabin.id);
              return (
                <button
                  key={cabin.id}
                  type="button"
                  ref={(el) => {
                    cardRefs.current[cabin.id] = el;
                  }}
                  onClick={() => openCabin(cabin as unknown as ExpandCabin)}
                  className="group relative block w-full text-start rounded-2xl overflow-hidden bg-card card-shadow card-lift hover:card-lift-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  {/* Cover image */}
                  <div className="relative overflow-hidden">
                    <PlankPhoto
                      src={cabinCover(cabin.slug, cabin.photos)}
                      alt={cabin.name}
                      imgClassName="aspect-[3/2] transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    {/* Reserved badge */}
                    {isReserved && (
                      <div className="absolute top-3 left-3 z-10 rounded-full bg-destructive px-3 py-1 text-[11px] font-medium text-destructive-foreground shadow">
                        {t("cabin.reserved")}
                      </div>
                    )}
                    {/* Capacity badge */}
                    <div className="absolute top-3 right-3 z-10 rounded-full bg-background/80 backdrop-blur px-3 py-1 text-[11px] text-foreground/80">
                      {t("cabin.capacity", { n: cabin.capacity })}
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4">
                    <h3 className="text-lg text-primary">
                      {lang === "ar" ? cabin.name_ar : cabin.name}
                    </h3>

                    {/* Pricing row */}
                    <dl className="mt-3 flex gap-6 border-t border-border/60 pt-3">
                      <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          {t("slot.half_day")}
                        </dt>
                        <dd className="num mt-0.5 text-base font-medium text-foreground">
                          {formatPrice(cabin.price_half_day, lang)}
                        </dd>
                        <dd className="text-[10px] text-muted-foreground">forfait</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          {t("slot.24h")}
                        </dt>
                        <dd className="num mt-0.5 text-base font-medium text-foreground">
                          {formatPrice(cabin.price_24h, lang)}
                        </dd>
                        <dd className="text-[10px] text-muted-foreground">{t("cabin.perPerson")}</dd>
                      </div>
                    </dl>

                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-coral group-hover:gap-2 transition-all">
                      {t("cabin.view")} →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {expanded ? (
        <CabinExpand
          cabin={expanded.cabin}
          origin={expanded.origin}
          onClose={() => setExpanded(null)}
        />
      ) : null}

      <SiteFooter />

    </div>
  );
}
