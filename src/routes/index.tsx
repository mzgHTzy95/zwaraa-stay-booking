import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState, useMemo } from "react";
import { format, addMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, formatPrice } from "@/lib/i18n";
import { SiteHeader, SiteFooter } from "@/components/site/chrome";
import { CabinExpand } from "@/components/site/cabin-expand";
import type { ExpandCabin, OriginRect } from "@/components/site/cabin-expand";
import { cabinCover, heroLagoon } from "@/lib/images";
import { ArrowRight, Lock, MapPinned, Sparkles, TreePine, Users, Waves } from "lucide-react";

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

  // Use the first cabin's photo for the small overlapping feature image,
  // falling back to the hero shot while cabins are loading / if none exist.
  const firstCabin = cabins?.[0];
  const featureSmallImg = firstCabin
    ? cabinCover(firstCabin.slug, firstCabin.photos)
    : heroLagoon;

  return (
    <div className="min-h-screen">
      <div className="page-frame">
        <div className="hero-card">
          <img src={heroLagoon} alt="Lagoon" className="hero-img" />
          <div className="hero-overlay" />
          <SiteHeader variant="hero" />

          <div className="hero-content">
            <div className="hero-badge">
              <span className="dot" />
              {t("brand.location")}
            </div>
            <h1>{t("hero.title")}</h1>
            <p className="sub">{t("hero.text")}</p>
          </div>
          {/* Quick jump pill */}
          <div className="search-pill">
             <div className="search-field">
              <span className="ic"><MapPinned /></span>
               <div className="txt">
                 <div className="lbl">Destination</div>
                 <div className="val">{t("brand.name")}</div>
               </div>
             </div>
             <a href="#cabins" className="btn-cta self-center">{t("hero.cta")}</a>
          </div>
        </div>
      </div>

      <section className="story">
        <div className="wrap story-inner">
           <div>
             <h2>Une immersion totale dans la nature tunisienne</h2>
             <div className="story-stats">
                <div>
                   <div className="stat-num">4</div>
                   <div className="stat-label">Bungalows</div>
                </div>
                <div>
                   <div className="stat-num">360°</div>
                   <div className="stat-label">Vue lagune</div>
                </div>
             </div>
           </div>
           <div className="story-body">
              <p>Situé à Nefza, au nord-ouest de la Tunisie, Zwaraa offre une expérience unique : dormir dans un bungalow sur pilotis, directement sur l'eau.</p>
              <p>Que ce soit pour une demi-journée ou une nuit complète, chaque séjour inclut des repas locaux et des balades en barque pour découvrir la beauté sauvage de la région.</p>
           </div>
        </div>
      </section>

      <section id="cabins" className="cabins">
        <div className="wrap">
          <div className="section-head">
            <h2>{t("cabins.title")}</h2>
            <div className="see-all">{t("cabins.subtitle")}</div>
          </div>
          
          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">{t("common.loading")}</div>
          ) : (
            <div className="cabin-grid">
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
                    className="cabin-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <div className="cabin-photo">
                      <img src={cabinCover(cabin.slug, cabin.photos)} alt={cabin.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                      <div className="roof-chip" />
                      {isReserved && (
                        <div className="fav-btn text-destructive shadow" title={t("cabin.reserved")}>
                          <Lock size={14} />
                        </div>
                      )}
                    </div>
                    
                    <div className="cabin-body">
                      <h3>{lang === "ar" ? cabin.name_ar : cabin.name}</h3>
                      <div className="cabin-meta">
                         <span><Users size={14} /> {t("cabin.capacity", { n: cabin.capacity })}</span>
                         <span><Sparkles size={14} /> Vue sur l'eau</span>
                      </div>
                      <div className="cabin-prices">
                         <div className="price-block">
                            <div className="price-label">{t("slot.24h")}</div>
                            <div className="price-val num">{formatPrice(cabin.price_24h, lang)} <span>/pers.</span></div>
                         </div>
                         <div className="cabin-details-btn inline-flex items-center gap-1.5">
                            {t("cabin.view")} <ArrowRight size={14} />
                         </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="feature">
        <div className="wrap feature-inner">
          <div className="feature-list">
            <h2>Ce qui rend Zwaraa unique</h2>
            <div className="feature-item">
              <h4>Un lieu, pas une chaîne</h4>
              <p>Chaque bungalow est construit à la main par des habitants de Nefza — pas deux ne sont tout à fait identiques.</p>
            </div>
            <div className="feature-item">
              <h4>Eau douce naturelle</h4>
              <p>Le lagon est alimenté par des sources de montagne, entre le fleuve et la Méditerranée.</p>
            </div>
            <div className="feature-item">
              <h4>Tout est inclus</h4>
              <p>Repas et balade en bateau accompagnent chaque réservation, sans supplément caché.</p>
            </div>
            <div className="feature-item">
              <h4>Paiement simple et sûr</h4>
              <p>Réservez et payez en ligne en quelques minutes, confirmation immédiate.</p>
            </div>
          </div>
          <div className="feature-media">
            <div className="fmedia-main">
              <img src={heroLagoon} alt="Bungalows sur le lagon" />
            </div>
            <div className="fmedia-small">
              <img src={featureSmallImg} alt="Détail du lagon" />
            </div>
            <div className="fchip top"><span className="ic">🌲</span> Collines de Béja</div>
            <div className="fchip bottom"><span className="ic">🌊</span> Source d'eau douce</div>
          </div>
        </div>
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