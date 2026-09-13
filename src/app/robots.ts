import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      // Signed-in surfaces render nothing useful to a crawler and would only
      // dilute the pages that matter.
      disallow: ["/today", "/timetable", "/calendar", "/planning", "/tasks", "/attendance", "/settings", "/reset-password", "/api/"],
    }],
    sitemap: "https://www.klasso.me/sitemap.xml",
    host: "https://www.klasso.me",
  };
}
