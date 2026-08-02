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
            ? "rounded-sm bg-coral px-2 py-1 font-medium text-coral-foreground"
            : "rounded-sm px-2 py-1 text-muted-foreground hover:text-primary"
        }
      >
        FR
      </button>
      <span className="text-border">/</span>
      <button
        type="button"
        onClick={() => setLang("ar")}
        className={
          lang === "ar"
            ? "rounded-sm bg-coral px-2 py-1 font-medium text-coral-foreground"
            : "rounded-sm px-2 py-1 text-muted-foreground hover:text-primary"
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
    <header className="border-b border-border/70 bg-background/95">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
        <Link to="/" className="leading-tight">
          <span className="block font-[family-name:var(--font-display)] text-lg text-primary">
            {t("brand.name")}
          </span>
          <span className="block text-[11px] tracking-wide text-muted-foreground">
            {t("brand.tagline")}
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/admin"
            className="hidden text-xs text-muted-foreground hover:text-primary sm:block"
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
        <span className="text-primary">{t("brand.tagline")}</span>
        <span>{t("brand.location")}</span>
        <span className="mt-2">
          © {new Date().getFullYear()} {t("brand.name")}. {t("footer.rights")}
        </span>
      </div>
    </footer>
  );
}
