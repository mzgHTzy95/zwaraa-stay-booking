import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { addMonths,  format, startOfMonth, endOfMonth, isBefore, startOfToday } from "date-fns";
import { fr as frLocale, arTN } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Moon, Search, Sun, Users } from "lucide-react";
import { getDayAvailability } from "@/lib/booking.functions";
import { useI18n } from "@/lib/i18n";

type Slot = "half_day" | "24h";

const inputClass =
  "w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all";

function iso(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function AvailabilitySearch() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const fetchAvailability = useServerFn(getDayAvailability);

  const today = startOfToday();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot>("24h");
  const [guests, setGuests] = useState(2);
  const [nights, setNights] = useState(1);

  const month = addMonths(startOfMonth(today), monthOffset);

  const range = useMemo(
    () => ({ from: iso(startOfMonth(today)), to: iso(endOfMonth(addMonths(startOfMonth(today), 5))) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { data } = useQuery({
    queryKey: ["day-availability", range.from, range.to],
    queryFn: () => fetchAvailability({ data: range }),
  });

  const freeByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of data?.days ?? []) map[d.date] = d.free;
    return map;
  }, [data]);

  const totalCabins = data?.totalCabins ?? 0;
  const maxCapacity = data?.maxCapacity ?? 0;

  // Grid cells for the visible month (Monday-first)
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

  const stayDays = (start: string, count: number) => {
    const base = new Date(`${start}T00:00:00Z`).getTime();
    return Array.from({ length: count }, (_, i) => new Date(base + i * 86400000).toISOString().slice(0, 10));
  };

  const effectiveNights = slot === "24h" ? nights : 1;
  const stay = selected ? stayDays(selected, effectiveNights) : [];
  const minFree = stay.length ? Math.min(...stay.map((d) => freeByDate[d] ?? totalCabins)) : null;
  const overCapacity = maxCapacity > 0 && guests > maxCapacity;
  const canBook = !!selected && minFree !== null && minFree > 0 && !overCapacity;

  const dayClass = (free: number, isSelected: boolean, inStay: boolean, past: boolean) => {
    if (past) return "text-muted-foreground/40 cursor-not-allowed";
    const base = "transition-colors";
    if (free <= 0) return `${base} bg-destructive/12 text-destructive border-destructive/25 cursor-not-allowed`;
    const tone =
      free === 1
        ? "bg-amber/15 text-amber-foreground border-amber/35 hover:bg-amber/25"
        : "bg-forest/10 text-forest border-forest/25 hover:bg-forest/20";
    if (isSelected) return `${base} bg-coral text-coral-foreground border-coral font-semibold`;
    if (inStay) return `${base} bg-coral/25 text-primary border-coral/40`;
    return `${base} ${tone}`;
  };

  const locale = lang === "ar" ? arTN : frLocale;
  const weekdays = t("search.weekdays").split(",");

  return (
    <section id="search" className="wrap scroll-mt-24 py-14">
      <div className="rounded-3xl border border-border bg-card p-6 card-shadow sm:p-8 mb-20">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/15 text-coral">
            <Search className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-2xl text-primary">{t("search.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("search.subtitle")}</p>
          </div>
        </div>

        <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Calendar */}
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label={t("admin.prevMonth")}
                disabled={monthOffset === 0}
                onClick={() => setMonthOffset((m) => Math.max(0, m - 1))}
                className="rounded-full border border-input p-1.5 text-muted-foreground disabled:opacity-40 hover:border-primary hover:text-primary transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-medium capitalize text-primary">
                {format(month, "LLLL yyyy", { locale })}
              </p>
              <button
                type="button"
                aria-label={t("admin.nextMonth")}
                disabled={monthOffset >= 5}
                onClick={() => setMonthOffset((m) => Math.min(5, m + 1))}
                className="rounded-full border border-input p-1.5 text-muted-foreground disabled:opacity-40 hover:border-primary hover:text-primary transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px] text-muted-foreground">
              {weekdays.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-1.5">
              {cells.map((d, i) => {
                if (!d) return <span key={`e${i}`} />;
                const key = iso(d);
                const past = isBefore(d, today);
                const free = freeByDate[key] ?? totalCabins;
                const isSelected = selected === key;
                const inStay = stay.includes(key) && !isSelected;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={past || free <= 0}
                    onClick={() => setSelected(key)}
                    title={free <= 0 ? t("search.full") : t("search.free", { n: free })}
                    className={[
                      "num aspect-square rounded-lg border text-xs",
                      past ? "border-transparent" : "",
                      dayClass(free, isSelected, inStay, past),
                    ].join(" ")}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-forest/25 bg-forest/25" /> {t("search.legendFree")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-amber/35 bg-amber/30" /> {t("search.legendTight")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-destructive/25 bg-destructive/25" />{" "}
                {t("search.legendFull")}
              </span>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-5">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t("search.pack")}
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["half_day", "24h"] as const).map((s) => {
                  const Icon = s === "half_day" ? Sun : Moon;
                  const active = slot === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSlot(s)}
                      className={[
                        "flex flex-col items-start gap-1 rounded-md border px-3.5 py-3 text-start text-sm transition-all",
                        active
                          ? "border-coral bg-coral text-coral-foreground font-medium"
                          : "border-border bg-card text-primary hover:border-primary/40",
                      ].join(" ")}
                    >
                      <Icon className="h-4 w-4" />
                      {t(`slot.${s}`)}
                      <span className={["num text-[10px]", active ? "opacity-80" : "text-muted-foreground"].join(" ")}>
                        {s === "half_day" ? t("slot.hoursHalf") : t("slot.hours24")}
                      </span>
                    </button>
                  );
                })}

              </div>
            </div>

            <label className="block">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> {t("search.guests")}
              </span>
              <input
                type="number"
                min={1}
                max={Math.max(1, maxCapacity || 20)}
                value={guests}
                onChange={(e) => setGuests(Math.max(1, Number(e.target.value) || 1))}
                className={`${inputClass} num mt-1.5`}
              />
            </label>

            {slot === "24h" ? (
              <label className="block">
                <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" /> {t("search.nights")}
                </span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={nights}
                  onChange={(e) => setNights(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
                  className={`${inputClass} num mt-1.5`}
                />
              </label>
            ) : null}

            <div className="rounded-md border border-dashed border-border bg-secondary/60 p-4 text-sm">
              {!selected ? (
                <p className="text-muted-foreground">{t("search.pickDate")}</p>
              ) : overCapacity ? (
                <p className="text-destructive">{t("search.capacityWarn", { n: maxCapacity })}</p>
              ) : minFree && minFree > 0 ? (
                <>
                  <p className="num font-medium text-forest">{t("search.free", { n: minFree })}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{t("search.autoAssign")}</p>
                </>
              ) : (
                <p className="text-destructive">{t("search.full")}</p>
              )}
            </div>

            <button
              type="button"
              disabled={!canBook}
              onClick={() =>
                navigate({
                  to: "/book",
                  search: {
                    date: selected ?? undefined,
                    slot,
                    guests,
                    nights: effectiveNights,
                  },
                })
              }
              className="btn-pill btn-coral w-full py-4 text-base disabled:pointer-events-none disabled:opacity-50"
            >
              {t("search.book")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
