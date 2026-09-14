import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stop `next dev` writing and re-appending its own AGENTS.md / CLAUDE.md on
  // every run. This project keeps its agent docs under external tooling, and the
  // re-append shows up as a permanent uncommitted diff otherwise.
  agentRules: false,
  devIndicators: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Once a browser has seen this it refuses to talk to the domain over
          // plain HTTP, which closes the downgrade window on a first visit
          // from an untrusted network.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          // The app asks for notifications and nothing else. Anything that
          // does get injected into a page cannot reach a camera or a location.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=(), interest-cohort=()",
          },
          // Stops the site being framed by anything, including same-origin, as
          // the modern replacement for X-Frame-Options.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
      {
        // The service worker must never be served from cache, or a stale copy
        // keeps handling push events after a deploy.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
