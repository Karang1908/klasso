import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Sign in or create a free account",
  description:
    "Create a free Klasso account to keep your school or college timetable, exams, attendance and tasks in one place, with a reminder before every class.",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
