import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { format, addMonths } from "date-fns";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { createReservation, getBookedSlots, payReservation } from "@/lib/booking.functions";
import { useI18n, formatPrice } from "@/lib/i18n";
import { SiteHeader, SiteFooter } from "@/components/site/chrome";
import { Calendar } from "@/components/ui/calendar";

const searchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slot: z.enum(["half_day", "24h"]).optional(),
});

export const Route = createFileRoute("/book/$slug")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Réserver un bungalow — Zwaraa" },
      {
        name: "description",
        content: "Choisissez votre date et votre créneau, puis finalisez votre réservation à Zwaraa.",
      },
      { property: "og:title", content: "Réserver un bungalow — Zwaraa" },
      { property: "og:description", content: "Réservation en ligne des bungalows de Zwaraa, Nefza." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BookingFlow,
});

const guestSchema = z.object({
  cin: z.string().trim().min(4, "CIN").max(20),
  fullName: z.string().trim().min(3).max(120),
  phone: z.string().trim().min(6).max(25),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guestsCount: z.number().int().min(1).max(20),
});

type Guest = z.infer<typeof guestSchema>;

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary";

function BookingFlow() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date | undefined>(
    search.date ? new Date(`${search.date}T00:00:00`) : undefined,
  );
  const [slot, setSlot] = useState<"half_day" | "24h">(search.slot ?? "half_day");
  const [nights, setNights] = useState(1);

  const [guest, setGuest] = useState<Guest>({
    cin: "",
    fullName: "",
    phone: "",
    dateOfBirth: "",
    guestsCount: 2,
  });
  const [reservation, setReservation] = useState<{ id: string; reference: string; total: number } | null>(
    null,
  );
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [processing, setProcessing] = useState(false);

  const fetchBooked = useServerFn(getBookedSlots);
  const create = useServerFn(createReservation);
  const pay = useServerFn(payReservation);

  const { data: cabin } = useQuery({
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

  if (!cabin) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="mx-auto max-w-3xl px-5 py-20 text-sm text-muted-foreground">
          {t("common.loading")}
        </p>
      </div>
    );
  }

  const dateKey = date ? format(date, "yyyy-MM-dd") : null;
  const effectiveNights = slot === "24h" ? nights : 1;
  const unitPrice = Number(slot === "half_day" ? cabin.price_half_day : cabin.price_24h);
  const price =
    slot === "half_day" ? unitPrice : unitPrice * guest.guestsCount * effectiveNights;

  const stayDays = (start: string, count: number) => {
    const base = new Date(`${start}T00:00:00Z`).getTime();
    return Array.from({ length: count }, (_, i) =>
      new Date(base + i * 86400000).toISOString().slice(0, 10),
    );
  };
  const isRangeTaken = (start: string | null, s: "half_day" | "24h", count: number) =>
    !!start &&
    stayDays(start, count).some((d) => (booked ?? []).some((b) => b.date === d && b.slot === s));

  const taken = isRangeTaken(dateKey, slot, effectiveNights);
  const cabinName = lang === "ar" ? cabin.name_ar : cabin.name;
  const included = lang === "ar" ? cabin.included_package_ar : cabin.included_package;


  const submitGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = guestSchema.safeParse(guest);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t("common.error"));
      return;
    }
    if (guest.guestsCount > cabin.capacity) {
      toast.error(t("cabin.capacity", { n: cabin.capacity }));
      return;
    }
    setStep(3);
  };

  const confirm = async () => {
    if (!dateKey) return;
    const result = await create({
      data: { cabinId: cabin.id, date: dateKey, slot, nights: effectiveNights, ...guest },
    });

    if (!result.ok) {
      toast.error(result.reason === "taken" ? t("book.taken") : t("common.error"));
      if (result.reason === "taken") setStep(1);
      return;
    }
    setReservation({ id: result.id, reference: result.reference, total: result.total });
    setStep(4);
  };

  const doPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservation) return;
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1600));
    try {
      await pay({ data: { reservationId: reservation.id, cardNumber: card.number || "0000000000000000" } });
      navigate({ to: "/receipt/$reference", params: { reference: reservation.reference } });
    } catch {
      setProcessing(false);
      toast.error(t("common.error"));
    }
  };

  const steps = [t("book.step1"), t("book.step2"), t("book.step3"), t("book.step4")];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-5 pt-10">
        <Link
          to="/cabins/$slug"
          params={{ slug }}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          ← {cabinName}
        </Link>
        <h1 className="mt-3 text-3xl text-primary">{t("book.title")}</h1>

        <ol className="num mt-6 flex flex-wrap gap-x-5 gap-y-2 border-y border-border py-3 text-[11px] uppercase tracking-wider">
          {steps.map((label, i) => (
            <li
              key={label}
              className={i + 1 === step ? "text-coral" : "text-muted-foreground"}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        {step === 1 && (
          <section className="mt-8">
            <div className="border border-border bg-card p-2">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={{ before: new Date() }}
                className="pointer-events-auto"
              />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(["half_day", "24h"] as const).map((s) => {
                const active = slot === s;
                const p = Number(s === "half_day" ? cabin.price_half_day : cabin.price_24h);
                const busy = isRangeTaken(dateKey, s, s === "24h" ? nights : 1);
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={busy}
                    onClick={() => setSlot(s)}
                    className={[
                      "border px-4 py-4 text-start transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      active ? "border-coral bg-coral/10" : "border-border bg-card hover:border-primary",
                    ].join(" ")}
                  >
                    <span className="block text-sm text-primary">{t(`slot.${s}`)}</span>
                    <span className="num mt-1 block text-base">{formatPrice(p, lang)}</span>
                    {s === "24h" ? (
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {t("cabin.perPerson")}
                      </span>
                    ) : null}
                    {busy ? (
                      <span className="mt-1 block text-[11px] text-destructive">
                        {t("cabin.unavailable")}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {slot === "24h" ? (
              <div className="mt-5 border border-border bg-card p-4">
                <Field label={t("book.nights")}>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    className={`${inputClass} num`}
                    value={nights}
                    onChange={(e) =>
                      setNights(Math.min(30, Math.max(1, Number(e.target.value) || 1)))
                    }
                  />
                </Field>
                <p className="mt-2 text-[11px] text-muted-foreground">{t("book.nightsNote")}</p>
              </div>
            ) : null}

            <button
              type="button"
              disabled={!dateKey || taken}
              onClick={() => setStep(2)}
              className="mt-6 w-full bg-coral px-4 py-3 text-sm font-medium text-coral-foreground disabled:bg-muted disabled:text-muted-foreground"
            >
              {t("book.continue")}
            </button>
          </section>
        )}

        {step === 2 && (
          <form onSubmit={submitGuest} className="mt-8 space-y-5">
            <Field label={t("book.cin")}>
              <input
                className={inputClass}
                value={guest.cin}
                maxLength={20}
                onChange={(e) => setGuest({ ...guest, cin: e.target.value })}
                required
              />
            </Field>
            <Field label={t("book.fullName")}>
              <input
                className={inputClass}
                value={guest.fullName}
                maxLength={120}
                onChange={(e) => setGuest({ ...guest, fullName: e.target.value })}
                required
              />
            </Field>
            <Field label={t("book.phone")}>
              <input
                className={`${inputClass} num`}
                value={guest.phone}
                maxLength={25}
                onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
                required
              />
            </Field>
            <Field label={t("book.dob")}>
              <input
                type="date"
                className={`${inputClass} num`}
                value={guest.dateOfBirth}
                onChange={(e) => setGuest({ ...guest, dateOfBirth: e.target.value })}
                required
              />
            </Field>
            <Field label={t("book.guests")}>
              <input
                type="number"
                min={1}
                max={cabin.capacity}
                className={`${inputClass} num`}
                value={guest.guestsCount}
                onChange={(e) => setGuest({ ...guest, guestsCount: Number(e.target.value) })}
                required
              />
            </Field>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="border border-input px-4 py-3 text-sm"
              >
                {t("book.back")}
              </button>
              <button
                type="submit"
                className="flex-1 bg-coral px-4 py-3 text-sm font-medium text-coral-foreground"
              >
                {t("book.continue")}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <section className="mt-8">
            <h2 className="text-xl text-primary">{t("book.review")}</h2>
            <dl className="mt-5 divide-y divide-border border-y border-border text-sm">
              <Row label={t("book.cabin")} value={cabinName} />
              <Row label={t("book.date")} value={dateKey ?? ""} mono />
              <Row label={t("book.slot")} value={t(`slot.${slot}`)} />
              <Row label={t("book.guest")} value={guest.fullName} />
              <Row label="CIN" value={guest.cin} mono />
              <Row label={t("book.phone")} value={guest.phone} mono />
              <Row label={t("book.guests")} value={String(guest.guestsCount)} mono />
            </dl>
            <div className="mt-5 border border-border bg-card p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("cabin.included")}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {included.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-[7px] block h-[5px] w-[5px] shrink-0 bg-amber" />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-5 flex items-baseline justify-between border-t-2 border-primary pt-3">
              <span className="text-sm uppercase tracking-wider text-muted-foreground">
                {t("book.total")}
              </span>
              <span className="num text-2xl text-primary">{formatPrice(price, lang)}</span>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="border border-input px-4 py-3 text-sm"
              >
                {t("book.back")}
              </button>
              <button
                type="button"
                onClick={confirm}
                className="flex-1 bg-coral px-4 py-3 text-sm font-medium text-coral-foreground"
              >
                {t("book.confirmPay")}
              </button>
            </div>
          </section>
        )}

        {step === 4 && reservation && (
          <section className="mt-8">
            <h2 className="text-xl text-primary">{t("book.payment")}</h2>
            <p className="mt-2 text-xs text-muted-foreground">{t("book.paymentNote")}</p>

            {processing ? (
              <div className="mt-12 flex flex-col items-center gap-4 py-16">
                <span className="block h-8 w-8 animate-spin rounded-full border-2 border-border border-t-coral" />
                <p className="num text-xs uppercase tracking-widest text-muted-foreground">
                  {t("book.processing")}
                </p>
              </div>
            ) : (
              <form onSubmit={doPay} className="mt-6 space-y-5">
                <Field label={t("book.cardNumber")}>
                  <input
                    className={`${inputClass} num`}
                    inputMode="numeric"
                    placeholder="4242 4242 4242 4242"
                    value={card.number}
                    onChange={(e) => setCard({ ...card, number: e.target.value })}
                    required
                  />
                </Field>
                <Field label={t("book.cardName")}>
                  <input
                    className={inputClass}
                    value={card.name}
                    onChange={(e) => setCard({ ...card, name: e.target.value })}
                    required
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label={t("book.expiry")}>
                    <input
                      className={`${inputClass} num`}
                      placeholder="MM/AA"
                      value={card.expiry}
                      onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                      required
                    />
                  </Field>
                  <Field label={t("book.cvv")}>
                    <input
                      className={`${inputClass} num`}
                      placeholder="123"
                      value={card.cvv}
                      onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                      required
                    />
                  </Field>
                </div>
                <button
                  type="submit"
                  className="w-full bg-coral px-4 py-3 text-sm font-medium text-coral-foreground"
                >
                  {t("book.pay", { amount: formatPrice(reservation.total, lang) })}
                </button>
              </form>
            )}
          </section>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={mono ? "num text-sm" : "text-sm"}>{value}</dd>
    </div>
  );
}
