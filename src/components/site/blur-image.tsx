import { useState } from "react";

type BlurImageProps = {
  src: string;
  blurSrc?: string | null;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
};

/**
 * Renders a tiny blurred placeholder (if provided) behind the real image,
 * fading the real image in once it finishes loading. Falls back to a plain
 * <img> with no placeholder if blurSrc isn't available.
 */
export function BlurImage({ src, blurSrc, alt, className, loading = "lazy" }: BlurImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {blurSrc && (
        <img
          src={blurSrc}
          alt=""
          aria-hidden="true"
          className={[
            "absolute inset-0 h-full w-full scale-110 object-cover blur-lg transition-opacity duration-500",
            loaded ? "opacity-0" : "opacity-100",
          ].join(" ")}
        />
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        onLoad={() => setLoaded(true)}
        className={[
          className ?? "",
          "relative transition-opacity duration-500",
          blurSrc ? (loaded ? "opacity-100" : "opacity-0") : "opacity-100",
        ].join(" ")}
      />
    </div>
  );
}
