import { useId, type SVGProps } from "react";

const paths = {
  today: "M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9",
  week: "M4 4h16v16H4zM4 9h16M9 9v11M15 9v11",
  calendar: "M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM7 3v4M17 3v4M3 11h18",
  tasks: "M7 3h10l4 4v10l-4 4H7l-4-4V7ZM8 12l3 3 5-6",
  stats: "M5 20V10M12 20V4M19 20V7",
  plan: "M4 6h9M4 12h6M4 18h5M17.5 13.5V16l1.8 1.1M22 16a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0",
  settings: "M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3ZM9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0",
  arrow: "M4 12h16M14 6l6 6-6 6",
  chevron: "m9 5 7 7-7 7",
  back: "m15 5-7 7 7 7",
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M18 6 6 18",
  check: "m5 12 4 4L19 6",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2",
  book: "M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1",
  coffee: "M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8ZM16 9h2a3 3 0 0 1 0 6h-2M7 2v3M12 2v3M2 23h18",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 1v2M12 21v2M1 12h2M21 12h2M4 4l2 2M18 18l2 2M20 4l-2 2M6 18l-2 2",
  moon: "M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z",
  monitor: "M3 3h18v13H3zM12 16v5M8 21h8",
  download: "M12 3v12M7 10l5 5 5-5M4 16v5h16v-5",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4",
  refresh: "M20 5v6h-6M4 19v-6h6M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3",
  infinity: "M12 12c-3-6-9-6-9 0s6 6 9 0c3-6 9-6 9 0s-6 6-9 0",
  search: "M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM16 16l6 6",
  people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 4a4 4 0 0 1 0 7M22 21v-2a4 4 0 0 0-3-3.87",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
} as const;

export function Icon({ name, size = 20, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}


/** The Klasso K: an open spine and two folded leaves, with one gold point of focus. */
/**
 * The app mark: a day as a ring (how much of it has gone), the schedule inside
 * it, and a gold marker for "now". Identical geometry to the home-screen icon
 * in assets/logo.svg, so the launch screen, the sidebar and the installed icon
 * all read as one thing.
 *
 * Animated with CSS only, so it paints on the first frame with no JS.
 */
export function AnimatedBrandMark({
  size = 96, animate = true, loading = false, tile = false,
}: { size?: number; animate?: boolean; loading?: boolean; tile?: boolean }) {
  // Unique per instance: a shared id resolves to whichever copy comes first in
  // the document, which may be inside a hidden container.
  const gradientId = `bm-tile-${useId().replace(/:/g, "")}`;
  return (
    <svg
      width={size} height={size} viewBox="0 0 64 64" fill="none"
      className={`brandmark ${animate ? "brandmark-anim" : ""} ${loading ? "brandmark-loading" : ""}`}
      role="img" aria-label="Klasso"
    >
      {tile && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0.15" y1="0" x2="0.85" y2="1">
              <stop offset="0%" stopColor="#4E9376" />
              <stop offset="52%" stopColor="#2E6C55" />
              <stop offset="100%" stopColor="#1B4E3B" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="14.25" fill={`url(#${gradientId})`} />
        </>
      )}

      {/* the day, as a ring */}
      <g transform="rotate(-90 32 32)">
        <circle cx="32" cy="32" r="19" stroke="var(--mark)" strokeOpacity=".18" strokeWidth="3.75" />
        <circle
          className="bm-arc" cx="32" cy="32" r="19" stroke="var(--mark)" strokeWidth="3.75"
          strokeLinecap="round" pathLength={1} strokeDasharray="0.7 1"
        />
      </g>

      {/* the schedule inside it */}
      <g strokeLinecap="round" strokeWidth="3.75" stroke="var(--mark)">
        <path className="bm-bar bm-bar-1" d="M22.5 25H37.25" strokeOpacity=".55" />
        <path className="bm-bar bm-bar-2" d="M22.5 32H41.5" />
        <path className="bm-bar bm-bar-3" d="M22.5 39H33.25" strokeOpacity=".55" />
      </g>

      {/* "now" — the one accent, riding the ring */}
      <g className="bm-marker">
        <circle cx="14" cy="38" r="3.1" fill="var(--bg)" />
        <circle cx="14" cy="38" r="2.1" fill="var(--gold)" />
      </g>
    </svg>
  );
}

export function BrandMark({ size = 42 }: { size?: number }) {
  return <AnimatedBrandMark size={size} />;
}

/**
 * Google's four-colour "G". Kept out of `Icon` on purpose: that set is a single
 * stroked path in `currentColor`, and Google's brand guidelines require these
 * exact fills, unrecoloured, on a light or white button face.
 */
export function GoogleMark({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
    <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
    <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
  </svg>;
}
