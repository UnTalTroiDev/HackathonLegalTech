"use client";

import { useEffect } from "react";

/**
 * Activa el scroll-reveal (estilo saleads) en toda la página: observa los elementos
 * con clase `.reveal` y les añade `.reveal-in` cuando entran al viewport, quitándola
 * al salir (bidireccional: aparece y se atenúa). Respeta prefers-reduced-motion.
 *
 * Se monta una sola vez por página; no envuelve nada, solo lee el DOM.
 */
export function RevealInit() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (els.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((e) => e.classList.add("reveal-in"));
      return;
    }

    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) =>
          en.target.classList.toggle("reveal-in", en.isIntersecting),
        ),
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, []);

  return null;
}
