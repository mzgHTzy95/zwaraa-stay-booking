import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { SiteHeader, SiteFooter } from "@/components/site/chrome";
import { cabinGallery, heroLagoon } from "@/lib/images";
import { Lightbox, type LightboxPhoto } from "@/components/site/lightbox";
import { BlurImage } from "@/components/site/blur-image";
import { useInView } from "@/hooks/use-in-view";
import { ArrowRight, Play, Quote, Star, Utensils, Waves } from "lucide-react";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Galerie — Zwaraa, Nefza" },
      {
        name: "description",
        content:
          "Découvrez en images et en vidéo les bungalows, les activités, les repas et la nature de Zwaraa dans la lagune de Nefza, Tunisie.",
      },
      { property: "og:title", content: "Galerie — Zwaraa, Nefza" },
      {
        property: "og:description",
        content: "Photos et vidéos des bungalows, activités et paysages de Zwaraa, Tunisie.",
      },
    ],
  }),
  component: Gallery,
});

type TileSize = "small" | "wide" | "tall" | "large";
type Category = "bungalow" | "activity" | "food" | "nature";

type MediaItem = LightboxPhoto & {
  kind: "media";
  category: Category;
  gridThumb: string;
  blurSrc?: string | null;
  size: TileSize;
};

type ContentTile = {
  kind: "content";
  id: string;
  variant: "about" | "included" | "testimonial";
  size: TileSize;
};

type GridTile = MediaItem | ContentTile;

const SIZE_CLASSES: Record<TileSize, string> = {
  small: "col-span-1 row-span-1",
  wide: "col-span-2 row-span-1",
  tall: "col-span-1 row-span-2",
  large: "col-span-2 row-span-2",
};

const CATEGORIES: Category[] = ["bungalow", "activity", "food", "nature"];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Assigns sizes to media tiles only, walking the already-shuffled sequence
// so "large" tiles (including the About/Included content cards) stay spaced
// out instead of clustering.
function assignMediaSizes(tiles: (Omit<MediaItem, "size"> | ContentTile)[]): GridTile[] {
  let sinceLastBig = 0;
  return tiles.map((tile) => {
    sinceLastBig++;
    if (tile.kind === "content") {
      if (tile.size === "large") sinceLastBig = 0;
      return tile;
    }
    const pool: TileSize[] = ["small", "small", "small", "wide", "tall"];
    if (sinceLastBig >= 4) pool.push("large");
    const size = pool[Math.floor(Math.random() * pool.length)];
    if (size === "large") sinceLastBig = 0;
    return { ...tile, size };
  });
}

function MediaTile({ item, index, onOpen }: { item: MediaItem; index: number; onOpen: () => void }) {
  const { ref, inView } = useInView<HTMLButtonElement>();

  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-label={item.caption ? `${item.categoryLabel} — ${item.caption}` : item.categoryLabel}
      className={[
        "group relative block w-full overflow-hidden rounded-xl text-left transition-all duration-700",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        SIZE_CLASSES[item.size],
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      ].join(" ")}
      style={{ transitionDelay: inView ? `${(index % 6) * 70}ms` : "0ms" }}
    >
      <BlurImage
        src={item.gridThumb}
        blurSrc={item.blurSrc}
        alt={item.alt}
        loading={index < 6 ? "eager" : "lazy"}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      {item.mediaType === "video" && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-foreground shadow-soft transition-transform duration-300 group-hover:scale-110">
            <Play className="h-5 w-5" fill="currentColor" />
          </span>
        </span>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground">
          {item.categoryLabel}
        </span>
        {item.caption && (
          <span className="truncate text-xs font-medium text-white">{item.caption}</span>
        )}
      </div>
    </button>
  );
}

function AboutTile({ size }: { size: TileSize }) {
  const { t } = useI18n();
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={[
        SIZE_CLASSES[size],
        "flex flex-col justify-center rounded-xl border border-border bg-card p-5 transition-all duration-700",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      ].join(" ")}
    >
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
        <Waves className="h-3.5 w-3.5" />
        {t("gallery.about.kicker")}
      </span>
      <h2 className="mt-2 text-xl text-primary leading-snug">{t("gallery.about.title")}</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-4">
        {t("gallery.about.body")}
      </p>
      <div className="mt-3 flex gap-5">
        <div>
          <p className="num text-xl text-coral">360°</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("gallery.about.statLagoon")}
          </p>
        </div>
        <div>
          <p className="num text-xl text-primary">4</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t("gallery.about.statBungalows")}
          </p>
        </div>
      </div>
    </div>
  );
}

function IncludedTile({ size }: { size: TileSize }) {
  const { t } = useI18n();
  const { ref, inView } = useInView<HTMLDivElement>();
  const rows = ["meals", "boat", "lagoon", "booking"] as const;
  return (
    <div
      ref={ref}
      className={[
        SIZE_CLASSES[size],
        "flex flex-col justify-center rounded-xl border border-border bg-card p-5 transition-all duration-700",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Utensils className="h-3.5 w-3.5 text-coral" />
        <h2 className="text-sm font-medium text-foreground">{t("gallery.included.title")}</h2>
      </div>
      <ul className="space-y-1.5">
        {rows.map((key) => (
          <li key={key} className="text-xs text-muted-foreground leading-snug">
            <span className="font-medium text-foreground">{t(`gallery.included.${key}.title`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TestimonialTile({
  size,
  authorName,
  authorLocation,
  rating,
  quote,
}: {
  size: TileSize;
  authorName: string;
  authorLocation?: string | null;
  rating?: number | null;
  quote: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={[
        SIZE_CLASSES[size],
        "flex flex-col justify-center rounded-xl border border-coral/25 bg-coral/5 p-5 transition-all duration-700",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      ].join(" ")}
    >
      <Quote className="h-4 w-4 text-coral mb-2" />
      <p className="text-xs leading-relaxed text-foreground line-clamp-4">{quote}</p>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-foreground">
          {authorName}
          {authorLocation ? ` — ${authorLocation}` : ""}
        </p>
        {!!rating && (
          <div className="flex gap-0.5">
            {Array.from({ length: rating }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-amber text-amber" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StickyReserveButton({ hidden }: { hidden: boolean }) {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const visible = scrolled && !hidden;

  return (
    <Link
      to="/book"
      className={[
        "fixed bottom-5 inset-x-0 z-40 mx-auto w-fit transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none",
      ].join(" ")}
    >
      <span className="btn-pill btn-coral inline-flex items-center gap-2 py-2.5 px-5 text-sm shadow-soft">
        {t("cabin.reserve")} <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

function Gallery() {
  const { t, lang } = useI18n();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { data: cabins, isLoading: cabinsLoading } = useQuery({
    queryKey: ["cabins-gallery"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cabins")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: extraPhotos, isLoading: photosLoading } = useQuery({
    queryKey: ["gallery-photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_photos")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: testimonials, isLoading: testimonialsLoading } = useQuery({
    queryKey: ["testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading = cabinsLoading || photosLoading || testimonialsLoading;
  const categoryLabel = (category: Category) => t(`gallery.category.${category}`);

  const mediaRaw = useMemo<Omit<MediaItem, "size">[]>(() => {
    const bungalowItems = (cabins ?? []).flatMap((cabin) => {
      const name = lang === "ar" ? cabin.name_ar : cabin.name;
      return cabinGallery(cabin.slug, cabin.photos).map((src: string, i: number) => ({
        kind: "media" as const,
        id: `cabin-${cabin.id}-${i}`,
        src,
        gridThumb: src,
        thumbSrc: src,
        blurSrc: null,
        alt: `${name} — ${i + 1}`,
        caption: name,
        category: "bungalow" as const,
        mediaType: "image" as const,
        categoryLabel: categoryLabel("bungalow"),
        bookingHref: `/book?cabin=${cabin.slug}`,
      }));
    });

    const extra = (extraPhotos ?? [])
      .filter((photo) => photo.category !== "bungalow")
      .map((photo) => {
        const alt = lang === "ar" ? photo.alt_ar : photo.alt_fr;
        const mediaType = (photo.media_type as "image" | "video") ?? "image";
        const gridThumb =
          mediaType === "video"
            ? photo.poster_url || photo.image_url
            : photo.thumb_url || photo.image_url;
        const category = photo.category as Category;
        return {
          kind: "media" as const,
          id: `photo-${photo.id}`,
          src: photo.image_url,
          gridThumb,
          thumbSrc: gridThumb,
          blurSrc: photo.blur_data_url ?? null,
          alt: alt || "",
          caption: alt || undefined,
          category,
          mediaType,
          categoryLabel: categoryLabel(category),
        };
      });

    return [...bungalowItems, ...extra];
  }, [cabins, extraPhotos, lang]);

  const contentTilesRaw = useMemo<ContentTile[]>(() => {
    const tiles: ContentTile[] = [
      { kind: "content", id: "content-about", variant: "about", size: "large" },
      { kind: "content", id: "content-included", variant: "included", size: "large" },
    ];
    (testimonials ?? []).forEach((tItem) => {
      tiles.push({ kind: "content", id: `testimonial-${tItem.id}`, variant: "testimonial", size: "wide" });
    });
    return tiles;
  }, [testimonials]);

  // Shuffle + size once per page visit, cached until the underlying data changes.
  const dataKey = [
    mediaRaw.map((m) => m.id).join(","),
    contentTilesRaw.map((c) => c.id).join(","),
  ].join("|");
  const cacheRef = useRef<{ key: string; order: GridTile[] } | null>(null);
  const gridTiles = useMemo<GridTile[]>(() => {
    if (cacheRef.current && cacheRef.current.key === dataKey) {
      return cacheRef.current.order;
    }
    const merged = shuffle([...mediaRaw, ...contentTilesRaw]);
    const sized = assignMediaSizes(merged);
    cacheRef.current = { key: dataKey, order: sized };
    return sized;
  }, [mediaRaw, contentTilesRaw, dataKey]);

  const lightboxPhotos = useMemo(
    () => gridTiles.filter((t): t is MediaItem => t.kind === "media"),
    [gridTiles]
  );

  const testimonialById = useMemo(() => {
    const map = new Map<string, (typeof testimonials extends (infer U)[] | undefined ? U : never)>();
    (testimonials ?? []).forEach((tItem) => map.set(tItem.id, tItem));
    return map;
  }, [testimonials]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero band — full-bleed photo */}
      <div className="relative h-85 sm:h-105 overflow-hidden">
        <img
          src={heroLagoon}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/35 to-foreground/10" />
        <div className="relative z-10 flex h-full items-end">
          <div className="max-w-5xl pb-10 m-auto mb-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              <Waves className="h-3.5 w-3.5" />
              {t("gallery.about.kicker")}
            </span>
            <h1 className="mt-3 text-3xl sm:text-4xl text-white">{t("gallery.title")}</h1>
            <p className="mt-2 text-sm text-white/85 max-w-xl">{t("gallery.subtitle")}</p>
          </div>
        </div>
      </div>

      <div className="page-frame pb-24">
        <div className="wrap max-w-5xl pt-10">
          {isLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <span className="block h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          ) : gridTiles.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{t("common.error")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[150px] [grid-auto-flow:dense] sm:auto-rows-[170px]">
              {(() => {
                let mediaCursor = -1;
                return gridTiles.map((tile, i) => {
                  if (tile.kind === "media") {
                    mediaCursor++;
                    const lightboxIndex = mediaCursor;
                    return (
                      <MediaTile
                        key={tile.id}
                        item={tile}
                        index={i}
                        onOpen={() => setActiveIndex(lightboxIndex)}
                      />
                    );
                  }
                  if (tile.variant === "about") return <AboutTile key={tile.id} size={tile.size} />;
                  if (tile.variant === "included") return <IncludedTile key={tile.id} size={tile.size} />;
                  const testimonialId = tile.id.replace("testimonial-", "");
                  const data = testimonialById.get(testimonialId);
                  if (!data) return null;
                  return (
                    <TestimonialTile
                      key={tile.id}
                      size={tile.size}
                      authorName={data.author_name}
                      authorLocation={data.author_location}
                      rating={data.rating}
                      quote={lang === "ar" ? data.quote_ar : data.quote_fr}
                    />
                  );
                });
              })()}
            </div>
          )}

          {/* CTA */}
          <div className="mt-16 rounded-2xl border border-coral/30 bg-coral/5 p-8 text-center">
            <h2 className="text-2xl text-primary">{t("cabins.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{t("gallery.note")}</p>
            <Link to="/book" className="btn-pill btn-coral mt-6 inline-flex items-center gap-2 py-3 px-6">
              {t("cabin.reserve")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <Lightbox
        photos={lightboxPhotos}
        index={activeIndex}
        onClose={() => setActiveIndex(null)}
        onNavigate={setActiveIndex}
      />

      <StickyReserveButton hidden={activeIndex !== null} />

      <SiteFooter />
    </div>
  );
}