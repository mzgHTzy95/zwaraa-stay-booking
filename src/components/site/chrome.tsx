import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { Heart, Languages, Menu, Waves } from "lucide-react";

export function LanguageSwitch({ variant = "solid" }: { variant?: "hero" | "solid" }) {
  const { lang, setLang } = useI18n();
  const isHero = variant === "hero";

  const languages = [
    { code: "fr", label: "FR" },
    { code: "ar", label: "عربي" },
    { code: "en", label: "EN" },
  ] as const;

  if (isHero) {
    return (
      <div className="inline-flex items-center gap-0.5 rounded-full border border-white/25 bg-black/30 p-0.5 sm:p-1 backdrop-blur-md text-xs shadow-tight">
        <Languages className="h-3.5 w-3.5 text-white/90 ms-1.5 me-0.5 shrink-0 hidden sm:inline" />
        {languages.map((l) => {
          const active = lang === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={[
                "rounded-full px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs transition-all leading-none",
                active
                  ? "bg-white text-primary font-bold shadow-tight"
                  : "text-white/80 hover:text-white hover:bg-white/10 font-medium",
              ].join(" ")}
            >
              {l.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-border/80 bg-card/90 p-0.5 sm:p-1 text-xs shadow-tight backdrop-blur-md">
      <Languages className="h-3.5 w-3.5 text-muted-foreground ms-1.5 me-0.5 shrink-0 hidden sm:inline" />
      {languages.map((l) => {
        const active = lang === l.code;
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLang(l.code)}
            className={[
              "rounded-full px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs transition-all leading-none",
              active
                ? "bg-coral text-coral-foreground font-semibold shadow-tight"
                : "text-muted-foreground hover:text-primary hover:bg-muted/70 font-medium",
            ].join(" ")}
          >
            {l.label}
          </button>
        );
      })}
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
          <div className="brand-badge text-coral"><Waves size={17} /></div>
          <span className="brand-name">{t("brand.name")}</span>
        </Link>
        <nav className="links">
          <ul>
            <li><a href="#cabins">{t("nav.cabins")}</a></li>
          </ul>
        </nav>
        <div className="nav-right flex items-center gap-2">
          <LanguageSwitch variant="hero" />
          <button className="menu-toggle" aria-label="Menu"><Menu size={22} /></button>
        </div>
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 sm:gap-4 px-3.5 sm:px-5 py-3 sm:py-3.5">
        <Link to="/" className="flex items-center gap-2 leading-tight min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-coral text-white font-display text-lg">Z</div>
          <div className="min-w-0">
            <span className="block font-display text-base sm:text-lg text-primary truncate">
              {t("brand.name")}
            </span>
            <span className="block text-[10px] sm:text-[11px] tracking-wide text-muted-foreground truncate">
              {t("brand.tagline")}
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2 shrink-0">
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
          <h5>Reve-z</h5>
          <ul>
            <li><a href="#cabins">{t("nav.cabins")}</a></li>
          </ul>
        </div>
        <div>
          <h5>Légal</h5>
          <ul>
            <li><a href="#">Conditions</a></li>
            <li><a href="#">Confidentialité</a></li>
          </ul>
        </div>
      </div>
      <div className="foot-bottom">
        <span>© {new Date().getFullYear()} {t("brand.name")}. {t("footer.rights")}</span>
        <span className="inline-flex items-center gap-1.5">
          Made with <Heart size={12} className="text-coral" fill="currentColor" /> in Tunisia
        </span>
      </div>
    </footer>
  );
}
