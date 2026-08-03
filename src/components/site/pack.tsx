import { useI18n } from "@/lib/i18n";

export function PackList({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const items = [t("pack.meals"), t("pack.horse"), t("pack.boat"), t("pack.kayak")];

  return (
    <section className={`border border-amber/50 bg-amber/5 p-5 ${className}`}>
      <h3 className="text-xl text-primary">{t("pack.title")}</h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("pack.note")}</p>
      <ul className="mt-4 space-y-2.5 text-sm">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span className="mt-[6px] block h-[6px] w-[6px] shrink-0 bg-coral" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
