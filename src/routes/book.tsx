import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { format, addMonths } from "date-fns";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  Home,
  IdCard,
  Landmark,
  Lock,
  Moon,
  Smartphone,
  Sun,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createReservation, getBookedSlots, payReservation } from "@/lib/booking.functions";
import { useI18n, formatPrice } from "@/lib/i18n";
import { SiteHeader, SiteFooter } from "@/components/site/chrome";
import { Calendar } from "@/components/ui/calendar";
import { PackList } from "@/components/site/pack";


const searchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slot: z.enum(["half_day", "24h"]).optional(),
  guests: z.number().int().optional(),
  nights: z.number().int().optional(),
});


export const Route = createFileRoute("/book")({
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
  cin: z.string().trim().regex(/^\d{8}$/, "cin"),
  fullName: z.string().trim().min(3).max(120),
  phone: z.string().trim().regex(/^\d{8,12}$/, "phone"),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "dob")
    .refine((v) => new Date(v) <= new Date(), { message: "dob-future" }),
  guestsCount: z.number().int().min(1).max(20),
});

type Guest = z.infer<typeof guestSchema>;
type PayMethod = "card" | "d17" | "bank" | "cash";

const FIELD_ERROR_FR: Record<keyof Guest, string> = {
  cin: "CIN invalide — 8 chiffres attendus",
  fullName: "Nom complet requis (3 caractères minimum)",
  phone: "Numéro de téléphone invalide (8 à 12 chiffres)",
  dateOfBirth: "Date de naissance invalide",
  guestsCount: "Nombre de personnes invalide",
};

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

function onlyDigits(value: string, maxLen: number) {
  return value.replace(/\D/g, "").slice(0, maxLen);
}

function formatCardNumber(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 19);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string | undefined;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";
const inputErrorClass = "border-destructive focus:border-destructive focus:ring-destructive/20";

/** Small hand-drawn wave — the lagoon-edge motif, solid color, no alpha. */
function WaveDivider({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 24" className={className} fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0 12 C 40 0, 80 24, 120 12 S 200 0, 240 12 S 320 24, 360 12 S 400 0, 400 12"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Horizontal connected stepper — circles joined by a fill-line. */
function ConnectedStepper({ step, steps }: { step: number; steps: string[] }) {
  return (
    <ol className="mt-6 flex items-start" aria-label="Étapes de réservation">
      {steps.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "current" : "upcoming";
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                aria-current={state === "current" ? "step" : undefined}
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                  state === "done"
                    ? "bg-forest text-forest-foreground"
                    : state === "current"
                    ? "scale-110 bg-coral text-coral-foreground shadow-md"
                    : "border border-border bg-card text-muted-foreground",
                ].join(" ")}
              >
                {state === "done" ? <Check className="h-4 w-4" /> : n}
              </span>
              <span
                className={[
                  "num text-center text-[10px] leading-tight",
                  state === "upcoming" ? "text-muted-foreground" : "font-medium text-primary",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {n < steps.length && (
              <span
                aria-hidden="true"
                className={[
                  "mx-2 mt-4 h-0.5 flex-1 rounded-full transition-colors duration-500",
                  state === "done" ? "bg-forest" : "bg-border",
                ].join(" ")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Persistent booking summary — always visible so date / slot / price stay in view. */
function SummaryCard({
  cabin,
  cabinName,
  included,
  dateKey,
  slot,
  nights,
  guestsCount,
  price,
  t,
  lang,
}: {
  cabin: any;
  cabinName: string;
  included: string[];
  dateKey: string | null;
  slot: "half_day" | "24h";
  nights: number;
  guestsCount: number;
  price: number;
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: "fr" | "ar";
}) {
  const photo = cabin?.photos?.[0] as string | undefined;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card ">
      <div className="relative h-32 w-full overflow-hidden bg-primary">
        {photo ? (
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Home className="h-8 w-8 text-primary-foreground" />
          </div>
        )}
        <div
          aria-hidden="true"
          className="absolute left-4 top-3 h-0 w-0 border-x-[13px] border-b-[11px] border-x-transparent border-b-coral drop-shadow-sm"
        />
      </div>

      <div className="p-5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Récapitulatif</p>
        <p className="mt-1 text-base font-semibold text-primary">{cabinName}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{t("book.anyCabinNote")}</p>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span className="num font-medium text-primary">{dateKey ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Formule</span>
            <span className="text-end font-medium text-primary">
              {t(`slot.${slot}`)}
              <span className="num block text-[11px] font-normal text-muted-foreground">
                {slot === "half_day" ? t("slot.hoursHalf") : t("slot.hours24")}
              </span>
            </span>
          </div>
          {slot === "24h" ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("book.nights")}</span>
              <span className="num font-medium text-primary">{nights}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("book.guests")}</span>
            <span className="num font-medium text-primary">{guestsCount}</span>
          </div>
        </div>

        {included?.length ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {included.slice(0, 3).map((item) => (
              <span
                key={item}
                className="inline-flex items-center rounded-full bg-forest px-2.5 py-1 text-[11px] font-medium text-forest-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-5 border-t border-dashed border-border pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-muted-foreground">{t("book.total")}</span>
            <span className="num text-2xl font-semibold text-primary">
              {dateKey ? formatPrice(price, lang) : "—"}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-1.5 border-t border-border pt-4 text-[11px] text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Paiement simulé — aucune charge réelle
          </p>
          <p className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Confirmation immédiate après paiement
          </p>
        </div>
      </div>
    </div>
  );
}

function BookingFlow() {
  const search = Route.useSearch();
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [date, setDate] = useState<Date | undefined>(
    search.date ? new Date(`${search.date}T00:00:00`) : undefined,
  );
  const [slot, setSlot] = useState<"half_day" | "24h">(search.slot ?? "half_day");
  const [nights, setNights] = useState(Math.min(30, Math.max(1, search.nights ?? 1)));
  const [payMethod, setPayMethod] = useState<PayMethod>("card");

  const [guest, setGuest] = useState<Guest>({
    cin: "",
    fullName: "",
    phone: "",
    dateOfBirth: "",
    guestsCount: Math.max(1, search.guests ?? 2),
  });

  const [errors, setErrors] = useState<Partial<Record<keyof Guest, string>>>({});
  const [reservation, setReservation] = useState<{ id: string; reference: string; total: number } | null>(
    null,
  );
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [d17Phone, setD17Phone] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchBooked = useServerFn(getBookedSlots);
  const create = useServerFn(createReservation);
  const pay = useServerFn(payReservation);

  const { data: cabins } = useQuery({
    queryKey: ["cabins", "active"],
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

  const fleetMaxCapacity = Math.max(1, ...(cabins ?? []).map((c) => Number(c.capacity)));
  const cabin =
    (cabins ?? []).find((c) => Number(c.capacity) >= guest.guestsCount) ?? (cabins ?? [])[0] ?? null;


  const range = useMemo(() => {
    const from = new Date();
    return { from: format(from, "yyyy-MM-dd"), to: format(addMonths(from, 6), "yyyy-MM-dd") };
  }, []);

  const { data: booked } = useQuery({
    queryKey: ["booked-all"],
    queryFn: () => fetchBooked({ data: { from: range.from, to: range.to } }),
  });

  const stepRef = useRef<HTMLElement | HTMLFormElement>(null);
  useEffect(() => {
    stepRef.current?.focus();
  }, [step]);

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
  const price =
    slot === "half_day"
      ? unitPrice * guest.guestsCount
      : unitPrice * guest.guestsCount * effectiveNights;


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
  const cabinName = t("book.anyCabin");
  const included = lang === "ar" ? cabin.included_package_ar : cabin.included_package;

  function updateGuest<K extends keyof Guest>(key: K, value: Guest[K]) {
    setGuest((g) => ({ ...g, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }

  const submitGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = guestSchema.safeParse(guest);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof Guest, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Guest;
        if (key && !fieldErrors[key]) fieldErrors[key] = FIELD_ERROR_FR[key];
      }
      setErrors(fieldErrors);
      toast.error(t("common.error"));
      return;
    }
    if (guest.guestsCount > fleetMaxCapacity) {
      setErrors((prev) => ({ ...prev, guestsCount: t("cabin.capacity", { n: fleetMaxCapacity }) }));
      toast.error(t("cabin.capacity", { n: fleetMaxCapacity }));
      return;
    }
    setErrors({});
    setStep(3);
  };

  const confirm = async () => {
    if (!dateKey) return;
    const result = await create({
      data: { date: dateKey, slot, nights: effectiveNights, ...guest },
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

  const PAY_METHODS: { id: PayMethod; Icon: typeof CreditCard; label: string }[] = [
    // { id: "card", Icon: CreditCard, label: t("book.payMethod.card") },
    { id: "d17", Icon: Smartphone, label: t("book.payMethod.d17") },
    // { id: "bank", Icon: Landmark, label: t("book.payMethod.bank") },
    { id: "cash", Icon: Banknote, label: t("book.payMethod.cash") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="page-frame pb-24 mb-25">
        <div className="wrap max-w-5xl pt-8">
          {/* Mini booking-context bar */}
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 ">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                {cabin.photos?.[0] ? (
                  <img src={cabin.photos[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Home className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vous réservez</p>
                <p className="truncate text-sm font-medium text-primary">{cabinName}</p>
              </div>
            </div>
            <Link
              to="/"
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Modifier <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <h1 className="text-3xl text-primary">{t("book.title")}</h1>
            <WaveDivider className="h-4 w-16 text-coral" />
          </div>

          <ConnectedStepper step={step} steps={steps} />

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <aside className="order-2 h-fit lg:sticky lg:top-24">
              <SummaryCard
                cabin={cabin}
                cabinName={cabinName}
                included={included ?? []}
                dateKey={dateKey}
                slot={slot}
                nights={effectiveNights}
                guestsCount={guest.guestsCount}
                price={price}
                t={t}
                lang={lang}
              />
            </aside>

            <div className="order-1">
              {/* ── STEP 1: Date & slot ── */}
              {step === 1 && (
                <section ref={stepRef as React.RefObject<HTMLElement>} tabIndex={-1} className="animate-rise outline-none">
                  <h2 className="sr-only">{t("book.step1")}</h2>

                  <div className="rounded-2xl border border-border bg-card p-3 ">
                    <div className="mb-2 flex items-center gap-2 px-2 pt-1">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">Choisissez une date</span>
                    </div>
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
                      const SlotIcon = s === "half_day" ? Sun : Moon;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={busy}
                          aria-pressed={active}
                          onClick={() => setSlot(s)}
                          className={[
                            "relative rounded-xl border px-5 py-4 text-start transition-all disabled:cursor-not-allowed disabled:opacity-50",
                            active
                              ? "border-coral bg-coral text-coral-foreground shadow-md"
                              : "border-border bg-card text-primary",
                          ].join(" ")}
                        >
                          {active && (
                            <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-card">
                              <Check className="h-3.5 w-3.5 text-coral" />
                            </span>
                          )}
                          <SlotIcon className="h-5 w-5" />
                          <span className="mt-2 block text-sm font-medium">{t(`slot.${s}`)}</span>
                          <span className={["num block text-[11px]", active ? "opacity-85" : "text-muted-foreground"].join(" ")}>
                            {s === "half_day" ? t("slot.hoursHalf") : t("slot.hours24")}
                          </span>
                          <span className="num mt-1 block text-lg font-semibold">{formatPrice(p, lang)}</span>
                          <span className={["mt-0.5 block text-[11px]", active ? "" : "text-muted-foreground"].join(" ")}>
                            {s === "24h" ? t("cabin.perPerson") : t("cabin.perPersonHalf")}
                          </span>
                          {busy ? (
                            <span className="mt-1.5 inline-block rounded-full bg-destructive px-2 py-0.5 text-[11px] font-medium text-destructive-foreground">
                              {t("cabin.unavailable")}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 rounded-2xl border border-border bg-card p-5 ">
                    <div className="grid gap-5 sm:grid-cols-2">
                      {slot === "24h" ? (
                        <Field label={t("book.nights")}>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            className={`${inputClass} num`}
                            value={nights}
                            onChange={(e) => setNights(clamp(Number(e.target.value), 1, 30))}
                          />
                        </Field>
                      ) : null}
                      <Field label={t("book.guests")}>
                        <input
                          type="number"
                          min={1}
                          max={fleetMaxCapacity}
                          className={`${inputClass} num`}
                          value={guest.guestsCount}
                          onChange={(e) =>
                            updateGuest("guestsCount", clamp(Number(e.target.value), 1, fleetMaxCapacity))
                          }
                        />
                      </Field>
                    </div>
                    {slot === "24h" ? (
                      <p className="mt-3 text-[11px] text-muted-foreground">{t("book.nightsNote")}</p>
                    ) : null}
                  </div>


                  <button
                    type="button"
                    disabled={!dateKey || taken}
                    onClick={() => setStep(2)}
                    className="mt-6 flex w-full items-center justify-center gap-2 btn-pill btn-coral py-4 text-base disabled:pointer-events-none disabled:opacity-50"
                  >
                    {t("book.continue")} <ArrowRight className="h-4 w-4" />
                  </button>
                </section>
              )}

              {/* ── STEP 2: Guest info ── */}
              {step === 2 && (
                <form
                  ref={stepRef as React.RefObject<HTMLFormElement>}
                  tabIndex={-1}
                  onSubmit={submitGuest}
                  className="animate-rise outline-none"
                  noValidate
                >
                  <h2 className="sr-only">{t("book.step2")}</h2>
                  <div className="rounded-2xl border border-border bg-card p-6 ">
                    <div className="mb-5 flex items-center gap-2">
                      <IdCard className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-primary">Vos informations</p>
                    </div>

                    <div className="space-y-5">
                      <Field label={t("book.fullName")} error={errors.fullName}>
                        <input
                          className={[inputClass, errors.fullName ? inputErrorClass : ""].join(" ")}
                          value={guest.fullName}
                          maxLength={120}
                          autoComplete="name"
                          onChange={(e) => updateGuest("fullName", e.target.value)}
                          aria-invalid={!!errors.fullName}
                          required
                        />
                      </Field>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label={t("book.cin")} error={errors.cin}>
                          <input
                            className={[inputClass, "num", errors.cin ? inputErrorClass : ""].join(" ")}
                            value={guest.cin}
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="12345678"
                            maxLength={8}
                            onChange={(e) => updateGuest("cin", onlyDigits(e.target.value, 8))}
                            aria-invalid={!!errors.cin}
                            required
                          />
                        </Field>
                        <Field label={t("book.phone")} error={errors.phone}>
                          <input
                            className={[inputClass, "num", errors.phone ? inputErrorClass : ""].join(" ")}
                            value={guest.phone}
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="22334455"
                            maxLength={12}
                            onChange={(e) => updateGuest("phone", onlyDigits(e.target.value, 12))}
                            aria-invalid={!!errors.phone}
                            required
                          />
                        </Field>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label={t("book.dob")} error={errors.dateOfBirth}>
                          <input
                            type="date"
                            className={[inputClass, "num", errors.dateOfBirth ? inputErrorClass : ""].join(" ")}
                            value={guest.dateOfBirth}
                            max={format(new Date(), "yyyy-MM-dd")}
                            autoComplete="bday"
                            onChange={(e) => updateGuest("dateOfBirth", e.target.value)}
                            aria-invalid={!!errors.dateOfBirth}
                            required
                          />
                        </Field>
                        <Field label={t("book.guests")} error={errors.guestsCount}>
                          <input
                            type="number"
                            min={1}
                            max={fleetMaxCapacity}
                            className={[inputClass, "num", errors.guestsCount ? inputErrorClass : ""].join(" ")}
                            value={guest.guestsCount}
                            onChange={(e) =>
                              updateGuest("guestsCount", clamp(Number(e.target.value), 1, fleetMaxCapacity))
                            }
                            aria-invalid={!!errors.guestsCount}
                            required
                          />
                        </Field>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-4">
                    <button type="button" onClick={() => setStep(1)} className="btn-outline-pill flex flex-1 items-center justify-center gap-2">
                      <ArrowLeft className="h-4 w-4" /> {t("book.back")}
                    </button>
                    <button type="submit" className="btn-pill btn-coral flex flex-1 items-center justify-center gap-2">
                      {t("book.continue")} <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* ── STEP 3: Review ── */}
              {step === 3 && (
                <section ref={stepRef as React.RefObject<HTMLElement>} tabIndex={-1} className="animate-rise outline-none">
                  <h2 className="text-xl text-primary">{t("book.review")}</h2>

                  <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card ">
                    <div className="h-1.5 w-full" aria-hidden="true" />
                    <dl className="divide-y divide-border text-sm p-2">
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
                    <div className="rounded-xl border border-border bg-card p-8 ">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {t("cabin.included")}
                      </p>
                      <ul className="mt-3 space-y-2 pl-3 text-sm">
                        {included.map((i: string) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                            {i}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {slot === "24h" ? <PackList /> : null}
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-xl border border-coral bg-coral px-5 py-5 text-coral-foreground">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider">{t("book.total")}</span>
                      {slot === "24h" ? (
                        <span className="num mt-2 block text-[11px]">
                          {t("book.priceDetail", {
                            price: formatPrice(unitPrice, lang),
                            guests: guest.guestsCount,
                            nights: effectiveNights,
                          })}
                        </span>
                      ) : (
                        <span className="mt-2 block text-[11px]">Forfait demi-journée</span>
                      )}
                    </div>
                    <span className="num text-3xl font-semibold">{formatPrice(price, lang)}</span>
                  </div>

                  <div className="mt-8 flex gap-4">
                    <button type="button" onClick={() => setStep(2)} className="btn-outline-pill flex flex-1 items-center justify-center gap-2">
                      <ArrowLeft className="h-4 w-4" /> {t("book.back")}
                    </button>
                    <button type="button" onClick={confirm} className="btn-pill btn-coral flex-1">
                      {t("book.confirmPay")}
                    </button>
                  </div>
                </section>
              )}

              {/* ── STEP 4: Payment ── */}
              {step === 4 && reservation && (
                <section ref={stepRef as React.RefObject<HTMLElement>} tabIndex={-1} className="animate-rise outline-none">
                  <h2 className="text-xl text-primary">{t("book.payment")}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{t("book.paymentNote")}</p>

                  {processing ? (
                    <div className="mt-12 flex flex-col items-center gap-5 py-16" role="status" aria-live="polite">
                      <span className="block h-12 w-12 animate-spin rounded-full border-[3px] border-border border-t-coral" />
                      <p className="num text-xs uppercase tracking-widest text-muted-foreground">
                        {t("book.processing")}
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={doPay} className="mt-6 space-y-5">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {PAY_METHODS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            aria-pressed={payMethod === m.id}
                            onClick={() => setPayMethod(m.id)}
                            className={[
                              "flex flex-col items-center gap-1.5 rounded-md border p-3 text-center text-xs transition-all",
                              payMethod === m.id
                                ? "scale-[1.02] border-coral bg-coral text-coral-foreground font-medium shadow-md"
                                : "border-border bg-card text-muted-foreground",
                            ].join(" ")}
                          >
                            <m.Icon className="h-6 w-6" />
                            {m.label}
                          </button>
                        ))}
                      </div>

                      <div className="rounded-2xl border border-border bg-card p-5  animate-fade">
                        {payMethod === "card" && (
                          <div className="space-y-4">
                            <Field label={t("book.cardNumber")}>
                              <input
                                className={`${inputClass} num`}
                                inputMode="numeric"
                                autoComplete="cc-number"
                                placeholder="4242 4242 4242 4242"
                                maxLength={23}
                                value={card.number}
                                onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })}
                                required
                              />
                            </Field>
                            <Field label={t("book.cardName")}>
                              <input
                                className={inputClass}
                                value={card.name}
                                autoComplete="cc-name"
                                onChange={(e) => setCard({ ...card, name: e.target.value })}
                                required
                              />
                            </Field>
                            <div className="grid grid-cols-2 gap-4">
                              <Field label={t("book.expiry")}>
                                <input
                                  className={`${inputClass} num`}
                                  inputMode="numeric"
                                  autoComplete="cc-exp"
                                  placeholder="MM/AA"
                                  maxLength={5}
                                  value={card.expiry}
                                  onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                                  required
                                />
                              </Field>
                              <Field label={t("book.cvv")}>
                                <input
                                  className={`${inputClass} num`}
                                  inputMode="numeric"
                                  autoComplete="cc-csc"
                                  placeholder="123"
                                  maxLength={4}
                                  value={card.cvv}
                                  onChange={(e) => setCard({ ...card, cvv: onlyDigits(e.target.value, 4) })}
                                  required
                                />
                              </Field>
                            </div>
                          </div>
                        )}

                        {payMethod === "d17" && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 rounded-xl border border-border border-l-4 border-l-amber bg-muted p-3">
                              <Smartphone className="h-5 w-5 shrink-0 text-amber" />
                              <p className="text-sm text-foreground/80">
                                Saisissez votre numéro D17 pour confirmer le paiement simulé.
                              </p>
                            </div>
                            <Field label={t("book.payMethod.d17Phone")}>
                              <input
                                className={`${inputClass} num`}
                                inputMode="tel"
                                autoComplete="tel"
                                placeholder="XX XXX XXX"
                                maxLength={12}
                                value={d17Phone}
                                onChange={(e) => setD17Phone(onlyDigits(e.target.value, 12))}
                                required
                              />
                            </Field>
                          </div>
                        )}

                        {payMethod === "bank" && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 rounded-xl border border-border border-l-4 border-l-primary bg-muted p-3">
                              <Landmark className="h-5 w-5 shrink-0 text-primary" />
                              <p className="text-sm text-foreground/80">{t("book.payMethod.bankNote")}</p>
                            </div>
                            <div className="rounded-xl border border-border bg-secondary p-3">
                              <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                                Référence à indiquer
                              </p>
                              <p className="num text-sm font-semibold text-primary">{reservation.reference}</p>
                            </div>
                          </div>
                        )}

                        {payMethod === "cash" && (
                          <div className="flex items-center gap-3 rounded-xl border border-border border-l-4 border-l-forest bg-muted p-4">
                            <Banknote className="h-6 w-6 shrink-0 text-forest" />
                            <p className="text-sm text-foreground/80">{t("book.payMethod.cashNote")}</p>
                          </div>
                        )}
                      </div>

                      <button type="submit" className="mt-6 flex w-full items-center justify-center gap-2 btn-pill btn-coral py-4 text-base">
                        <Lock className="h-4 w-4" />
                        {t("book.pay", { amount: formatPrice(reservation.total, lang) })}
                      </button>
                    </form>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
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