import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getReceipt } from "@/lib/booking.functions";
import { useI18n, formatPrice } from "@/lib/i18n";
import { SiteHeader, SiteFooter } from "@/components/site/chrome";
import { WaveDivider } from "@/components/site/ornaments";

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

  const { data, isLoading } = useQuery({
    queryKey: ["receipt", reference],
    queryFn: () => fetchReceipt({ data: { reference } }),
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-xl px-5 pt-12">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
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

            <div className="border border-border bg-card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("receipt.ref")}
                  </p>
                  <p className="num mt-1 text-lg text-primary">{data.reference}</p>
                </div>
                <span className="bg-forest px-3 py-1 text-xs font-medium text-forest-foreground">
                  {t("receipt.paid")}
                </span>
              </div>

              <dl className="mt-6 divide-y divide-border border-y border-border text-sm">
                <Row
                  label={t("book.cabin")}
                  value={
                    (lang === "ar" ? data.cabins?.name_ar : data.cabins?.name) ?? ""
                  }
                />
                <Row label={t("book.date")} value={data.reservation_date} mono />
                <Row label={t("book.slot")} value={t(`slot.${data.slot}`)} />
                <Row label={t("book.guest")} value={data.full_name} />
                <Row label={t("book.guests")} value={String(data.guests_count)} mono />
                <Row label={t("admin.status")} value={t(`status.${data.status}`)} />
              </dl>

              <div className="mt-5 flex items-baseline justify-between border-t-2 border-primary pt-3">
                <span className="text-sm uppercase tracking-wider text-muted-foreground">
                  {t("receipt.amount")}
                </span>
                <span className="num text-2xl text-primary">
                  {formatPrice(data.total_price, lang)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-3 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="border border-input px-4 py-3 text-sm"
              >
                {t("receipt.print")}
              </button>
              <Link
                to="/"
                className="flex-1 bg-coral px-4 py-3 text-center text-sm font-medium text-coral-foreground"
              >
                {t("receipt.home")}
              </Link>
            </div>
          </div>
        )}
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
