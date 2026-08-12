import { useEffect, useState } from "react";
import { Check, Download, Share } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * One-tap installation of the admin dashboard as a standalone app.
 * Uses the native install prompt when the browser offers one, and falls back
 * to short manual instructions (iOS/Safari) otherwise.
 */
export function InstallAdminButton({ className = "" }: { className?: string }) {
  const { lang } = useI18n();
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  // const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const label = lang === "ar" ? "تثبيت التطبيق" : "Installer l'app";
  const doneLabel = lang === "ar" ? "مثبَّت" : "Installée";
  const help =
    lang === "ar"
      ? "على iPhone: افتح قائمة المشاركة ثم «إضافة إلى الشاشة الرئيسية»."
      : "Sur iPhone : menu Partager, puis « Sur l'écran d'accueil ». Sur Chrome : menu ⋮ → Installer.";

  if (installed) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-forest/30 bg-forest/10 px-3 py-1.5 text-xs font-medium text-forest ${className}`}
      >
        <Check className="h-3.5 w-3.5" /> {doneLabel}
      </span>
    );
  }

  const click = async () => {
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setPrompt(null);
      return;
    }
    // setShowHelp((v) => !v);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={click}
        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-tight transition-transform hover:-translate-y-0.5"
      >
        <Download className="h-3.5 w-3.5" />
        {label}
      </button>
      {/* {showHelp ? (
        <div className="absolute inset-e-0 z-50 mt-2 w-64 rounded-xl border border-border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground shadow-soft">
          <Share className="mb-1 h-3.5 w-3.5 text-primary" />
          {help}
        </div>
      ) : null} */}
    </div>
  );
}
