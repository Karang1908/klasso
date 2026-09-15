import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools";

/** Only publicly meaningful pages. The app itself sits behind auth and has
 *  nothing to offer a crawler, so it is deliberately absent. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.klasso.me";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/tools`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    // Driven by the registry: adding a calculator cannot leave it out of the sitemap.
    ...TOOLS.map((t) => ({
      url: `${base}/${t.slug}`, lastModified: now,
      changeFrequency: "monthly" as const, priority: 0.9,
    })),
    { url: `${base}/preview`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
