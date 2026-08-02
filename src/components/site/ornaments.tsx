import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Hand-drawn wave line used as a section divider. */
export function WaveDivider({ className }: { className?: string }) {
  return (
    <div className={cn("py-10", className)} aria-hidden="true">
      <svg
        viewBox="0 0 600 18"
        className="h-4 w-full text-amber"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M0 11c14-9 26 4 40 2s24-11 39-9 22 12 37 11 26-11 41-10 23 12 38 11 25-11 40-10 24 12 39 11 25-11 40-10 24 12 39 10 25-10 40-9 24 11 39 9 26-10 40-9 25 10 39 9 25-9 39-8 24 8 39 6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/** Photo framed with an asymmetric wooden-plank border. */
export function PlankPhoto({
  src,
  alt,
  className,
  imgClassName,
  priority,
  width = 1200,
  height = 800,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  width?: number;
  height?: number;
}) {
  return (
    <div className={cn("plank-frame", className)}>
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        {...(priority ? {} : { loading: "lazy" as const })}
        className={cn("h-full w-full object-cover", imgClassName)}
      />
    </div>
  );
}

export function SectionTitle({
  children,
  kicker,
}: {
  children: ReactNode;
  kicker?: ReactNode;
}) {
  return (
    <div>
      {kicker ? (
        <p className="text-xs uppercase tracking-[0.22em] text-coral">{kicker}</p>
      ) : null}
      <h2 className="mt-2 text-3xl text-primary sm:text-4xl">{children}</h2>
    </div>
  );
}
