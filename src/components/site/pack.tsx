import { useI18n } from "@/lib/i18n";
import { Anchor, Sailboat, Sparkles, UtensilsCrossed, Waves } from "lucide-react";

const PACK_ITEMS = [
  { Icon: UtensilsCrossed, key: "pack.meals", detailKey: "pack.mealsDetail" },
  { Icon: Anchor, key: "pack.horse", detailKey: "pack.horseDetail" },
  { Icon: Sailboat, key: "pack.boat", detailKey: "pack.boatDetail" },
  { Icon: Waves, key: "pack.kayak", detailKey: "pack.kayakDetail" },
];

export function PackList({ className = "" }: { className?: string }) {
  const { t } = useI18n();

  return (
    <section
      className={`rounded-2xl overflow-hidden border border-amber/30 bg-gradient-to-br from-amber/8 to-amber/3 ${className}`}
    >
      {/* Header */}
      <div className="bg-amber/15 px-5 py-4 border-b border-amber/20">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber/25 text-amber-foreground">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="text-base font-medium text-primary leading-tight">{t("pack.title")}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t("pack.note")}</p>
          </div>
        </div>
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-amber/15">
        {PACK_ITEMS.map(({ Icon, key, detailKey }) => (
          <div
            key={key}
            className="flex items-start gap-3 px-4 py-3.5 hover:bg-amber/8 transition-colors"
          >
            <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-forest" />
            <div>
              <p className="text-sm leading-snug text-foreground/85">{t(key)}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t(detailKey)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
