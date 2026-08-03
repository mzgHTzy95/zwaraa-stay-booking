import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function LanguageSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center gap-1 text-xs">
      <button
        type="button"
        onClick={() => setLang("fr")}
        className={
          lang === "fr"
            ? "rounded-full bg-coral px-3 py-1 font-medium text-coral-foreground"
            : "rounded-full px-3 py-1 text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
        }
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLang("ar")}
        className={
          lang === "ar"
            ? "rounded-full bg-coral px-3 py-1 font-medium text-coral-foreground"
            : "rounded-full px-3 py-1 text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
        }
      >
        عربي
      </button>
    </div>
  );
}

export function SiteHeader() {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
        <Link to="/" className="leading-tight">
          <span className="block font-[family-name:var(--font-display)] text-lg text-primary">
            {t("brand.name")}
          </span>
          <span className="block text-[11px] tracking-wide text-muted-foreground">
            {t("brand.tagline")}
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="hidden rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors sm:block"
          >
            {t("nav.admin")}
          </Link>
          <LanguageSwitch />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-20 border-t border-border/70">
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-5 py-8 text-xs text-muted-foreground">
        <span className="text-primary font-medium">{t("brand.tagline")}</span>
        <span>{t("brand.location")}</span>
        <span className="mt-2">
          © {new Date().getFullYear()} {t("brand.name")}. {t("footer.rights")}
        </span>
      </div>
    </footer>
  );
}
