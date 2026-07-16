"use client";

import { useEffect, useRef, useState } from "react";

type ViewportHeroProps = {
  bottomGap?: number;
  children: React.ReactNode;
  className?: string;
  minHeight?: number;
};

export function ViewportHero({
  bottomGap = 2,
  children,
  className = "",
  minHeight = 520
}: ViewportHeroProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    function updateHeight() {
      const current = ref.current;
      if (!current) {
        return;
      }

      const rect = current.getBoundingClientRect();
      const documentTop = rect.top + window.scrollY;
      const nextHeight = Math.max(minHeight, window.innerHeight - documentTop - bottomGap);
      setHeight(Math.floor(nextHeight));
    }

    updateHeight();
    window.addEventListener("resize", updateHeight);
    window.addEventListener("orientationchange", updateHeight);

    const observer = new ResizeObserver(updateHeight);
    observer.observe(document.body);

    return () => {
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("orientationchange", updateHeight);
      observer.disconnect();
    };
  }, [bottomGap, minHeight]);

  return (
    <div
      ref={ref}
      className={className}
      style={height ? { height } : { minHeight }}
    >
      {children}
    </div>
  );
}
