import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { format, addMonths } from "date-fns";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Home,
  IdCard,
  Landmark,
  Lock,
  MessageCircle,
  Minus,
  Moon,
  Phone,
  Plus,
  ShieldCheck,
  Smartphone,
  Sun,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createReservation, getBookedSlots, payReservation } from "@/lib/booking.functions";
import { useI18n, formatPrice } from "@/lib/i18n";
import { SiteHeader, SiteFooter } from "@/components/site/chrome";
import { Calendar } from "@/components/ui/calendar";
import { PackList } from "@/components/site/pack";
import { Lightbox, type LightboxPhoto } from "@/components/site/lightbox";
import { cabinGallery } from "@/lib/images";


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
  adults: z.number().int().min(1).max(20),
  children6_10: z.number().int().min(0).max(20),
  childrenUnder5: z.number().int().min(0).max(20),
});

type Guest = z.infer<typeof guestSchema>;
type PayMethod = "card" | "d17" | "bank" | "cash";

const FIELD_ERROR_FR: Record<keyof Guest, string> = {
  cin: "CIN invalide — 8 chiffres attendus",
  fullName: "Nom complet requis (3 caractères minimum)",
  phone: "Numéro de téléphone invalide (8 à 12 chiffres)",
  dateOfBirth: "Date de naissance invalide",
  adults: "Nombre d'adultes invalide",
  children6_10: "Nombre d'enfants 6–10 invalide",
  childrenUnder5: "Nombre d'enfants invalide",
};

const CHILDREN_6_10_PRICE = 50;

// Common countries for guests booking Zwaraa — Tunisia first as the default,
// then nearby Maghreb countries, then countries guests are likely to travel
// from. Add more entries here if you get bookings from elsewhere often.
const PHONE_COUNTRIES = [
  { code: "TN", name: "Tunisie", dial: "+216", flag: "🇹🇳", len: 8 },
  { code: "DZ", name: "Algérie", dial: "+213", flag: "🇩🇿", len: 9 },
  { code: "LY", name: "Libye", dial: "+218", flag: "🇱🇾", len: 9 },
  { code: "MA", name: "Maroc", dial: "+212", flag: "🇲🇦", len: 9 },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷", len: 9 },
  { code: "IT", name: "Italie", dial: "+39", flag: "🇮🇹", len: 10 },
  { code: "DE", name: "Allemagne", dial: "+49", flag: "🇩🇪", len: 10 },
  { code: "BE", name: "Belgique", dial: "+32", flag: "🇧🇪", len: 9 },
  { code: "CH", name: "Suisse", dial: "+41", flag: "🇨🇭", len: 9 },
  { code: "GB", name: "Royaume-Uni", dial: "+44", flag: "🇬🇧", len: 10 },
  { code: "ES", name: "Espagne", dial: "+34", flag: "🇪🇸", len: 9 },
  { code: "NL", name: "Pays-Bas", dial: "+31", flag: "🇳🇱", len: 9 },
  { code: "QA", name: "Qatar", dial: "+974", flag: "🇶🇦", len: 8 },
  { code: "AE", name: "Émirats arabes unis", dial: "+971", flag: "🇦🇪", len: 9 },
  { code: "SA", name: "Arabie saoudite", dial: "+966", flag: "🇸🇦", len: 9 },
  { code: "KW", name: "Koweït", dial: "+965", flag: "🇰🇼", len: 8 },
  { code: "EG", name: "Égypte", dial: "+20", flag: "🇪🇬", len: 10 },
  { code: "TR", name: "Turquie", dial: "+90", flag: "🇹🇷", len: 10 },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦", len: 10 },
  { code: "US", name: "États-Unis", dial: "+1", flag: "🇺🇸", len: 10 },
] as const;

const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0].dial; // Tunisia

// Real contact info — shown at Step 4 and in the payment trust signals.
const CONTACT_PHONE_DISPLAY = "+216 99 802 802";
const CONTACT_PHONE_TEL = "tel:+21699802802";
const CONTACT_WHATSAPP = "https://wa.me/21699802802";

function phoneLenForCountry(dial: string): number {
  return PHONE_COUNTRIES.find((c) => c.dial === dial)?.len ?? 12;
}

// --- Draft persistence (Step 1 & 2 data only — never card details) -------
// Uses sessionStorage (not localStorage) so it clears when the tab closes,
// while still surviving accidental refreshes or back/forward navigation.
const DRAFT_KEY = "zwaraa-booking-draft-v1";

type BookingDraft = {
  date: string | null; // ISO string
  slot: "half_day" | "24h";
  nights: number;
  phoneCountry: string;
  guest: Guest;
  step: number;
};

function loadDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as BookingDraft) : null;
  } catch {
    return null;
  }
}

function saveDraft(draft: BookingDraft) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage full/unavailable — silently skip, not critical */
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

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

/** Stepper control for a numeric count with +/- buttons */
function CountStepper({
  label,
  sublabel,
  value,
  min = 0,
  max = 20,
  onChange,
  highlight,
}: {
  label: string;
  sublabel?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  highlight?: "coral" | "amber";
}) {
  const colors = {
    coral: "bg-coral/10 border-coral/30 text-coral",
    amber: "bg-amber/10 border-amber/30 text-amber-foreground",
  };
  const col = highlight ? colors[highlight] : "";
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${col || "border-border bg-card"}`}>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sublabel && <p className="text-[11px] text-muted-foreground">{sublabel}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          aria-label="Diminuer"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:border-primary disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="num w-6 text-center text-lg font-semibold text-primary">{value}</span>
        <button
          type="button"
          aria-label="Augmenter"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-primary transition-colors hover:border-primary disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
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
    <div>
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
                {/* Text labels: only the current step's label shows on very
                    small screens (avoids 4 labels cramming into no space);
                    all labels show from sm breakpoint up. */}
                <span
                  className={[
                    "num text-center text-[10px] leading-tight",
                    state === "upcoming" ? "text-muted-foreground" : "font-medium text-primary",
                    state === "current" ? "block" : "hidden sm:block",
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
      <p className="mt-2 text-center text-xs text-muted-foreground sm:hidden">
        Étape {step}/{steps.length} — {steps[step - 1]}
      </p>
    </div>
  );
}

/** Persistent booking summary — always visible so date / slot / price stay in view.
 *  Mobile: compact by default (photo + key line + toggle), expands on tap.
 *  Desktop: always fully expanded (the toggle only exists below the lg breakpoint). */
function SummaryCard({
  cabin,
  cabinName,
  included,
  dateKey,
  slot,
  nights,
  adults,
  children6_10,
  childrenUnder5,
  t,
  lang,
}: {
  cabin: any;
  cabinName: string;
  included: string[];
  dateKey: string | null;
  slot: "half_day" | "24h";
  nights: number;
  adults: number;
  children6_10: number;
  childrenUnder5: number;
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: "fr" | "ar" | "en";
}) {
  const [expanded, setExpanded] = useState(false);
  const photos = cabin ? cabinGallery(cabin.slug, cabin.photos).filter(Boolean).slice(0, 3) : [];
  const cover = photos[0];
  const totalGuests = adults + children6_10 + childrenUnder5;
  const SlotIcon = slot === "half_day" ? Sun : Moon;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Compact header — always visible, doubles as the mobile toggle */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 p-3 text-start lg:pointer-events-none lg:cursor-default"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-primary">
          {cover ? (
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Home className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Récapitulatif</p>
          <p className="truncate text-sm font-semibold text-primary">{cabinName}</p>
          <p className="num flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            {dateKey ?? "—"} · {t(`slot.${slot}`)} · {totalGuests} <Users className="h-3 w-3" />
          </p>
        </div>
        <ChevronDown
          className={[
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform lg:hidden",
            expanded ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {/* Full details — hidden on mobile until expanded, always shown on desktop */}
      <div className={[expanded ? "block" : "hidden", "lg:block"].join(" ")}>
        {photos.length > 1 && (
          <div className="grid grid-cols-3 gap-1 px-3">
            {photos.map((src, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-lg">
                <img src={src} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="p-5 pt-4">
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t("book.anyCabinNote")}</p>

          <div className="mt-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" /> Date
              </span>
              <span className="num font-medium text-primary">{dateKey ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <SlotIcon className="h-3.5 w-3.5" /> Formule
              </span>
              <span className="text-end font-medium text-primary">
                {t(`slot.${slot}`)}
                <span className="num block text-[11px] font-normal text-muted-foreground">
                  {slot === "half_day" ? t("slot.hoursHalf") : t("slot.hours24")}
                </span>
              </span>
            </div>
            {slot === "24h" ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">{t("book.nights")}</span>
                <span className="num font-medium text-primary">{nights}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> {t("book.guests")}
              </span>
              <span className="num font-medium text-primary">{totalGuests}</span>
            </div>
            {children6_10 > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Enfants 6–10</span>
                <span className="num text-amber-foreground">{children6_10} × 50 DT</span>
              </div>
            )}
            {childrenUnder5 > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Enfants ≤5</span>
                <span className="num text-forest">Gratuit</span>
              </div>
            )}
          </div>

          {included?.length ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {included.slice(0, 4).map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center rounded-full bg-forest px-2.5 py-1 text-[11px] font-medium text-forest-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-5 space-y-1.5 border-t border-border pt-4 text-[11px] text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Paiement en espèces — à régler sur place
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirmation immédiate après réservation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Cloudflare Turnstile widget hook */
function useTurnstile(siteKey: string, disabled: boolean) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (disabled || !siteKey || typeof window === "undefined") return;

    const renderWidget = () => {
      const win = window as any;
      if (!win.turnstile || !containerRef.current) return;
      widgetIdRef.current = win.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        // Fully invisible unless Cloudflare genuinely can't verify silently
        // — no checkbox, no visible challenge, auto-verifies in background.
        appearance: "interaction-only",
        callback: (t: string) => { setToken(t); },
        "expired-callback": () => { setToken(""); },
        "error-callback": () => { setToken(""); },
      });
      setReady(true);
    };

    const existingScript = document.querySelector('script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]');
    if (existingScript) {
      const win = window as any;
      if (win.turnstile) renderWidget();
      else existingScript.addEventListener("load", renderWidget, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => { renderWidget(); setLoadError(null); };
    script.onerror = () => { setLoadError("Impossible de charger la vérification anti-bot."); };
    document.body.appendChild(script);
    return () => { script.onload = null; script.onerror = null; };
  }, [siteKey, disabled]);

  const reset = () => {
    const win = window as any;
    if (win.turnstile && widgetIdRef.current !== null) win.turnstile.reset(widgetIdRef.current);
    setToken("");
  };

  return { containerRef, token, ready, loadError, reset };
}

/** Photo showcase — shows the cabin's real photos + included-offer highlights
 *  so the booking flow isn't purely forms/text. Placed once, above the step
 *  content, using the cabin already resolved for this booking.
 *  IMPORTANT: uses cabinGallery() (same helper the rest of the app uses) so
 *  it always has photos to show — including bundled fallback images when the
 *  cabins.photos column is empty/null in the DB — instead of silently
 *  rendering nothing. */
function OfferShowcase({
  cabin,
  included,
  t,
}: {
  cabin: any;
  included: string[];
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  if (!cabin) return null;

  const photos: string[] = cabinGallery(cabin.slug, cabin.photos).filter(Boolean);
  if (photos.length === 0) return null;

  const [main, ...rest] = photos;
  const thumbs = rest.slice(0, 3);

  const lightboxPhotos: LightboxPhoto[] = photos.map((src, i) => ({
    id: `offer-photo-${i}`,
    src,
    alt: `Photo ${i + 1}`,
  }));

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setActiveIndex(0)}
          className="relative col-span-3 h-48 overflow-hidden sm:col-span-2 sm:h-56 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        >
          <img src={main} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
        </button>
        <div className="col-span-3 grid grid-cols-2 gap-1 sm:col-span-2 sm:grid-rows-2">
          {thumbs.length > 0 ? (
            thumbs.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i + 1)}
                className="relative h-16 overflow-hidden sm:h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
              </button>
            ))
          ) : (
            <button
              type="button"
              onClick={() => setActiveIndex(0)}
              className="relative col-span-3 h-16 overflow-hidden sm:h-full"
            >
              <img src={main} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </button>
          )}
          <Link
            to="/gallery"
            className="relative flex h-16 items-center justify-center overflow-hidden bg-foreground/85 text-xs font-medium text-white transition-colors hover:bg-foreground sm:h-full"
          >
            {t("book.seeGallery")}
          </Link>
        </div>
      </div>

      {included?.length ? (
        <div className="flex flex-wrap gap-2 border-t border-border p-4">
          {included.map((item) => (
            <span
              key={item}
              className="inline-flex items-center rounded-full bg-forest/10 border border-forest/20 px-3 py-1 text-[11px] font-medium text-forest"
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}

      <Lightbox
        photos={lightboxPhotos}
        index={activeIndex}
        onClose={() => setActiveIndex(null)}
        onNavigate={setActiveIndex}
      />
    </div>
  );
}

function BookingFlow() {
  const search = Route.useSearch();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const siteKey = import.meta.env["VITE_TURNSTILE_SITEKEY"] ?? "";
  // TEMP: forced off for testing — restore `!siteKey` when ready to re-enable.
  const TURNSTILE_DISABLED = true;

  // Restore a saved draft once (if any) — computed lazily so it only reads
  // sessionStorage a single time, on mount.
  const draftRef = useRef<BookingDraft | null>(
    typeof window !== "undefined" ? loadDraft() : null,
  );
  const draft = draftRef.current;

  // Cap restored step at 2 — steps 3/4 depend on a server-created
  // reservation record that isn't part of the local draft, so resuming
  // straight into Review/Payment would show stale/incorrect state.
  const [step, setStep] = useState(() => Math.min(draft?.step ?? 1, 2));

  const [date, setDate] = useState<Date | undefined>(() => {
    if (search.date) return new Date(`${search.date}T00:00:00`);
    if (draft?.date) return new Date(draft.date);
    return undefined;
  });
  const [slot, setSlot] = useState<"half_day" | "24h">(search.slot ?? draft?.slot ?? "half_day");
  const [nights, setNights] = useState(
    Math.min(30, Math.max(1, search.nights ?? draft?.nights ?? 1)),
  );
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");

  const [guest, setGuest] = useState<Guest>(() => ({
    cin: draft?.guest?.cin ?? "",
    fullName: draft?.guest?.fullName ?? "",
    phone: draft?.guest?.phone ?? "",
    dateOfBirth: draft?.guest?.dateOfBirth ?? "",
    adults: draft?.guest?.adults ?? Math.max(1, search.guests ?? 2),
    children6_10: draft?.guest?.children6_10 ?? 0,
    childrenUnder5: draft?.guest?.childrenUnder5 ?? 0,
  }));

  const [errors, setErrors] = useState<Partial<Record<keyof Guest, string>>>({});
  const [reservation, setReservation] = useState<{ id: string; reference: string; total: number } | null>(
    null,
  );
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [d17Phone, setD17Phone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState(draft?.phoneCountry ?? DEFAULT_PHONE_COUNTRY);
  const [processing, setProcessing] = useState(false);

  // Turnstile for booking form (Step 2)
  const turnstile = useTurnstile(siteKey, TURNSTILE_DISABLED);

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
    (cabins ?? []).find((c) => Number(c.capacity) >= (guest.adults + guest.children6_10)) ?? (cabins ?? [])[0] ?? null;


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

  // Let the person know their progress was restored, once, on mount.
  useEffect(() => {
    if (draft?.guest?.fullName || draft?.date) {
      toast.info("Vos informations précédentes ont été restaurées.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist Step 1 & 2 data as it changes — never card/payment details.
  useEffect(() => {
    saveDraft({
      date: date ? date.toISOString() : null,
      slot,
      nights,
      phoneCountry,
      guest,
      step,
    });
  }, [date, slot, nights, phoneCountry, guest, step]);

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
  const adultTotal = slot === "half_day"
    ? unitPrice * guest.adults
    : unitPrice * guest.adults * effectiveNights;
  const childrenTotal = slot === "half_day"
    ? CHILDREN_6_10_PRICE * guest.children6_10
    : CHILDREN_6_10_PRICE * guest.children6_10 * effectiveNights;
  const price = adultTotal + childrenTotal;


  const stayDays = (start: string, count: number) => {
    const base = new Date(`${start}T00:00:00Z`).getTime();
    return Array.from({ length: count }, (_, i) =>
      new Date(base + i * 86400000).toISOString().slice(0, 10),
    );
  };
  // Full exclusivity: any booked slot on any day = taken
  const isRangeTaken = (start: string | null, _s: "half_day" | "24h", count: number) =>
    !!start &&
    stayDays(start, count).some((d) => (booked ?? []).some((b) => b.date === d));

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
    const totalCountable = guest.adults + guest.children6_10;
    if (totalCountable > fleetMaxCapacity) {
      setErrors((prev) => ({ ...prev, adults: t("cabin.capacity", { n: fleetMaxCapacity }) }));
      toast.error(t("cabin.capacity", { n: fleetMaxCapacity }));
      return;
    }

    // Phone length is validated against the SELECTED COUNTRY, not a generic
    // 8-12 range — e.g. Tunisia expects exactly 8 digits, Italy expects 10.
    const expectedLen = phoneLenForCountry(phoneCountry);
    if (guest.phone.length !== expectedLen) {
      const countryLabel = PHONE_COUNTRIES.find((c) => c.dial === phoneCountry)?.name ?? phoneCountry;
      const msg = `Le numéro doit contenir ${expectedLen} chiffres pour ${countryLabel} (${phoneCountry}).`;
      setErrors((prev) => ({ ...prev, phone: msg }));
      toast.error(msg);
      return;
    }

    // Turnstile verification
    if (!TURNSTILE_DISABLED) {
      if (!turnstile.token) {
        toast.error("Complétez la vérification anti-bot.");
        return;
      }
    }

    setErrors({});
    setStep(3);
  };

  const confirm = async () => {
    if (!dateKey) return;
    const result = await create({
      data: {
        date: dateKey,
        slot,
        nights: effectiveNights,
        cin: guest.cin,
        fullName: guest.fullName,
        phone: `${phoneCountry}${guest.phone}`,
        dateOfBirth: guest.dateOfBirth,
        guestsCount: guest.adults + guest.children6_10 + guest.childrenUnder5,
        adults: guest.adults,
        children6_10: guest.children6_10,
        childrenUnder5: guest.childrenUnder5,
        // Only send a token when Turnstile is actually enabled — sending an
        // empty string while it's disabled (see TURNSTILE_DISABLED above)
        // would make server-side verification fail every time, since an
        // empty token is never valid against Cloudflare's siteverify.
        ...(TURNSTILE_DISABLED ? {} : { turnstileToken: turnstile.token }),
      },
    });

    if (!result.ok) {
      if (result.reason === "taken") {
        toast.error(t("book.taken"));
        setStep(1);
      } else if (result.reason === "turnstile") {
        toast.error("Vérification de sécurité échouée, veuillez réessayer.");
        turnstile.reset();
        setStep(2);
      } else {
        toast.error(t("common.error"));
      }
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
      clearDraft();
      navigate({ to: "/receipt/$reference", params: { reference: reservation.reference } });
    } catch {
      setProcessing(false);
      toast.error(t("common.error"));
    }
  };

  const steps = [t("book.step1"), t("book.step2"), t("book.step3"), t("book.step4")];

  const PAY_METHODS: { id: PayMethod; Icon: typeof CreditCard; label: string }[] = [
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
          <OfferShowcase cabin={cabin} included={included ?? []} t={t} />

          {/* Turnstile mounts once, on page load — NOT gated to step 2 —
              so its invisible background verification has the entire time
              the person spends on Step 1 (picking date/guests) as a head
              start. By the time they reach Step 2's submit button, the
              token is very likely already resolved: zero perceived delay.
              Kept outside the step-conditional blocks so switching steps
              never unmounts/re-renders the widget. Visually near-invisible
              (h-0) unless Cloudflare needs an actual interactive challenge,
              in which case the container naturally expands to show it. */}
          {!TURNSTILE_DISABLED && (
            <div ref={turnstile.containerRef} className="h-0 overflow-visible" />
          )}
          {turnstile.loadError ? (
            <p className="mt-1 text-xs text-destructive">{turnstile.loadError}</p>
          ) : null}

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
                adults={guest.adults}
                children6_10={guest.children6_10}
                childrenUnder5={guest.childrenUnder5}
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
                    <div className="flex justify-center">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        disabled={{ before: new Date() }}
                        className="pointer-events-auto w-full max-w-full"
                      />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {(["half_day", "24h"] as const).map((s) => {
                      const active = slot === s;
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

                  {/* Guest counters */}
                  <div className="mt-5 rounded-2xl border border-border bg-card p-5 space-y-3">
                    <p className="text-sm font-medium text-primary flex items-center gap-2">
                      <Users className="h-4 w-4" /> Composition du groupe
                    </p>
                    <p className="text-[11px] text-muted-foreground">{t("book.childrenNote")}</p>
                    <CountStepper
                      label={t("book.adults")}
                      value={guest.adults}
                      min={1}
                      max={fleetMaxCapacity}
                      onChange={(v) => updateGuest("adults", v)}
                    />
                    <CountStepper
                      label={t("book.children6_10")}
                      value={guest.children6_10}
                      onChange={(v) => updateGuest("children6_10", v)}
                      highlight="amber"
                    />
                    <CountStepper
                      label={t("book.childrenUnder5")}
                      sublabel="Gratuit"
                      value={guest.childrenUnder5}
                      onChange={(v) => updateGuest("childrenUnder5", v)}
                      highlight="coral"
                    />
                    {slot === "24h" ? (
                      <CountStepper
                        label={t("book.nights")}
                        value={nights}
                        min={1}
                        max={30}
                        onChange={setNights}
                      />
                    ) : null}
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
                  <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 ">
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
                          <div
                            className={[
                              "flex items-stretch overflow-hidden rounded-xl border bg-card transition-all",
                              errors.phone
                                ? "border-destructive focus-within:border-destructive focus-within:ring-2 focus-within:ring-destructive/20"
                                : "border-input focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
                            ].join(" ")}
                          >
                            <div className="relative flex shrink-0 items-center border-e border-border">
                              <select
                                value={phoneCountry}
                                onChange={(e) => {
                                  const nextDial = e.target.value;
                                  setPhoneCountry(nextDial);
                                  // Trim if the previously-typed number is
                                  // longer than the new country allows.
                                  updateGuest("phone", guest.phone.slice(0, phoneLenForCountry(nextDial)));
                                }}
                                aria-label="Indicatif pays"
                                className="num h-full appearance-none bg-transparent py-3 ps-3 pe-7 text-sm text-primary outline-none cursor-pointer"
                              >
                                {PHONE_COUNTRIES.map((c) => (
                                  <option key={c.code} value={c.dial}>
                                    {c.code} {c.dial}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute end-2 h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <input
                              className="num min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-sm outline-none"
                              value={guest.phone}
                              inputMode="tel"
                              autoComplete="tel-national"
                              placeholder={"0".repeat(phoneLenForCountry(phoneCountry))}
                              maxLength={phoneLenForCountry(phoneCountry)}
                              onChange={(e) =>
                                updateGuest("phone", onlyDigits(e.target.value, phoneLenForCountry(phoneCountry)))
                              }
                              aria-invalid={!!errors.phone}
                              required
                            />
                          </div>
                        </Field>
                      </div>

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
                    </div>
                  </div>

                  {/* Turnstile widget mounts once, on page load — see the
                      container placed above the stepper, outside the
                      step-conditional blocks. Nothing needed here. */}

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
                      <Row label={t("book.phone")} value={`${phoneCountry} ${guest.phone}`} mono />
                      <Row label={t("book.adults")} value={String(guest.adults)} mono />
                      {guest.children6_10 > 0 && (
                        <Row label="Enfants 6–10 ans" value={`${guest.children6_10} × 50 DT`} mono />
                      )}
                      {guest.childrenUnder5 > 0 && (
                        <Row label="Enfants ≤5 ans" value={`${guest.childrenUnder5} (gratuit)`} mono />
                      )}
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
                      {/* Trust signals — shown right before payment, when hesitation is highest */}
                      <div className="grid gap-3 rounded-xl border border-border bg-muted/50 p-4 sm:grid-cols-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ShieldCheck className="h-4 w-4 shrink-0 text-forest" />
                          Aucune donnée bancaire requise
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                          Annulation gratuite jusqu'à 48h avant
                        </div>
                        <a
                          href={CONTACT_WHATSAPP}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-xs text-muted-foreground underline hover:text-foreground"
                        >
                          <MessageCircle className="h-4 w-4 shrink-0 text-coral" />
                          Besoin d'aide ? WhatsApp
                        </a>
                      </div>

                      {/* Cash-payment notice + direct contact — this is the
                          only payment method, so make it unmissable. */}
                      <div className="rounded-xl border border-coral/30 bg-coral/5 p-4">
                        <p className="flex items-center gap-2 text-sm font-medium text-primary">
                          <Banknote className="h-4 w-4 shrink-0 text-forest" />
                          Paiement en espèces à l'arrivée
                        </p>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Aucun paiement en ligne n'est requis. Pour toute question ou pour
                          confirmer votre réservation, contactez-nous directement :
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a
                            href={CONTACT_PHONE_TEL}
                            className="btn-outline-pill inline-flex items-center gap-2 py-2 px-4 text-xs"
                          >
                            <Phone className="h-3.5 w-3.5" /> {CONTACT_PHONE_DISPLAY}
                          </a>
                          <a
                            href={CONTACT_WHATSAPP}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                          </a>
                        </div>
                      </div>

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
                          <p className="text-xs text-muted-foreground">
                            {t("book.payMethod.cashNote")}
                          </p>
                        )}
                      </div>

                      <button type="submit" className="mt-6 flex w-full items-center justify-center gap-2 btn-pill btn-coral py-4 text-base">
                        <Lock className="h-4 w-4" />
                        Confirmer la réservation
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
