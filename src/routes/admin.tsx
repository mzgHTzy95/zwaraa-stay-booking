import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { OccupancyCalendar } from "@/components/site/admin-calendar";
import type { CalendarReservation, CalendarCabin } from "@/components/site/admin-calendar";

import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminExists, bootstrapAdmin } from "@/lib/admin-setup.functions";
import { useI18n, formatPrice } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/site/chrome";
import { InstallAdminButton } from "@/components/site/install-button";
import { Check, Plus, X } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Zwaraa" },
      { name: "description", content: "Espace d'administration des réservations Zwaraa." },
      { property: "og:title", content: "Administration — Zwaraa" },
      { property: "og:description", content: "Gestion des réservations et des tarifs." },
      { name: "robots", content: "noindex" },
    ],
    links: [
      // Admin-only PWA manifest
      { rel: "manifest", href: "/manifest.admin.json" },
    ],
  }),
  component: AdminPage,
});

const inputClass =
  "w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

function AdminPage() {
  const { t } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(null);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  if (!ready) {
    return (
      <Shell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <span className="block h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      </Shell>
    );
  }

  if (!session) return <Shell><LoginCard /></Shell>;

  if (isAdmin === null) {
    return (
      <Shell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <span className="block h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{t("admin.noAccess")}</p>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="mt-4 rounded-xl border border-input px-4 py-2 text-sm hover:border-primary transition-colors"
          >
            {t("admin.signOut")}
          </button>
        </div>
      </Shell>
    );
  }

  return <Dashboard />;
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4">
          <span className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg text-primary">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-coral text-sm text-coral-foreground">
              Z
            </span>
            {t("brand.name")} <span className="hidden text-sm text-muted-foreground sm:inline">· {t("admin.title")}</span>
          </span>
          <div className="flex items-center gap-2">
            <InstallAdminButton />
            <LanguageSwitch />
          </div>
        </div>
      </header>
      <div className="page-frame pb-24">
         <main className="wrap max-w-6xl pt-10">{children}</main>
      </div>
    </div>
  );
}

function LoginCard() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const checkExists = useServerFn(adminExists);
  const bootstrap = useServerFn(bootstrapAdmin);

  const { data: exists, refetch } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: () => checkExists(),
  });

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  const createFirst = async () => {
    if (password.length < 8) {
      toast.error("8+");
      return;
    }
    setBusy(true);
    const result = await bootstrap({ data: { email, password } });
    if (!result.ok) {
      setBusy(false);
      toast.error(String(result.reason));
      await refetch();
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <form onSubmit={signIn} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-7 card-shadow">
        <h1 className="text-2xl text-primary">{t("admin.login")}</h1>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("admin.email")}
          </span>
          <input
            type="email"
            className={`${inputClass} mt-1.5`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("admin.password")}
          </span>
          <input
            type="password"
            className={`${inputClass} mt-1.5`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full btn-pill btn-coral disabled:opacity-60 py-4 text-base"
        >
          {t("admin.signIn")}
        </button>
        {exists === false ? (
          <div className="rounded-xl border border-border/60 bg-secondary p-4">
            <p className="text-xs text-muted-foreground">
              Aucun compte administrateur n'existe encore. Créez-le maintenant (une seule fois).
            </p>
            <button
              type="button"
              onClick={createFirst}
              disabled={busy || !email || password.length < 8}
              className="mt-4 w-full btn-outline-pill disabled:opacity-50 text-[13px]"
            >
              Créer le compte administrateur
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}

type ReservationRow = {
  id: string;
  reference: string;
  reservation_date: string;
  slot: "half_day" | "24h";
  nights: number | null;

  cin: string;
  full_name: string;
  phone: string;
  date_of_birth: string;
  guests_count: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  total_price: number;
  payment_status: "unpaid" | "paid";
  created_at: string;
  cabin_id: string;
};

const STATUS_CONFIG: Record<
  ReservationRow["status"],
  { label: string; color: string; bg: string }
> = {
  pending: { label: "En attente", color: "text-amber-foreground", bg: "bg-amber/15 border-amber/30" },
  confirmed: { label: "Confirmée", color: "text-forest", bg: "bg-forest/10 border-forest/25" },
  cancelled: { label: "Annulée", color: "text-destructive", bg: "bg-destructive/10 border-destructive/25" },
  completed: { label: "Terminée", color: "text-primary", bg: "bg-primary/10 border-primary/25" },
};

function Dashboard() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"reservations" | "calendar" | "cabins">("reservations");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ReservationRow["status"]>("all");
  const [editing, setEditing] = useState<ReservationRow | null>(null);

  const { data: reservations } = useQuery({
    queryKey: ["admin-reservations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ReservationRow[];
    },
  });

  const { data: cabins } = useQuery({
    queryKey: ["admin-cabins"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cabins").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    const rows = reservations ?? [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 864e5);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const paid = rows.filter((r) => r.payment_status === "paid" && r.status !== "cancelled");
    return {
      revenue: paid.reduce((s, r) => s + Number(r.total_price), 0),
      week: rows.filter((r) => new Date(r.created_at) >= weekAgo).length,
      month: rows.filter((r) => new Date(r.created_at) >= monthStart).length,
      total: rows.length,
    };
  }, [reservations]);

  const filtered = (reservations ?? []).filter((r) => {
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      r.full_name.toLowerCase().includes(q) ||
      r.cin.toLowerCase().includes(q) ||
      r.reference.toLowerCase().includes(q) ||
      r.phone.includes(q);
    return matchQ && (status === "all" || r.status === status);
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-reservations"] });
    qc.invalidateQueries({ queryKey: ["admin-cabins"] });
    qc.invalidateQueries({ queryKey: ["cabins"] });
  };

  const cabinName = (id: string) => {
    const c = (cabins ?? []).find((x) => x.id === id);
    if (!c) return "—";
    return lang === "ar" ? c.name_ar : c.name;
  };

  const quickStatus = async (id: string, newStatus: ReservationRow["status"]) => {
    const { error } = await supabase
      .from("reservations")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Statut → ${STATUS_CONFIG[newStatus].label}`);
      refresh();
    }
  };

  return (
    <Shell>
      {/* Top nav */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1 card-shadow">
          {(["reservations", "calendar", "cabins"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={[
                "rounded-lg px-4 py-2 text-sm transition-all",
                tab === k
                  ? "bg-coral text-coral-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-primary",
              ].join(" ")}
            >
              {k === "reservations"
                ? t("admin.reservations")
                : k === "calendar"
                  ? t("admin.calendarTab")
                  : t("admin.cabinsTab")}
            </button>
          ))}

        </div>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="btn-outline-pill border-border/70 py-[7px]"
        >
          {t("admin.signOut")}
        </button>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <Stat label={t("admin.revenue")} value={formatPrice(stats.revenue, lang)} accent />
        <Stat label={t("admin.count")} value={String(stats.total)} />
        <Stat label={t("admin.week")} value={String(stats.week)} />
        <Stat label={t("admin.month")} value={String(stats.month)} />
      </div>

      {tab === "calendar" ? (
        <OccupancyCalendar
          reservations={(reservations ?? []) as unknown as CalendarReservation[]}
          cabins={(cabins ?? []) as unknown as CalendarCabin[]}
        />
      ) : null}

      {tab === "reservations" ? (

        <section className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className={inputClass}
              placeholder={t("admin.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              className={`${inputClass} sm:w-56`}
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option value="all">{t("admin.all")}</option>
              <option value="pending">{t("status.pending")}</option>
              <option value="confirmed">{t("status.confirmed")}</option>
              <option value="cancelled">{t("status.cancelled")}</option>
              <option value="completed">{t("status.completed")}</option>
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground card-shadow">
                {t("admin.empty")}
              </div>
            ) : (
              filtered.map((r) => (
                <ReservationCard
                  key={r.id}
                  r={r}
                  cabinName={cabinName(r.cabin_id)}
                  onEdit={() => setEditing(r)}
                  onQuickStatus={quickStatus}
                  onDelete={async () => {
                    const { error } = await supabase
                      .from("reservations")
                      .delete()
                      .eq("id", r.id);
                    if (error) toast.error(error.message);
                    else refresh();
                  }}
                  lang={lang}
                />
              ))
            )}
          </div>
        </section>
      ) : (
        <section className="mt-10 space-y-8">
          <AddCabinCard onSaved={refresh} />
          <div className="grid gap-5 sm:grid-cols-2">
            {(cabins ?? []).map((c) => (
              <CabinPriceCard key={c.id} cabin={c} onSaved={refresh} />
            ))}
          </div>
        </section>
      )}


      {editing ? (
        <EditReservation
          reservation={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      ) : null}
    </Shell>
  );
}

function ReservationCard({
  r,
  cabinName,
  onEdit,
  onQuickStatus,
  onDelete,
  lang,
}: {
  r: ReservationRow;
  cabinName: string;
  onEdit: () => void;
  onQuickStatus: (id: string, status: ReservationRow["status"]) => void;
  onDelete: () => void;
  lang: string;
}) {
  const { t } = useI18n();
  const sc = STATUS_CONFIG[r.status];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 card-shadow transition-shadow hover:card-shadow-hover">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className={`num rounded-full border px-3 py-1 text-[11px] font-medium ${sc.bg} ${sc.color}`}>
            {t(`status.${r.status}`)}
          </span>
          <span className="num text-xs text-muted-foreground">{r.reference}</span>
        </div>
        <span className={`text-xs ${r.payment_status === "paid" ? "text-forest font-medium" : "text-amber"}`}>
          {t(`pay.${r.payment_status}`)}
        </span>
      </div>

      {/* Details grid */}
      <div className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("book.cabin")}</span>
          <p className="mt-0.5 font-medium text-foreground">{cabinName}</p>
        </div>
        <div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("book.guest")}</span>
          <p className="mt-0.5">{r.full_name}</p>
          <p className="num text-[11px] text-muted-foreground">{r.phone} · {r.cin}</p>
        </div>
        <div>
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("book.date")}</span>
          <p className="num mt-0.5">{r.reservation_date}</p>
          <p className="text-[11px] text-muted-foreground">
            {t(`slot.${r.slot}`)}
            {r.slot === "24h" ? ` · ${r.nights ?? 1}j` : ""}
            {` · ${r.guests_count} pers.`}
          </p>
        </div>
      </div>

      {/* Price */}
      <div className="mt-3 border-t border-border/60 pt-3 flex items-center justify-between flex-wrap gap-3">
        <span className="num text-lg font-semibold text-primary">{formatPrice(r.total_price, lang as "fr" | "ar")}</span>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick status buttons */}
          {r.status !== "confirmed" && r.status !== "cancelled" && (
            <button
              type="button"
              onClick={() => onQuickStatus(r.id, "confirmed")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-forest/30 bg-forest/10 px-3 py-1.5 text-xs font-medium text-forest transition-colors hover:bg-forest/20"
            >
              <Check className="h-3.5 w-3.5" /> {t("admin.confirm")}
            </button>
          )}
          {r.status !== "completed" && r.status !== "cancelled" && (
            <button
              type="button"
              onClick={() => onQuickStatus(r.id, "completed")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <Check className="h-3.5 w-3.5" /> {t("admin.complete")}
            </button>
          )}
          {r.status !== "cancelled" && (
            <button
              type="button"
              onClick={() => onQuickStatus(r.id, "cancelled")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber/30 bg-amber/10 px-3 py-1.5 text-xs font-medium text-amber-foreground/80 transition-colors hover:bg-amber/20"
            >
              <X className="h-3.5 w-3.5" /> {t("admin.cancel")}
            </button>
          )}

          <span className="text-border">|</span>

          {/* Edit / Delete */}
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-input px-3 py-1.5 text-xs text-primary hover:border-primary transition-colors"
          >
            {t("admin.edit")}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/5 transition-colors"
          >
            {t("admin.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={[
        "rounded-2xl border p-5 card-shadow",
        accent ? "border-coral/30 bg-coral/5" : "border-border bg-card",
      ].join(" ")}
    >
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="num mt-2 text-2xl font-semibold text-primary">{value}</p>
    </div>
  );
}

function AddCabinCard({ onSaved }: { onSaved: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [capacity, setCapacity] = useState("2");
  const [half, setHalf] = useState("0");
  const [full, setFull] = useState("0");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim() || !nameAr.trim()) return;
    setBusy(true);
    const slug =
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || `bungalow-${Date.now()}`;
    const { error } = await supabase.from("cabins").insert({
      slug,
      name: name.trim(),
      name_ar: nameAr.trim(),
      capacity: Number(capacity) || 2,
      price_half_day: Number(half) || 0,
      price_24h: Number(full) || 0,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("OK");
      setName("");
      setNameAr("");
      setOpen(false);
      onSaved();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 px-4 py-4 text-sm text-primary hover:border-primary hover:bg-primary/5 transition-colors"
      >
        <Plus className="h-4 w-4" /> {t("admin.addCabin")}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 card-shadow">
      <h3 className="text-lg text-primary">{t("admin.addCabin")}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Labeled label={t("admin.name")}>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Labeled>
        <Labeled label={t("admin.nameAr")}>
          <input className={inputClass} value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" />
        </Labeled>
        <Labeled label={t("admin.capacity")}>
          <input
            type="number"
            min={1}
            className={`${inputClass} num`}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </Labeled>
        <Labeled label={t("admin.priceHalf")}>
          <input
            type="number"
            className={`${inputClass} num`}
            value={half}
            onChange={(e) => setHalf(e.target.value)}
          />
        </Labeled>
        <Labeled label={t("admin.price24")}>
          <input
            type="number"
            className={`${inputClass} num`}
            value={full}
            onChange={(e) => setFull(e.target.value)}
          />
        </Labeled>
      </div>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="btn-pill btn-coral disabled:opacity-60"
        >
          {t("admin.create")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl px-4 py-2.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-primary transition-colors"
        >
          {t("admin.cancel")}
        </button>
      </div>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function CabinPriceCard({
  cabin,
  onSaved,
}: {
  cabin: {
    id: string;
    name: string;
    name_ar: string;
    price_half_day: number;
    price_24h: number;
    is_active: boolean;
  };
  onSaved: () => void;
}) {

  const { t, lang } = useI18n();
  const [half, setHalf] = useState(String(cabin.price_half_day));
  const [full, setFull] = useState(String(cabin.price_24h));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("cabins")
      .update({ price_half_day: Number(half), price_24h: Number(full) })
      .eq("id", cabin.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("OK");
      onSaved();
    }
  };

  const toggleActive = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("cabins")
      .update({ is_active: !cabin.is_active })
      .eq("id", cabin.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else onSaved();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 card-shadow">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg text-primary">{lang === "ar" ? cabin.name_ar : cabin.name}</h3>
        <span
          className={[
            "rounded-full px-3 py-1 text-[11px] font-medium border",
            cabin.is_active
              ? "bg-forest/10 text-forest border-forest/25"
              : "bg-destructive/10 text-destructive border-destructive/25",
          ].join(" ")}
        >
          {cabin.is_active ? t("admin.available") : t("admin.unavailable")}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("admin.priceHalf")}
          </span>
          <input
            type="number"
            className={`${inputClass} num mt-1.5`}
            value={half}
            onChange={(e) => setHalf(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("admin.price24")}
          </span>
          <input
            type="number"
            className={`${inputClass} num mt-1.5`}
            value={full}
            onChange={(e) => setFull(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="btn-pill btn-coral disabled:opacity-60"
        >
          {t("admin.save")}
        </button>
        <button
          type="button"
          onClick={toggleActive}
          disabled={busy}
          className="btn-outline-pill disabled:opacity-60"
        >
          {cabin.is_active ? t("admin.makeUnavailable") : t("admin.makeAvailable")}
        </button>
      </div>

    </div>
  );
}

function EditReservation({
  reservation,
  onClose,
  onSaved,
}: {
  reservation: ReservationRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    full_name: reservation.full_name,
    phone: reservation.phone,
    cin: reservation.cin,
    reservation_date: reservation.reservation_date,
    slot: reservation.slot,
    guests_count: reservation.guests_count,
    status: reservation.status,
    payment_status: reservation.payment_status,
    total_price: String(reservation.total_price),
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from("reservations")
      .update({ ...form, total_price: Number(form.total_price) })
      .eq("id", reservation.id);
    if (error) toast.error(error.message);
    else onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={save}
        className="mt-10 w-full max-w-lg space-y-4 rounded-2xl border border-border bg-card p-6 card-shadow"
      >
        <div className="flex items-baseline justify-between">
          <h3 className="text-xl text-primary">{t("admin.edit")}</h3>
          <span className="num text-xs text-muted-foreground">{reservation.reference}</span>
        </div>

        <Input label={t("book.fullName")} value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
        <Input label={t("book.phone")} value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Input label="CIN" value={form.cin} onChange={(v) => setForm({ ...form, cin: v })} />
        <Input
          label={t("book.date")}
          type="date"
          value={form.reservation_date}
          onChange={(v) => setForm({ ...form, reservation_date: v })}
        />
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("book.slot")}
          </span>
          <select
            className={`${inputClass} mt-1.5`}
            value={form.slot}
            onChange={(e) => setForm({ ...form, slot: e.target.value as ReservationRow["slot"] })}
          >
            <option value="half_day">{t("slot.half_day")}</option>
            <option value="24h">{t("slot.24h")}</option>
          </select>
        </label>
        <Input
          label={t("book.guests")}
          type="number"
          value={String(form.guests_count)}
          onChange={(v) => setForm({ ...form, guests_count: Number(v) })}
        />
        <Input
          label={t("book.total")}
          type="number"
          value={form.total_price}
          onChange={(v) => setForm({ ...form, total_price: v })}
        />
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("admin.status")}
            </span>
            <select
              className={`${inputClass} mt-1.5`}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ReservationRow["status"] })}
            >
              <option value="pending">{t("status.pending")}</option>
              <option value="confirmed">{t("status.confirmed")}</option>
              <option value="cancelled">{t("status.cancelled")}</option>
              <option value="completed">{t("status.completed")}</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("pay.paid")}
            </span>
            <select
              className={`${inputClass} mt-1.5`}
              value={form.payment_status}
              onChange={(e) =>
                setForm({ ...form, payment_status: e.target.value as ReservationRow["payment_status"] })
              }
            >
              <option value="unpaid">{t("pay.unpaid")}</option>
              <option value="paid">{t("pay.paid")}</option>
            </select>
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-input px-4 py-2.5 text-sm hover:border-primary transition-colors"
          >
            {t("admin.cancel")}
          </button>
          <button
            type="submit"
            className="flex-1 rounded-xl bg-coral px-4 py-2.5 text-sm font-medium text-coral-foreground hover:bg-coral/90 transition-all"
          >
            {t("admin.save")}
          </button>
        </div>
      </form>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        className={`${inputClass} mt-1.5`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
