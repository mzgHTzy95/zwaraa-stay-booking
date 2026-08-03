import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function LanguageSwitch({ variant = "solid" }: { variant?: "hero" | "solid" }) {
  const { lang, setLang } = useI18n();
  const isHero = variant === "hero";
  return (
    <div className={isHero ? "lang-pill" : "flex items-center gap-1 text-xs"}>
      {isHero && <span className="ic">🌐</span>}
      <button
        type="button"
        onClick={() => setLang("fr")}
        className={
          lang === "fr"
            ? (isHero ? "font-bold text-white" : "rounded-full bg-coral px-3 py-1 font-medium text-coral-foreground")
            : (isHero ? "text-white/70 hover:text-white" : "rounded-full px-3 py-1 text-muted-foreground hover:text-primary hover:bg-muted transition-colors")
        }
      >
        FR
      </button>
      <span className={isHero ? "text-white/40" : "text-muted"}>/</span>
      <button
        type="button"
        onClick={() => setLang("ar")}
        className={
          lang === "ar"
            ? (isHero ? "font-bold text-white" : "rounded-full bg-coral px-3 py-1 font-medium text-coral-foreground")
            : (isHero ? "text-white/70 hover:text-white" : "rounded-full px-3 py-1 text-muted-foreground hover:text-primary hover:bg-muted transition-colors")
        }
      >
        عربي
      </button>
    </div>
  );
}

export function SiteHeader({ variant = "solid" }: { variant?: "hero" | "solid" }) {
  const { t } = useI18n();
  const isHero = variant === "hero";

  if (isHero) {
    return (
      <div className="hero-nav">
        <Link to="/" className="brand">
          <div className="brand-badge text-coral">Z</div>
          <span className="brand-name">{t("brand.name")}</span>
        </Link>
        <nav className="links">
          <ul>
            <li><a href="#cabins">{t("nav.cabins")}</a></li>
            <li><Link to="/admin">{t("nav.admin")}</Link></li>
          </ul>
        </nav>
        <div className="nav-right">
          <LanguageSwitch variant="hero" />
          <Link to="/admin" className="login-pill hidden sm:block">
            {t("nav.admin")}
          </Link>
          <button className="menu-toggle">☰</button>
        </div>
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
        <Link to="/" className="flex items-center gap-2 leading-tight">
           <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-coral text-white font-[family-name:var(--font-display)] text-lg">Z</div>
          <div>
            <span className="block font-[family-name:var(--font-display)] text-lg text-primary">
              {t("brand.name")}
            </span>
            <span className="block text-[11px] tracking-wide text-muted-foreground">
              {t("brand.tagline")}
            </span>
          </div>
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
    <footer className="site-footer">
      <div className="foot-top">
        <div>
          <div className="foot-brand">{t("brand.name")}</div>
          <p>{t("brand.tagline")}</p>
          <p className="mt-2">{t("brand.location")}</p>
        </div>
        <div>
          <h5>Zwaraa</h5>
          <ul>
            <li><a href="#cabins">{t("nav.cabins")}</a></li>
          </ul>
        </div>
        <div>
          <h5>Légal</h5>
          <ul>
            <li><a href="#">Conditions</a></li>
            <li><a href="#">Confidentialité</a></li>
            <li><Link to="/admin">{t("nav.admin")}</Link></li>
          </ul>
        </div>
      </div>
      <div className="foot-bottom">
        <span>© {new Date().getFullYear()} {t("brand.name")}. {t("footer.rights")}</span>
        <span>Made with 🤍 in Tunisia</span>
      </div>
    </footer>
  );
}
