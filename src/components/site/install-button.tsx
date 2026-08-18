import { useEffect, useState } from "react";
import { Check, Download, Smartphone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    deferredInstallPrompt?: InstallPromptEvent | null;
  }
}

function getPrompt(): InstallPromptEvent | null {
  return (typeof window !== "undefined" && window.deferredInstallPrompt) || null;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as any).standalone === true
  );
}

/**
 * One-click PWA installation button.
 * Works on Chrome/Edge/Android (native prompt) and shows a toast
 * on unsupported browsers (iOS Safari requires manual Add to Home Screen).
 */
export function InstallAdminButton({ className = "" }: { className?: string }) {
  const { lang } = useI18n();
  const [canInstall, setCanInstall] = useState(() => !!getPrompt());
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    // Already installed — no need to listen
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    // If the prompt was already captured before this component mounted
    if (getPrompt()) setCanInstall(true);

    const onInstallable = () => {
      setCanInstall(true);
    };

    const onInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
      window.deferredInstallPrompt = null;
    };

    // Custom event dispatched by our early inline script
    window.addEventListener("pwa-installable", onInstallable);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("pwa-installable", onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const label = lang === "ar" ? "تثبيت التطبيق" : "Installer l'app";
  const doneLabel = lang === "ar" ? "مثبَّت ✓" : "Installée ✓";

  // Already running as standalone PWA
  if (installed) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-forest/30 bg-forest/10 px-3 py-1.5 text-xs font-medium text-forest ${className}`}
      >
        <Check className="h-3.5 w-3.5" />
        {doneLabel}
      </span>
    );
  }

  const handleClick = async () => {
    const prompt = getPrompt();

    if (!prompt) {
      // No native prompt available (iOS Safari, Firefox, etc.)
      toast.info(
        lang === "ar"
          ? 'لتثبيت التطبيق على iPhone: انقر على زر المشاركة ↑ ثم "إضافة إلى الشاشة الرئيسية"'
          : 'Sur iPhone/Safari : bouton Partager ↑ → "Sur l\'écran d\'accueil". Sur Android, Chrome proposera automatiquement.',
        { duration: 6000 }
      );
      return;
    }

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
        setCanInstall(false);
      }
      window.deferredInstallPrompt = null;
    } catch (err) {
      console.error("PWA install error:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={label}
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-3 sm:px-3.5 py-2 text-xs font-semibold shadow-tight transition-all",
        canInstall
          ? "bg-primary text-primary-foreground hover:-translate-y-0.5 hover:shadow-soft"
          : "bg-muted text-muted-foreground cursor-default opacity-70",
        className,
      ].join(" ")}
      // Only disable visually, still allow click to show iOS instructions
      aria-label={label}
    >
      {canInstall ? (
        <Download className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <Smartphone className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
