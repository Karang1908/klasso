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
