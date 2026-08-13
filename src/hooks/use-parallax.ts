import { useEffect, useRef } from "react";

export function useParallax(speed: number = 0.5) {
  const ref = useRef<HTMLImageElement>(null);
  const rafId = useRef<number>();
  const lastScrollY = useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      lastScrollY.current = window.scrollY;

      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        if (!ref.current) return;

        const offset = lastScrollY.current * speed;
        ref.current.style.transform = `translate3d(0, ${offset}px, 0)`;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [speed]);

  return ref;
}
