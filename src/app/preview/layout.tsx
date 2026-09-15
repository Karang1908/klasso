import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * The demo is a client component, which cannot export metadata, so it lives
 * here. It is a real landing target: the home page's second call to action
 * points at it, and it is the page that shows the product without a signup.
 */
export const metadata: Metadata = {
  title: "Live demo: try the timetable, attendance and reminders",
  description:
    "Try Klasso with sample data, no account needed. Explore the day view, weekly timetable, exam calendar, attendance tracking and study planning for school or college.",
  alternates: { canonical: "/preview" },
  openGraph: {
    title: "Klasso live demo",
    description: "Try the whole app with sample data. No account, no signup.",
    url: "/preview",
  },
};

export default function PreviewLayout({ children }: { children: ReactNode }) {
  return children;
}
