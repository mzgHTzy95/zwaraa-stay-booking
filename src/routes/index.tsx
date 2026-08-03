import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
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

function Home() {
  const { t, lang } = useI18n();
  const { data: cabins, isLoading } = useCabins();

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto max-w-5xl px-5 pt-10 sm:pt-16">
        <p className="num text-xs uppercase tracking-[0.22em] text-forest">
          {t("brand.location")}
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl leading-tight text-primary sm:text-6xl">
          {t("hero.title")}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground/80">
          {t("hero.text")}
        </p>
        <a
          href="#cabins"
          className="mt-7 inline-block bg-coral px-6 py-3 text-sm font-medium text-coral-foreground transition-colors hover:bg-coral/90"
        >
          {t("hero.cta")}
        </a>

        <PlankPhoto
          src={heroLagoon}
          alt="Bungalows blancs à toit corail sur pilotis au-dessus de la lagune de Nefza"
          className="mt-10"
          imgClassName="aspect-[16/9]"
          priority
          width={1920}
          height={1080}
        />
      </section>

      <WaveDivider />

      <section id="cabins" className="mx-auto max-w-5xl px-5">
        <SectionTitle kicker={t("nav.cabins")}>{t("cabins.title")}</SectionTitle>
        <p className="mt-3 text-sm text-muted-foreground">{t("cabins.subtitle")}</p>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="mt-10 grid gap-10 sm:grid-cols-2">
            {(cabins ?? []).map((cabin) => (
              <Link
                key={cabin.id}
                to="/cabins/$slug"
                params={{ slug: cabin.slug }}
                className="group block"
              >
                <PlankPhoto
                  src={cabinCover(cabin.slug, cabin.photos)}
                  alt={cabin.name}
                  imgClassName="aspect-[3/2] transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <h3 className="mt-4 text-xl text-primary">
                  {lang === "ar" ? cabin.name_ar : cabin.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("cabin.capacity", { n: cabin.capacity })}
                </p>
                <dl className="mt-4 flex gap-8 border-t border-border pt-3">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("slot.half_day")}
                    </dt>
                    <dd className="num mt-1 text-base text-foreground">
                      {formatPrice(cabin.price_half_day, lang)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("slot.24h")}
                    </dt>
                    <dd className="num mt-1 text-base text-foreground">
                      {formatPrice(cabin.price_24h, lang)}
                    </dd>
                  </div>
                </dl>
                <span className="mt-3 inline-block text-xs text-coral underline underline-offset-4">
                  {t("cabin.view")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
