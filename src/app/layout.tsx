import type { Metadata, Viewport } from "next";

import { AppProvider } from "@/lib/store";
import { AppearanceProvider } from "@/components/Appearance";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Klasso", template: "%s · Klasso" },
  description:
    "Your timetable, exam calendar, attendance and to-do list — with a reminder before every class.",
  applicationName: "Klasso",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Klasso",
    // Lets the app paint under the status bar for a native feel.
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false, date: false, address: false, email: false },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // A PWA that pinch-zooms feels broken, but never block it entirely —
  // maximumScale is an accessibility trap on iOS.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#edf3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#13241e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-bg text-ink">
        <script dangerouslySetInnerHTML={{ __html: `/* THESIS: A clear view of the college day, held in mineral-green glass. OWN-WORLD: Celadon, evergreen ink, translucent panels, Manrope. STORY: Current class, schedule, attendance, Daily and permanent Master tasks. FIRST VIEWPORT: Brand, greeting, live class and dial, week, schedule, tasks; desktop sidebar and columns. FORM: Mineral-glass study space, candidate 3, seed c82ebad3, user-approved comp A. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md */ try{var t=localStorage.getItem('klasso-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}` }} />
        <AppearanceProvider><AppProvider>{children}</AppProvider></AppearanceProvider>
      </body>
    </html>
  );
}
