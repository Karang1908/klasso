import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Klasso — timetable, calendar & tasks",
    short_name: "Klasso",
    description:
      "Your timetable, exam calendar, attendance and to-do list, with reminders before every class.",
    id: "/today",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#edf3ee",
    theme_color: "#286450",
    categories: ["productivity", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
