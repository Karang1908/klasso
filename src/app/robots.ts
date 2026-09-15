import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools";

/**
 * Two different asks, so two different rules.
 *
 * Search engines are wanted: the landing page, the calculators, the demo and
 * the legal pages exist to be found. What is not wanted is the app itself
 * being crawled, and bulk scrapers taking the content wholesale.
 *
 * robots.txt is advisory — obeyed by crawlers that choose to obey it and
 * ignored by everything else. It is not a security control, and nothing
 * behind these paths relies on it: the app routes are useless without a
 * session and the API routes reject unauthenticated callers.
 */

/**
 * Signed-in routes. Matching in robots.txt is a PREFIX match, not an exact
 * one, so a bare `Disallow: /attendance` silently also blocks
 * /attendance-calculator. Each route is therefore anchored three ways: the
 * path exactly, anything beneath it, and anything with a query string.
 */
const SIGNED_IN = [
  "today", "timetable", "calendar", "planning",
  "tasks", "attendance", "settings", "reset-password",
];

const signedInRules = SIGNED_IN.flatMap((route) => [
  `/${route}$`,   // the page itself
  `/${route}/`,   // anything beneath it
  `/${route}?`,   // anything carrying a query string
]);

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
        userAgent: "*",
        // Longest match wins, so naming the tools explicitly keeps them
        // crawlable even if a future app route becomes a prefix of one.
        allow: ["/", "/tools", ...TOOLS.map((t) => `/${t.slug}`)],
        disallow: [...signedInRules, "/api/"],
      },
      ...SCRAPERS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: "https://www.klasso.me/sitemap.xml",
    host: "https://www.klasso.me",
  };
}
