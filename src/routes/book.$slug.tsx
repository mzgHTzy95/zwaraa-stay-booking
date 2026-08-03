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
import { PackList } from "@/components/site/pack";


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
type PayMethod = "card" | "d17" | "bank" | "cash";

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
  "w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

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
  const [payMethod, setPayMethod] = useState<PayMethod>("card");

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
  const [d17Phone, setD17Phone] = useState("");
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
        <div className="flex min-h-[50vh] items-center justify-center">
          <span className="block h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      </div>
    );
  }

  const dateKey = date ? format(date, "yyyy-MM-dd") : null;
  const effectiveNights = slot === "24h" ? nights : 1;
  const unitPrice = Number(slot === "half_day" ? cabin.price_half_day : cabin.price_24h);
  // Demi-journée = flat price (no multiplier). 24h = per person × nights.
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
      await pay({ data: { reservationId: reservation.id, cardNumber: card.number || d17Phone || "SIMULATED" } });
      navigate({ to: "/receipt/$reference", params: { reference: reservation.reference } });
    } catch {
      setProcessing(false);
      toast.error(t("common.error"));
    }
  };

  const steps = [t("book.step1"), t("book.step2"), t("book.step3"), t("book.step4")];

  const PAY_METHODS: { id: PayMethod; icon: string; label: string }[] = [
    { id: "card", icon: "💳", label: t("book.payMethod.card") },
    { id: "d17", icon: "📱", label: t("book.payMethod.d17") },
    { id: "bank", icon: "🏦", label: t("book.payMethod.bank") },
    { id: "cash", icon: "💵", label: t("book.payMethod.cash") },
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-5 pt-10 pb-20">
        <Link
          to="/cabins/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          ← {cabinName}
        </Link>
        <h1 className="mt-3 text-3xl text-primary">{t("book.title")}</h1>

        {/* Step indicator */}
        <ol className="num mt-6 flex flex-wrap gap-x-2 gap-y-2 py-3 text-[11px]">
          {steps.map((label, i) => (
            <li
              key={label}
              className={[
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors",
                i + 1 === step
                  ? "bg-coral text-coral-foreground"
                  : i + 1 < step
                  ? "bg-forest/15 text-forest"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px]">
                {i + 1 < step ? "✓" : i + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>

        {/* ── STEP 1: Date & slot ── */}
        {step === 1 && (
          <section className="mt-8 animate-rise">
            <div className="rounded-2xl border border-border bg-card p-3 card-shadow">
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
                      "rounded-xl border px-5 py-4 text-start transition-all disabled:cursor-not-allowed disabled:opacity-50",
                      active
                        ? "border-coral bg-coral/8 ring-2 ring-coral/30"
                        : "border-border bg-card hover:border-primary card-shadow",
                    ].join(" ")}
                  >
                    <span className="block text-sm font-medium text-primary">{t(`slot.${s}`)}</span>
                    <span className="num mt-1 block text-lg font-semibold">{formatPrice(p, lang)}</span>
                    {s === "24h" ? (
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {t("cabin.perPerson")}
                      </span>
                    ) : (
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        forfait
                      </span>
                    )}
                    {busy ? (
                      <span className="mt-1.5 inline-block rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
                        {t("cabin.unavailable")}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {slot === "24h" ? (
              <div className="mt-5 rounded-2xl border border-border bg-card p-5 card-shadow">
                <div className="grid gap-5 sm:grid-cols-2">
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
                  <Field label={t("book.guests")}>
                    <input
                      type="number"
                      min={1}
                      max={cabin.capacity}
                      className={`${inputClass} num`}
                      value={guest.guestsCount}
                      onChange={(e) =>
                        setGuest({ ...guest, guestsCount: Number(e.target.value) })
                      }
                    />
                  </Field>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">{t("book.nightsNote")}</p>
                {/* Live price preview */}
                <div className="mt-4 flex items-baseline justify-between rounded-xl bg-primary/5 px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    {t("book.priceDetail", {
                      price: formatPrice(unitPrice, lang),
                      guests: guest.guestsCount,
                      nights: effectiveNights,
                    })}
                  </span>
                  <span className="num text-xl font-semibold text-primary">{formatPrice(price, lang)}</span>
                </div>
              </div>
            ) : (
              dateKey && (
                <div className="mt-4 flex items-baseline justify-between rounded-xl bg-primary/5 px-4 py-3">
                  <span className="text-xs text-muted-foreground">Forfait demi-journée</span>
                  <span className="num text-xl font-semibold text-primary">{formatPrice(unitPrice, lang)}</span>
                </div>
              )
            )}

            <button
              type="button"
              disabled={!dateKey || taken}
              onClick={() => setStep(2)}
              className="mt-6 w-full rounded-xl bg-coral px-4 py-3.5 text-sm font-medium text-coral-foreground transition-all hover:bg-coral/90 disabled:bg-muted disabled:text-muted-foreground"
            >
              {t("book.continue")}
            </button>
          </section>
        )}

        {/* ── STEP 2: Guest info ── */}
        {step === 2 && (
          <form onSubmit={submitGuest} className="mt-8 animate-rise">
            <div className="space-y-5 rounded-2xl border border-border bg-card p-6 card-shadow">
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
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-input px-5 py-3 text-sm hover:border-primary transition-colors"
              >
                {t("book.back")}
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-coral px-4 py-3.5 text-sm font-medium text-coral-foreground hover:bg-coral/90 transition-all"
              >
                {t("book.continue")}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3: Review ── */}
        {step === 3 && (
          <section className="mt-8 animate-rise">
            <h2 className="text-xl text-primary">{t("book.review")}</h2>
            <div className="mt-5 rounded-2xl border border-border bg-card card-shadow overflow-hidden">
              <dl className="divide-y divide-border text-sm">
                <Row label={t("book.cabin")} value={cabinName} />
                <Row label={t("book.date")} value={dateKey ?? ""} mono />
                <Row label={t("book.slot")} value={t(`slot.${slot}`)} />
                {slot === "24h" ? (
                  <Row label={t("book.nights")} value={t("book.nightsValue", { n: nights })} mono />
                ) : null}
                <Row label={t("book.guest")} value={guest.fullName} />
                <Row label="CIN" value={guest.cin} mono />
                <Row label={t("book.phone")} value={guest.phone} mono />
                <Row label={t("book.guests")} value={String(guest.guestsCount)} mono />
              </dl>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-4 card-shadow">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("cabin.included")}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {included.map((i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
              {slot === "24h" ? <PackList /> : null}
            </div>

            {/* Total */}
            <div className="mt-5 flex items-baseline justify-between rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4">
              <div>
                <span className="text-sm uppercase tracking-wider text-muted-foreground">
                  {t("book.total")}
                </span>
                {slot === "24h" ? (
                  <span className="num mt-1 block text-[11px] text-muted-foreground">
                    {t("book.priceDetail", {
                      price: formatPrice(unitPrice, lang),
                      guests: guest.guestsCount,
                      nights: effectiveNights,
                    })}
                  </span>
                ) : (
                  <span className="mt-1 block text-[11px] text-muted-foreground">Forfait demi-journée</span>
                )}
              </div>
              <span className="num text-2xl font-semibold text-primary">{formatPrice(price, lang)}</span>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl border border-input px-5 py-3 text-sm hover:border-primary transition-colors"
              >
                {t("book.back")}
              </button>
              <button
                type="button"
                onClick={confirm}
                className="flex-1 rounded-xl bg-coral px-4 py-3.5 text-sm font-medium text-coral-foreground hover:bg-coral/90 transition-all"
              >
                {t("book.confirmPay")}
              </button>
            </div>
          </section>
        )}

        {/* ── STEP 4: Payment ── */}
        {step === 4 && reservation && (
          <section className="mt-8 animate-rise">
            <h2 className="text-xl text-primary">{t("book.payment")}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{t("book.paymentNote")}</p>

            {/* Amount reminder */}
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3">
              <span className="text-sm text-muted-foreground">{t("book.total")}</span>
              <span className="num text-xl font-semibold text-primary">
                {formatPrice(reservation.total, lang)}
              </span>
            </div>

            {processing ? (
              <div className="mt-12 flex flex-col items-center gap-4 py-16">
                <span className="block h-10 w-10 animate-spin rounded-full border-2 border-border border-t-coral" />
                <p className="num text-xs uppercase tracking-widest text-muted-foreground">
                  {t("book.processing")}
                </p>
              </div>
            ) : (
              <form onSubmit={doPay} className="mt-6 space-y-5">
                {/* Payment method selector */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {PAY_METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayMethod(m.id)}
                      className={[
                        "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs transition-all",
                        payMethod === m.id
                          ? "border-coral bg-coral/8 ring-2 ring-coral/30 text-primary font-medium"
                          : "border-border bg-card hover:border-primary text-muted-foreground",
                      ].join(" ")}
                    >
                      <span className="text-2xl">{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Method-specific fields */}
                <div className="rounded-2xl border border-border bg-card p-5 card-shadow animate-fade">
                  {payMethod === "card" && (
                    <div className="space-y-4">
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
                            maxLength={4}
                            value={card.cvv}
                            onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                            required
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  {payMethod === "d17" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 rounded-xl bg-amber/10 p-3">
                        <span className="text-2xl">📱</span>
                        <p className="text-sm text-foreground/80">
                          Saisissez votre numéro D17 pour confirmer le paiement simulé.
                        </p>
                      </div>
                      <Field label={t("book.payMethod.d17Phone")}>
                        <input
                          className={`${inputClass} num`}
                          inputMode="tel"
                          placeholder="XX XXX XXX"
                          value={d17Phone}
                          onChange={(e) => setD17Phone(e.target.value)}
                          required
                        />
                      </Field>
                    </div>
                  )}

                  {payMethod === "bank" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 rounded-xl bg-primary/8 p-3">
                        <span className="text-2xl">🏦</span>
                        <p className="text-sm text-foreground/80">
                          {t("book.payMethod.bankNote")}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-secondary p-3">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Référence à indiquer</p>
                        <p className="num text-sm font-semibold text-primary">{reservation.reference}</p>
                      </div>
                    </div>
                  )}

                  {payMethod === "cash" && (
                    <div className="flex items-center gap-3 rounded-xl bg-forest/8 p-4">
                      <span className="text-3xl">💵</span>
                      <p className="text-sm text-foreground/80">
                        {t("book.payMethod.cashNote")}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-coral px-4 py-3.5 text-sm font-medium text-coral-foreground hover:bg-coral/90 transition-all"
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
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={mono ? "num text-sm" : "text-sm"}>{value}</dd>
    </div>
  );
}
