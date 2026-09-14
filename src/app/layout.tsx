import type { Metadata, Viewport } from "next";

import { AppProvider } from "@/lib/store";
import { AppearanceProvider } from "@/components/Appearance";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Klasso", template: "%s · Klasso" },
  description:
    "Your timetable, exam calendar, attendance and to-do list, with a reminder before every class.",
  applicationName: "Klasso",
  manifest: "/manifest.webmanifest",
  // Without metadataBase, Next emits relative OG URLs and most scrapers ignore
  // them, which is why shared links fell back to the home-screen icon.
  metadataBase: new URL("https://www.klasso.me"),
  openGraph: {
    type: "website",
    siteName: "Klasso",
    title: "Klasso",
    description:
      "Your timetable, exam calendar, attendance and to-do list, with a reminder before every class.",
    url: "/",
  },
  keywords: [
    "college timetable app", "class schedule app", "attendance tracker",
    "class reminder app", "student planner", "university timetable",
    "exam planner", "timetable with notifications",
  ],
  authors: [{ name: "Klasso" }],
  category: "education",
  twitter: {
    card: "summary_large_image",
    title: "Klasso",
    description: "Your timetable, exams, attendance and to-dos, with a reminder before every class.",
  },
  appleWebApp: {
    capable: true,
    title: "Klasso",
    // Lets the app paint under the status bar for a native feel.
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false, date: false, address: false, email: false },
  // No `icons` block on purpose: declaring one suppresses Next's file
  // conventions. src/app/icon.svg (transparent tab favicon) and
  // src/app/apple-icon.png (opaque home-screen icon) are wired automatically.
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // A PWA that pinch-zooms feels broken, but never block it entirely —
  // maximumScale is an accessibility trap on iOS.
  viewportFit: "cover",
  themeColor: [
    { color: "#0d100f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-bg text-ink">
        <script dangerouslySetInnerHTML={{ __html: `/* THESIS: A clear view of the college day, held in mineral-green glass. OWN-WORLD: Celadon, evergreen ink, translucent panels, Manrope. STORY: Current class, schedule, attendance, Daily and permanent Master tasks. FIRST VIEWPORT: Brand, greeting, live class and dial, week, schedule, tasks; desktop sidebar and columns. FORM: Mineral-glass study space, candidate 3, seed c82ebad3, user-approved comp A. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md */ try{var t=localStorage.getItem('klasso-theme');document.documentElement.dataset.theme=(t==='light'||t==='system')?t:'dark';}catch(e){document.documentElement.dataset.theme='dark';}window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__klassoInstall=e;window.dispatchEvent(new Event('klasso:installable'));});window.addEventListener('appinstalled',function(){window.__klassoInstall=null;window.dispatchEvent(new Event('klasso:installed'));});` }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            // A stable @id so the Organization below can point at this node
            // instead of repeating it.
            "@id": "https://www.klasso.me/#app",
            name: "Klasso",
            url: "https://www.klasso.me",
            applicationCategory: "EducationalApplication",
            operatingSystem: "Any modern browser; installable on iOS and Android",
            description:
              "A college planner: timetable, exams, attendance, tasks and study plans in one app, with a push reminder before every class.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "Weekly timetable with per-date changes",
              "Push reminders before every class",
              "Attendance tracking per subject",
              "Exam calendar with syllabus topics",
              "Daily and master task lists",
              "Free-gap finder and study planning",
            ],
          }) }}
        />
        <AppearanceProvider><AppProvider>{children}</AppProvider></AppearanceProvider>
      </body>
    </html>
  );
}
