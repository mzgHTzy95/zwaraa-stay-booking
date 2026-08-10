import { useMemo, useState } from "react";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { fr as frLocale, arTN } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export type CalendarReservation = {
  id: string;
  reference: string;
  cabin_id: string;
  reservation_date: string;
  nights: number | null;
  slot: "half_day" | "24h";
  full_name: string;
  guests_count: number;
  status: string;
};

export type CalendarCabin = { id: string; name: string; name_ar: string; is_active: boolean };

function iso(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function OccupancyCalendar({
  reservations,
  cabins,
}: {
  reservations: CalendarReservation[];
  cabins: CalendarCabin[];
}) {
  const { t, lang } = useI18n();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string>(iso(new Date()));

  const month = addMonths(startOfMonth(new Date()), offset);
  const totalUnits = cabins.filter((c) => c.is_active).length;
  const cabinName = (id: string) => {
    const c = cabins.find((x) => x.id === id);
    if (!c) return "—";
    return lang === "ar" ? c.name_ar : c.name;
  };

  const byDate = useMemo(() => {
    const map: Record<string, CalendarReservation[]> = {};
    for (const r of reservations) {
      if (r.status === "cancelled") continue;
      const nights = Math.max(1, Number(r.nights ?? 1));
      const start = new Date(`${r.reservation_date}T00:00:00Z`).getTime();
      for (let i = 0; i < nights; i += 1) {
        const d = new Date(start + i * 86400000).toISOString().slice(0, 10);
        (map[d] ??= []).push(r);
      }
    }
    return map;
  }, [reservations]);

  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const last = endOfMonth(month);
    const lead = (first.getDay() + 6) % 7;
    const out: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= last.getDate(); day += 1) {
      out.push(new Date(month.getFullYear(), month.getMonth(), day));
    }
    return out;
  }, [month]);

  const locale = lang === "ar" ? arTN : frLocale;
  const dayRows = byDate[selected] ?? [];

  return (
    <section className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-2xl border border-border bg-card p-5 ">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-medium text-primary">
            <CalendarDays className="h-4 w-4" /> {t("admin.occupancy")}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={t("admin.prevMonth")}
              onClick={() => setOffset((o) => o - 1)}
              className="rounded-full border border-input p-1.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="w-36 text-center text-sm capitalize text-primary">
              {format(month, "LLLL yyyy", { locale })}
            </span>
            <button
              type="button"
              aria-label={t("admin.nextMonth")}
              onClick={() => setOffset((o) => o + 1)}
              className="rounded-full border border-input p-1.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1.5 text-center text-[11px] text-muted-foreground">
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <span key={`e${i}`} />;
            const key = iso(d);
            const used = (byDate[key] ?? []).length;
            const free = Math.max(0, totalUnits - used);
            const tone =
              free <= 0
                ? "bg-destructive/12 text-destructive border-destructive/25"
                : used === 0
                  ? "bg-forest/8 text-forest border-forest/20"
                  : "bg-amber/15 text-amber-foreground border-amber/30";
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={[
                  "num rounded-lg border p-1.5 text-xs transition-colors",
                  tone,
                  selected === key ? "ring-2 ring-primary/50" : "",
                ].join(" ")}
              >
                <span className="block font-medium">{d.getDate()}</span>
                <span className="block text-[9px] opacity-80">
                  {used}/{totalUnits}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-base font-medium text-primary">{t("admin.dayDetails")}</h3>
        <p className="num mt-0.5 text-xs text-muted-foreground">
          {selected} · {t("admin.freeUnits", { n: Math.max(0, totalUnits - dayRows.length) })}
        </p>
        <div className="mt-4 space-y-3">
          {dayRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("admin.noBookingsDay")}</p>
          ) : (
            dayRows.map((r) => (
              <div key={`${r.id}-${selected}`} className="rounded-md border border-border/70 bg-background p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-primary">{r.full_name}</span>
                  <span className="num text-[11px] text-muted-foreground">{r.reference}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("admin.assigned")}: <span className="text-forest">{cabinName(r.cabin_id)}</span> ·{" "}
                  {t(`slot.${r.slot}`)} · {r.guests_count}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
