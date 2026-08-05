import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format, addMonths } from "date-fns";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getBookedSlots } from "@/lib/booking.functions";
import { useI18n, formatPrice } from "@/lib/i18n";
import { SiteHeader, SiteFooter } from "@/components/site/chrome";
import { PlankPhoto, WaveDivider } from "@/components/site/ornaments";
import { cabinGallery } from "@/lib/images";
import { PackList } from "@/components/site/pack";
import { ArrowLeft, CalendarCheck, MapPin, Moon, Sun, Users } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";

export const Route = createFileRoute("/cabins/$slug")({
  head: () => ({
    meta: [
      { title: "Bungalow sur la lagune — Zwaraa, Nefza" },
      {
        name: "description",
        content:
          "Photos, capacité, formule incluse et tarifs demi-journée ou 24 heures de ce bungalow sur pilotis à Zwaraa.",
      },
      { property: "og:title", content: "Bungalow sur la lagune — Zwaraa, Nefza" },
      {
        property: "og:description",
        content: "Découvrez ce bungalow sur pilotis et réservez votre créneau.",
      },
    ],
  }),
  component: CabinDetail,
});

function CabinDetail() {
  const { slug } = Route.useParams();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>();
  const fetchBooked = useServerFn(getBookedSlots);

  const { data: cabin, isLoading } = useQuery({
    queryKey: ["cabin", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cabins")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const range = useMemo(() => {
    const from = new Date();
    return { from: format(from, "yyyy-MM-dd"), to: format(addMonths(from, 6), "yyyy-MM-dd") };
  }, []);

  const { data: booked } = useQuery({
    queryKey: ["booked", cabin?.id],
    enabled: !!cabin?.id,
    queryFn: () => fetchBooked({ data: { cabinId: cabin!.id, from: range.from, to: range.to } }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="mx-auto max-w-5xl mb-25 px-5 py-20 text-sm text-muted-foreground">
          {t("common.loading")}
        </p>
      </div>
    );
  }

  if (!cabin) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-5xl px-5 py-20">
          <p className="text-sm text-muted-foreground">404</p>
          <Link to="/" className="text-coral underline underline-offset-4">
            {t("receipt.home")}
          </Link>
        </div>
      </div>
    );
  }

  const dateKey = date ? format(date, "yyyy-MM-dd") : null;
  const isTaken = (slot: "half_day" | "24h") =>
    !!dateKey && (booked ?? []).some((b) => b.date === dateKey && b.slot === slot);
  const fullyBookedDays = (booked ?? [])
    .filter((b) => b.slot === "24h")
    .map((b) => new Date(`${b.date}T00:00:00`));

  const photos = cabinGallery(cabin.slug, cabin.photos);
  const included = lang === "ar" ? cabin.included_package_ar : cabin.included_package;




  return (
    <div className="min-h-screen">
      <SiteHeader />

      <div className="page-frame">
        <div className="mini-hero px-6 py-9 sm:px-12 sm:py-12">
          <div className="wrap max-w-5xl !px-0">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-white/75 transition-colors hover:text-white"
            >
              <ArrowLeft size={14} /> {t("nav.cabins")}
            </Link>
            <h1 className="mt-4 text-4xl text-white sm:text-5xl">
              {lang === "ar" ? cabin.name_ar : cabin.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs">
                <Users size={13} /> {t("cabin.capacity", { n: cabin.capacity })}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs">
                <MapPin size={13} /> Nefza, Béja
              </span>
              <span className="num inline-flex items-center gap-1.5 rounded-full bg-amber px-3 py-1.5 text-xs font-semibold text-amber-foreground">
                {formatPrice(cabin.price_24h, lang)} / 24 h
              </span>
            </div>
          </div>
        </div>
      </div>

      <article className="mx-auto max-w-5xl px-5 pt-10">
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

        <p className="mt-10 max-w-2xl text-base leading-relaxed text-foreground/85">
          {lang === "ar" ? cabin.description_ar : cabin.description}
        </p>

        <WaveDivider />

        <section className="grid gap-8 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 card-shadow">
            <h2 className="text-2xl text-primary">{t("cabin.included")}</h2>
            <ul className="mt-5 space-y-3">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <PackList />
        </section>


        <WaveDivider />

        {/* Gallery page: pricing is fleet-wide, booking happens from the search form */}
        <section className="rounded-2xl border border-border bg-card p-6 card-shadow">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <dl className="flex flex-wrap gap-10">
              <div>
                <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Sun size={13} className="text-amber" /> {t("slot.half_day")}
                </dt>
                <dd className="num mt-1 text-xl font-semibold">{formatPrice(cabin.price_half_day, lang)}</dd>
                <dd className="text-[11px] text-muted-foreground">{t("cabin.perPersonHalf")}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Moon size={13} className="text-primary" /> {t("slot.24h")}
                </dt>
                <dd className="num mt-1 text-xl font-semibold">{formatPrice(cabin.price_24h, lang)}</dd>
                <dd className="text-[11px] text-muted-foreground">{t("cabin.perPerson")}</dd>
              </div>
            </dl>
            <Link to="/" hash="search" className="btn-pill btn-coral inline-flex items-center gap-2 py-3.5">
              <CalendarCheck size={16} /> {t("search.cta")}
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{t("gallery.note")}</p>
        </section>
      </article>


      <SiteFooter />
    </div>
  );
}
