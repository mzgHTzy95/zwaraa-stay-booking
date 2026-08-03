import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminExists, bootstrapAdmin } from "@/lib/admin-setup.functions";
import { useI18n, formatPrice } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/site/chrome";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Zwaraa" },
      { name: "description", content: "Espace d'administration des réservations Zwaraa." },
      { property: "og:title", content: "Administration — Zwaraa" },
      { property: "og:description", content: "Gestion des réservations et des tarifs." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const inputClass =
  "w-full border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary";

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
    return <Shell><p className="text-sm text-muted-foreground">{t("common.loading")}</p></Shell>;
  }

  if (!session) return <Shell><LoginCard /></Shell>;

  if (isAdmin === null) {
    return <Shell><p className="text-sm text-muted-foreground">{t("common.loading")}</p></Shell>;
  }

  if (!isAdmin) {
    return (
      <Shell>
        <p className="text-sm text-destructive">{t("admin.noAccess")}</p>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="mt-4 border border-input px-4 py-2 text-sm"
        >
          {t("admin.signOut")}
        </button>
      </Shell>
    );
  }

  return <Dashboard />;
}

function Shell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="font-[family-name:var(--font-display)] text-lg text-primary">
            {t("brand.name")} · {t("admin.title")}
          </span>
          <LanguageSwitch />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-12">{children}</main>
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
    <form onSubmit={signIn} className="mx-auto max-w-sm space-y-4 border border-border bg-card p-6">
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
        className="w-full bg-coral px-4 py-3 text-sm font-medium text-coral-foreground disabled:opacity-60"
      >
        {t("admin.signIn")}
      </button>
      {exists === false ? (
        <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Aucun compte administrateur n'existe encore. Créez-le maintenant (une seule fois).
          </p>
          <button
            type="button"
            onClick={createFirst}
            disabled={busy || !email || password.length < 8}
            className="mt-3 w-full border border-primary px-4 py-2.5 text-sm text-primary disabled:opacity-50"
          >
            Créer le compte administrateur
          </button>
        </div>
      ) : null}
    </form>
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

function Dashboard() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"reservations" | "cabins">("reservations");
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

  return (
    <Shell>
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          {(["reservations", "cabins"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={
                tab === k
                  ? "border-b-2 border-coral pb-1 text-primary"
                  : "pb-1 text-muted-foreground hover:text-primary"
              }
            >
              {k === "reservations" ? t("admin.reservations") : t("admin.cabinsTab")}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          {t("admin.signOut")}
        </button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        <Stat label={t("admin.revenue")} value={formatPrice(stats.revenue, lang)} accent />
        <Stat label={t("admin.count")} value={String(stats.total)} />
        <Stat label={t("admin.week")} value={String(stats.week)} />
        <Stat label={t("admin.month")} value={String(stats.month)} />
      </div>

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

          <div className="mt-5 overflow-x-auto border border-border">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-secondary text-start text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <Th>{t("receipt.ref")}</Th>
                  <Th>{t("book.cabin")}</Th>
                  <Th>{t("book.date")}</Th>
                  <Th>{t("book.slot")}</Th>
                  <Th>{t("book.guest")}</Th>
                  <Th>{t("book.total")}</Th>
                  <Th>{t("admin.status")}</Th>
                  <Th> </Th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      {t("admin.empty")}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <Td mono>{r.reference}</Td>
                      <Td>{cabinName(r.cabin_id)}</Td>
                      <Td mono>{r.reservation_date}</Td>
                      <Td>
                        {t(`slot.${r.slot}`)}
                        {r.slot === "24h" ? (
                          <span className="num block text-[11px] text-muted-foreground">
                            {t("admin.nights")}: {r.nights ?? 1}
                          </span>
                        ) : null}
                      </Td>

                      <Td>
                        {r.full_name}
                        <span className="num block text-[11px] text-muted-foreground">
                          {r.phone} · {r.cin}
                        </span>
                      </Td>
                      <Td mono>
                        {formatPrice(r.total_price, lang)}
                        <span className="block text-[11px] text-muted-foreground">
                          {t(`pay.${r.payment_status}`)}
                        </span>
                      </Td>
                      <Td>{t(`status.${r.status}`)}</Td>
                      <Td>
                        <div className="flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setEditing(r)}
                            className="text-primary underline underline-offset-4"
                          >
                            {t("admin.edit")}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const { error } = await supabase
                                .from("reservations")
                                .update({ status: "cancelled" })
                                .eq("id", r.id);
                              if (error) toast.error(error.message);
                              else refresh();
                            }}
                            className="text-amber-foreground/70 underline underline-offset-4"
                          >
                            {t("admin.cancel")}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const { error } = await supabase
                                .from("reservations")
                                .delete()
                                .eq("id", r.id);
                              if (error) toast.error(error.message);
                              else refresh();
                            }}
                            className="text-destructive underline underline-offset-4"
                          >
                            {t("admin.delete")}
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`border p-4 ${accent ? "border-coral bg-coral/5" : "border-border bg-card"}`}>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="num mt-2 text-2xl text-primary">{value}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 text-start font-medium">{children}</th>;
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td className={`px-3 py-3 align-top ${mono ? "num" : ""}`}>{children}</td>;
}

function CabinPriceCard({
  cabin,
  onSaved,
}: {
  cabin: { id: string; name: string; name_ar: string; price_half_day: number; price_24h: number };
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

  return (
    <div className="border border-border bg-card p-5">
      <h3 className="text-lg text-primary">{lang === "ar" ? cabin.name_ar : cabin.name}</h3>
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
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="mt-4 bg-coral px-4 py-2.5 text-sm font-medium text-coral-foreground disabled:opacity-60"
      >
        {t("admin.save")}
      </button>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4">
      <form
        onSubmit={save}
        className="mt-10 w-full max-w-lg space-y-4 border border-border bg-card p-6"
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
          <button type="button" onClick={onClose} className="border border-input px-4 py-2.5 text-sm">
            {t("admin.cancel")}
          </button>
          <button
            type="submit"
            className="flex-1 bg-coral px-4 py-2.5 text-sm font-medium text-coral-foreground"
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
