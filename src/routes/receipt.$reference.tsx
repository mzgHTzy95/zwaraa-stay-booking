import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getReceipt } from "@/lib/booking.functions";
import { useI18n, formatPrice } from "@/lib/i18n";
import { SiteHeader, SiteFooter } from "@/components/site/chrome";
import { WaveDivider } from "@/components/site/ornaments";
import { Download } from "lucide-react";

export const Route = createFileRoute("/receipt/$reference")({
  head: () => ({
    meta: [
      { title: "Reçu de réservation — Zwaraa" },
      { name: "description", content: "Reçu de votre réservation de bungalow à Zwaraa, Nefza." },
      { property: "og:title", content: "Reçu de réservation — Zwaraa" },
      { property: "og:description", content: "Détail et statut de paiement de votre réservation." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Receipt,
});

function Receipt() {
  const { reference } = Route.useParams();
  const { t, lang } = useI18n();
  const fetchReceipt = useServerFn(getReceipt);
  const receiptRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["receipt", reference],
    queryFn: () => fetchReceipt({ data: { reference } }),
  });

  const downloadReceipt = async () => {
    if (!receiptRef.current || !data) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#FFF9EF",
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `recu-${data.reference}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="page-frame pb-24">
        <div className="wrap max-w-xl pt-12">
          {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <span className="block h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
          </div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">404</p>
        ) : (
          <div className="animate-rise">
            <div className="flex flex-col items-center">
              <svg viewBox="0 0 52 52" className="h-14 w-14 text-forest" fill="none">
                <circle
                  cx="26"
                  cy="26"
                  r="24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="151"
                  strokeDashoffset="151"
                  style={{ animation: "draw-check .7s ease-out forwards" }}
                />
                <path
                  d="M15 27l8 8 15-16"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="40"
                  strokeDashoffset="40"
                  style={{ animation: "draw-check .5s .55s ease-out forwards" }}
                />
              </svg>
              <h1 className="mt-5 text-2xl text-primary">{t("receipt.title")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("receipt.thanks")}</p>
            </div>

            <WaveDivider />

            {/* Receipt card — this div is captured for the image download */}
            <div
              ref={receiptRef}
              className="rounded-2xl border border-border bg-card p-6 card-shadow"
              style={{ background: "#FFFFFF" }}
            >
              {/* Receipt header */}
              <div className="flex items-start justify-between border-b border-border pb-4 mb-4">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-xl text-primary">Zwaraa</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Halq El Oued Ezzouaraa · Nefza</p>
                </div>
                <span className="rounded-full bg-forest/15 px-3 py-1.5 text-xs font-medium text-forest">
                  {t("receipt.paid")}
                </span>
              </div>

              {/* Reference */}
              <div className="mb-5 rounded-xl bg-secondary p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("receipt.ref")}</p>
                <p className="num mt-1 text-xl font-semibold text-primary">{data.reference}</p>
              </div>

              <dl className="divide-y divide-border text-sm">
                <Row
                  label={t("book.cabin")}
                  value={
                    (lang === "ar" ? data.cabins?.name_ar : data.cabins?.name) ?? ""
                  }
                />
                <Row label={t("book.date")} value={data.reservation_date} mono />
                <Row label={t("book.slot")} value={t(`slot.${data.slot}`)} />
                {data.slot === "24h" ? (
                  <Row
                    label={t("book.nights")}
                    value={t("book.nightsValue", { n: data.nights ?? 1 })}
                    mono
                  />
                ) : null}

                <Row label={t("book.guest")} value={data.full_name} />
                <Row label={t("book.guests")} value={String(data.guests_count)} mono />
                <Row label={t("admin.status")} value={t(`status.${data.status}`)} />
              </dl>

              {/* Total */}
              <div className="mt-5 flex items-baseline justify-between rounded-xl bg-primary/5 border border-primary/15 px-4 py-3">
                <span className="text-sm uppercase tracking-wider text-muted-foreground">
                  {t("receipt.amount")}
                </span>
                <span className="num text-2xl font-semibold text-primary">
                  {formatPrice(data.total_price, lang)}
                </span>
              </div>

              {/* Footer watermark */}
              <p className="mt-5 text-center text-[10px] text-muted-foreground/60">
                zwaraa.tn · Bungalows sur pilotis, lagune de Nefza
              </p>
            </div>

            {/* Action buttons */}
            <div className="mt-8 flex gap-4 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-outline-pill flex-1"
              >
                {t("receipt.print")}
              </button>
              <button
                type="button"
                onClick={downloadReceipt}
                className="btn-outline-pill flex-[1.5] border-forest text-forest hover:bg-forest/5 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                {t("receipt.download")}
              </button>
              <Link
                to="/"
                className="btn-pill btn-coral flex-1"
              >
                {t("receipt.home")}
              </Link>
            </div>
          </div>
        )}
      </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={mono ? "num text-sm" : "text-sm"}>{value}</dd>
    </div>
  );
}
