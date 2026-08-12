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
      {
        name: "description",
        content: "Reçu de votre réservation de bungalow à Zwaraa, Nefza.",
      },
      { property: "og:title", content: "Reçu de réservation — Zwaraa" },
      {
        property: "og:description",
        content: "Détail et statut de paiement de votre réservation.",
      },
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

  const cloneWithInlineStyles = (source: HTMLElement): HTMLElement => {
    const clone = source.cloneNode(true) as HTMLElement;
    const sourceNodes = [
      source,
      ...Array.from(source.querySelectorAll<HTMLElement>("*")),
    ];
    const cloneNodes = [
      clone,
      ...Array.from(clone.querySelectorAll<HTMLElement>("*")),
    ];

    sourceNodes.forEach((node, index) => {
      const target = cloneNodes[index];
      const computed = window.getComputedStyle(node);
      for (let i = 0; i < computed.length; i += 1) {
        const prop = computed.item(i);
        if (prop) {
          target.style.setProperty(prop, computed.getPropertyValue(prop));
        }
      }
      target.style.fontFamily = computed.fontFamily;
      target.style.setProperty("box-sizing", computed.boxSizing);
    });

    return clone;
  };

  const downloadReceipt = async () => {
    if (!receiptRef.current || !data) return;
    try {
      const { domToPng } = await import("modern-screenshot");
      const clonedReceipt = cloneWithInlineStyles(receiptRef.current);
      clonedReceipt.style.backgroundColor = "#FFFFFF";
      clonedReceipt.style.color = "#173238";
      clonedReceipt.style.minWidth = receiptRef.current.offsetWidth + "px";
      if (lang === "ar") clonedReceipt.classList.add("receipt-arabic");

      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-9999px";
      wrapper.style.top = "0";
      wrapper.style.opacity = "0";
      wrapper.style.pointerEvents = "none";
      wrapper.appendChild(clonedReceipt);
      document.body.appendChild(wrapper);

      const dataUrl = await domToPng(clonedReceipt, {
        scale: 2,
        backgroundColor: "#FFF9EF",
        font: {
          cssText:
            "@import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap');",
        },
      });

      document.body.removeChild(wrapper);

      const link = document.createElement("a");
      link.download = `recu-${data.reference}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="page-frame pb-24 mb-25">
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
                <svg
                  viewBox="0 0 52 52"
                  className="h-14 w-14 text-forest"
                  fill="none"
                >
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
                    style={{
                      animation: "draw-check .5s .55s ease-out forwards",
                    }}
                  />
                </svg>
                <h1 className="mt-5 text-2xl text-primary">
                  {t("receipt.title")}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("receipt.thanks")}
                </p>
              </div>

              <WaveDivider />

              {/* ⚠ Download warning — shown before the receipt card */}
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber/40 bg-amber/8 px-4 py-4">
                <span className="mt-0.5 text-xl">⚠</span>
                <p className="text-sm font-medium text-amber-foreground leading-snug">
                  {t("receipt.downloadWarning")}
                </p>
              </div>

              {/* Receipt card — this div is captured for the image download */}
              <div
                ref={receiptRef}
                className={`receipt-image-safe rounded-2xl border border-border bg-card p-6 card-shadow${lang === "ar" ? " receipt-arabic" : ""}`}
                style={{ background: "#FFFFFF" }}
              >
                {/* Receipt header */}
                <div className="flex items-start justify-between border-b border-border pb-4 mb-4">
                  <div>
                    <p className="font-display text-xl text-primary">Zwaraa</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Halq El Oued Ezzouaraa · Nefza
                    </p>
                  </div>
                  <span className="rounded-full bg-forest/15 px-3 py-1.5 text-xs font-medium text-forest">
                    {t("receipt.paid")}
                  </span>
                </div>

                {/* Reference */}
                <div className="mb-5 rounded-xl bg-secondary py-3 px-6">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {t("receipt.ref")}
                  </p>
                  <p className="num mt-1 text-xl font-semibold text-primary">
                    {data.reference}
                  </p>
                </div>

                <dl className="divide-y divide-border text-sm">
                  <Row
                    label={t("book.cabin")}
                    value={
                      (lang === "ar"
                        ? data.cabins?.name_ar
                        : data.cabins?.name) ?? ""
                    }
                  />
                  <Row
                    label={t("book.date")}
                    value={data.reservation_date}
                    mono
                  />
                  <Row label={t("book.slot")} value={t(`slot.${data.slot}`)} />
                  {data.slot === "24h" ? (
                    <Row
                      label={t("book.nights")}
                      value={t("book.nightsValue", { n: data.nights ?? 1 })}
                      mono
                    />
                  ) : null}

                  <Row label={t("book.guest")} value={data.full_name} />
                  <Row
                    label={t("book.guests")}
                    value={String(data.guests_count)}
                    mono
                  />
                  <Row
                    label={t("admin.status")}
                    value={t(`status.${data.status}`)}
                  />
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
                <Link to="/" className="btn-pill btn-coral flex-1">
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

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className={mono ? "num text-sm" : "text-sm"}>{value}</dd>
    </div>
  );
}
