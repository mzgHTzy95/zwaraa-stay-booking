import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, formatPrice } from "@/lib/i18n";
import { SiteHeader, SiteFooter } from "@/components/site/chrome";
import { CabinExpand } from "@/components/site/cabin-expand";
import { AvailabilitySearch } from "@/components/site/availability-search";
import { useParallax } from "@/hooks/use-parallax";

import type { ExpandCabin, OriginRect } from "@/components/site/cabin-expand";
import {
  cabinCover,
  galleryBoat,
  galleryInterior,
  heroLagoon,
} from "@/lib/images";
import {
  ArrowRight,
  Camera,
  MapPinned,
  Sparkles,
  TreePine,
  Users,
  Waves,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zwaraa — Bungalows sur pilotis, lagune de Nefza" },
      {
        name: "description",
        content:
          "Réservez un bungalow sur l'eau à Zwaraa, Nefza : demi-journée ou 24 heures, repas et tour en barque compris.",
      },
      {
        property: "og:title",
        content: "Zwaraa — Bungalows sur pilotis, lagune de Nefza",
      },
      {
        property: "og:description",
        content:
          "Demi-journée ou 24 heures au-dessus de la lagune de Nefza, en Tunisie.",
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

function GalleryTeaser() {
  const { t } = useI18n();
  return (
    <section className="feature">
      <div className="wrap feature-inner">
        <div className="feature-list">
          <h2>{t("home.galleryTeaser.title")}</h2>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            {t("home.galleryTeaser.body")}
          </p>
          <Link
            to="/gallery"
            className="btn-pill btn-coral mt-6 inline-flex w-fit items-center gap-2 py-3 px-6"
          >
            {t("home.galleryTeaser.cta")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="feature-media">
          <div className="fmedia-main">
            <img src={galleryBoat} alt="Balade en barque sur la lagune" />
          </div>
          <div className="fmedia-small">
            <img src={galleryInterior} alt="Intérieur d'un bungalow" />
          </div>
          <div className="fchip top">
            <span className="ic text-primary">
              <Waves size={15} />
            </span>
            {t("home.galleryTeaser.chipBoat")}
          </div>
          <div className="fchip bottom">
            <span className="ic text-coral">
              <Camera size={15} />
            </span>
            {t("home.galleryTeaser.chipInterior")}
          </div>
        </div>
      </div>
    </section>
  );
}

function Home() {
  const { t, lang } = useI18n();
  const { data: cabins, isLoading } = useCabins();
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [expanded, setExpanded] = useState<{
    cabin: ExpandCabin;
    origin: OriginRect;
  } | null>(null);
  const heroImageRef = useParallax(0.5);

  const openCabin = (cabin: ExpandCabin) => {
    const el = cardRefs.current[cabin.id];
    const r = el?.getBoundingClientRect();
    setExpanded({
      cabin,
      origin: r
        ? { top: r.top, left: r.left, width: r.width, height: r.height }
        : {
            top: window.innerHeight / 2,
            left: window.innerWidth / 2,
            width: 0,
            height: 0,
          },
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
          <img
            ref={heroImageRef}
            src={heroLagoon}
            alt="Lagoon"
            className="hero-img"
          />
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
              <span className="ic">
                <MapPinned />
              </span>
              <div className="txt">
                <div className="lbl">Destination</div>
                <div className="val">{t("brand.name")}</div>
              </div>
            </div>
            <a href="#search" className="btn-cta self-center">
              {t("hero.cta")}
            </a>
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
            <p>
              Situé à Nefza, au nord-ouest de la Tunisie, Zwaraa offre une
              expérience unique : dormir dans un bungalow sur pilotis,
              directement sur l'eau.
            </p>
            <p>
              Que ce soit pour une demi-journée ou une nuit complète, chaque
              séjour inclut des repas locaux et des balades en barque pour
              découvrir la beauté sauvage de la région.
            </p>
          </div>
        </div>
      </section>

      <AvailabilitySearch />

      <section id="cabins" className="cabins">
        <div className="wrap">
          <div className="section-head">
            <h2>{t("cabins.title")}</h2>
            <div className="see-all">{t("gallery.note")}</div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : (
            <div className="cabin-grid">
              {(cabins ?? []).map((cabin) => {
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
                      <img
                        src={cabinCover(cabin.slug, cabin.photos)}
                        alt={cabin.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                      <div className="roof-chip" />
                    </div>

                    <div className="cabin-body">
                      <h3>{lang === "ar" ? cabin.name_ar : cabin.name}</h3>
                      <div className="cabin-meta">
                        <span>
                          <Users size={14} />{" "}
                          {t("cabin.capacity", { n: cabin.capacity })}
                        </span>
                        <span>
                          <Sparkles size={14} /> Vue sur l'eau
                        </span>
                      </div>
                      <div className="cabin-prices">
                        <div className="price-block">
                          <div className="price-label">{t("slot.24h")}</div>
                          <div className="price-val num">
                            {formatPrice(cabin.price_24h, lang)}{" "}
                            <span>/pers.</span>
                          </div>
                        </div>
                        <div className="cabin-details-btn inline-flex items-center gap-1.5">
                          {t("cabin.viewPhotos")} <ArrowRight size={14} />
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
              <p>
                Chaque bungalow est construit à la main par des habitants de
                Nefza — pas deux ne sont tout à fait identiques.
              </p>
            </div>
            <div className="feature-item">
              <h4>Eau douce naturelle</h4>
              <p>
                Le lagon est alimenté par des sources de montagne, entre le
                fleuve et la Méditerranée.
              </p>
            </div>
            <div className="feature-item">
              <h4>Tout est inclus</h4>
              <p>
                Repas et balade en bateau accompagnent chaque réservation, sans
                supplément caché.
              </p>
            </div>
            <div className="feature-item">
              <h4>Paiement simple et sûr</h4>
              <p>
                Réservez et payez en ligne en quelques minutes, confirmation
                immédiate.
              </p>
            </div>
          </div>
          <div className="feature-media">
            <div className="fmedia-main">
              <img src={heroLagoon} alt="Bungalows sur le lagon" />
            </div>
            <div className="fmedia-small">
              <img src={featureSmallImg} alt="Détail du lagon" />
            </div>
            <div className="fchip top">
              <span className="ic text-forest">
                <TreePine size={15} />
              </span>{" "}
              Collines de Béja
            </div>
            <div className="fchip bottom">
              <span className="ic text-primary">
                <Waves size={15} />
              </span>{" "}
              Source d'eau douce
            </div>
          </div>
        </div>
      </section>

      <GalleryTeaser />

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
