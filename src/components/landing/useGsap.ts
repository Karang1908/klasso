"use client";

import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "motion/react";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scope a GSAP context to an element and tear it down properly.
 *
 * gsap.context + ctx.revert() is what makes ScrollTrigger survive React's
 * double-invoked effects in development: without it every remount leaves its
 * triggers behind and the pins stack up.
 */
export function useGsapScope(
  scope: RefObject<HTMLElement | null>,
  build: (ctx: gsap.Context) => void,
  deps: unknown[] = [],
) {
  const reduced = useReducedMotion();

  useEffect(() => {
    // Reduced motion means no scroll choreography at all, not a faster version
    // of it: pinning and scrubbing are the things that cause trouble.
    if (reduced || !scope.current) return;
    const ctx = gsap.context((self) => build(self), scope.current);
    // Layout settles after fonts and images land; stale start/end values are
    // the usual reason a pin fires in the wrong place.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh);
    const id = window.setTimeout(refresh, 400);
    return () => {
      window.removeEventListener("load", refresh);
      window.clearTimeout(id);
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, ...deps]);

  return reduced;
}

export { gsap, ScrollTrigger };
