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
        <p className="mx-auto max-w-5xl px-5 py-20 text-sm text-muted-foreground">
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

  const goBook = (slot: "half_day" | "24h") => {
    navigate({
      to: "/book/$slug",
      params: { slug: cabin.slug },
      search: { date: dateKey ?? undefined, slot },
    });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <article className="mx-auto max-w-5xl px-5 pt-10">
        <Link to="/" className="text-xs text-muted-foreground hover:text-primary">
          ← {t("nav.cabins")}
        </Link>
        <h1 className="mt-4 text-4xl text-primary sm:text-5xl">
          {lang === "ar" ? cabin.name_ar : cabin.name}
        </h1>
        <p className="num mt-2 text-xs uppercase tracking-[0.18em] text-forest">
          {t("cabin.capacity", { n: cabin.capacity })}
        </p>

        <PlankPhoto
          src={photos[0]!}
          alt={cabin.name}
          className="mt-8"
          imgClassName="aspect-[16/9]"
          priority
        />
        <div className="mt-4 grid grid-cols-3 gap-4">
          {photos.slice(1, 4).map((p, i) => (
            <PlankPhoto key={i} src={p} alt={`${cabin.name} — ${i + 2}`} imgClassName="aspect-[4/3]" />
          ))}
        </div>

        <p className="mt-10 max-w-2xl text-base leading-relaxed text-foreground/85">
          {lang === "ar" ? cabin.description_ar : cabin.description}
        </p>

        <WaveDivider />

        <section className="grid gap-8 sm:grid-cols-2">
          <div>
            <h2 className="text-2xl text-primary">{t("cabin.included")}</h2>
            <ul className="mt-5 space-y-3">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-[6px] block h-[6px] w-[6px] shrink-0 bg-amber" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <PackList />
        </section>


        <WaveDivider />

        <section className="grid gap-10 sm:grid-cols-[auto_1fr]">
          <div>
            <h2 className="text-2xl text-primary">{t("cabin.checkAvailability")}</h2>
            <p className="mt-2 text-xs text-muted-foreground">{t("cabin.pickDate")}</p>
            <div className="mt-4 border border-border bg-card p-2">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={[{ before: new Date() }, ...fullyBookedDays]}
                className="pointer-events-auto"
              />
            </div>
          </div>

          <div className="space-y-4 self-start">
            {(["half_day", "24h"] as const).map((slot) => {
              const taken = isTaken(slot);
              const price = slot === "half_day" ? cabin.price_half_day : cabin.price_24h;
              return (
                <div key={slot} className="border border-border bg-card p-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-lg text-primary">{t(`slot.${slot}`)}</h3>
                    <span className="num text-lg">{formatPrice(price, lang)}</span>
                  </div>
                  {slot === "24h" ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">{t("cabin.perPerson")}</p>
                  ) : null}

                  {dateKey ? (
                    <p
                      className={
                        taken
                          ? "num mt-2 text-xs text-destructive"
                          : "num mt-2 text-xs text-forest"
                      }
                    >
                      {dateKey} — {taken ? t("cabin.unavailable") : t("cabin.available")}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("book.selectSlotFirst")}
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={taken}
                    onClick={() => goBook(slot)}
                    className="mt-4 w-full bg-coral px-4 py-3 text-sm font-medium text-coral-foreground transition-colors hover:bg-coral/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                  >
                    {t("cabin.reserve")}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </article>

      <SiteFooter />
    </div>
  );
}
