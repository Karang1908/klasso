import type { MetadataRoute } from "next";

/**
 * Two different asks, so two different rules.
 *
 * Search engines are wanted: the landing page, the demo and the legal pages
 * exist to be found. What is not wanted is the app itself being crawled, and
 * bulk scrapers taking the content wholesale.
 *
 * robots.txt is advisory — it is obeyed by crawlers that choose to obey it and
 * ignored by everything else. It is not a security control, and nothing behind
 * these paths relies on it: the app routes are useless without a session and
 * the API routes reject unauthenticated callers.
 */
const SIGNED_IN = [
  "/today", "/timetable", "/calendar", "/planning",
  "/tasks", "/attendance", "/settings", "/reset-password",
];

/** Bulk scrapers and AI training crawlers, which take content and send nothing back. */
const SCRAPERS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-Web",
  "anthropic-ai", "CCBot", "Google-Extended", "PerplexityBot", "Applebot-Extended",
  "Bytespider", "Amazonbot", "FacebookBot", "meta-externalagent",
  "Diffbot", "Omgilibot", "ImagesiftBot", "Scrapy", "magpie-crawler", "DataForSeoBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Search engines: everything public, nothing private.
        userAgent: "*",
        allow: "/",
        disallow: [...SIGNED_IN, "/api/"],
      },
      ...SCRAPERS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: "https://www.klasso.me/sitemap.xml",
    host: "https://www.klasso.me",
  };
}
