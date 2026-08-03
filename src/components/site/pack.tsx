import { useI18n } from "@/lib/i18n";

const PACK_ITEMS = [
  {
    icon: "🍽️",
    key: "pack.meals",
    detailKey: "pack.mealsDetail",
  },
  {
    icon: "🐴",
    key: "pack.horse",
    detailKey: "pack.horseDetail",
  },
  {
    icon: "🚣",
    key: "pack.boat",
    detailKey: "pack.boatDetail",
  },
  {
    icon: "🛶",
    key: "pack.kayak",
    detailKey: "pack.kayakDetail",
  },
];

export function PackList({ className = "" }: { className?: string }) {
  const { t } = useI18n();

  return (
    <section
      className={`rounded-2xl overflow-hidden border border-amber/30 bg-gradient-to-br from-amber/8 to-amber/3 ${className}`}
    >
      {/* Header */}
      <div className="bg-amber/15 px-5 py-4 border-b border-amber/20">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌟</span>
          <div>
            <h3 className="text-base font-medium text-primary leading-tight">{t("pack.title")}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t("pack.note")}</p>
          </div>
        </div>
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-amber/15">
        {PACK_ITEMS.map(({ icon, key }) => (
          <div
            key={key}
            className="flex items-start gap-3 px-4 py-3.5 hover:bg-amber/8 transition-colors"
          >
            <span className="text-xl shrink-0 mt-0.5">{icon}</span>
            <p className="text-sm leading-snug text-foreground/85">{t(key)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
