"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { Icon, BrandMark } from "./icons";
import { Banner, Button } from "./ui";
import { useApp } from "@/lib/store";

export const PreviewContext = createContext(false);
export function useAppHref() {
  const preview = useContext(PreviewContext);
  return (path: string) => {
    if (!preview) return path;
    const [route, params] = path.split("?");
    return `/preview?s=${route.replace(/^\//, "")}${params ? `&${params}` : ""}`;
  };
}

const NAV = [
  { path: "today", name: "Today", mobile: "Today", icon: "today" },
  { path: "timetable", name: "Timetable", mobile: "Week", icon: "week" },
  { path: "calendar", name: "Calendar", mobile: "Calendar", icon: "calendar" },
  { path: "planning", name: "Planning", mobile: "Plan", icon: "plan" },
  { path: "tasks", name: "Tasks", mobile: "Tasks", icon: "tasks" },
  { path: "attendance", name: "Attendance", mobile: "Stats", icon: "stats" },
] as const;

export function Brand() {
  return <div className="app-brand"><span className="text-brand"><BrandMark /></span><div><strong>Klasso</strong><small>Plan well. Be present.</small></div></div>;
}

function Navigation({ mobile = false, active }: { mobile?: boolean; active: string }) {
  const href = useAppHref();
  const reduced = useReducedMotion();
  return <LayoutGroup id={mobile ? "mobile-nav" : "sidebar-nav"}><ul className={mobile ? "flex" : ""}>
    {NAV.map((item) => <li className={mobile ? "flex-1" : ""} key={item.path}>
      <Link href={href(`/${item.path}`)} className="nav-item" aria-current={active === item.path ? "page" : undefined}>
        {active === item.path && (
          <motion.span
            layoutId={mobile ? "nav-pill-mobile" : "nav-pill-side"}
            className="nav-pill"
            // Slight overshoot so the highlight flows between tabs rather than
            // cutting; this is what makes the glass read as "liquid".
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
          />
        )}
        <Icon name={item.icon} size={mobile ? 22 : 19} /><span>{mobile ? item.mobile : item.name}</span>
      </Link>
    </li>)}
  </ul></LayoutGroup>;
}

export function AppShell({ children, screen }: { children: ReactNode; screen?: string }) {
  const pathname = usePathname();
  const href = useAppHref();
  const preview = useContext(PreviewContext);
  const active = screen ?? pathname.slice(1);
  const { data, error, stale, loading, refresh } = useApp();
  const name = data.profile?.display_name?.trim() || "Student";
  const initials = name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="app-sidebar">
      <Brand />
      <nav aria-label="Main navigation"><Navigation active={active} /></nav>
      <div className="mt-auto border-t border-line pt-4">
        <Link href={href("/settings")} className="nav-item" aria-current={active === "settings" ? "page" : undefined}>{active === "settings" && <span className="nav-pill" />}<Icon name="settings" />Settings</Link>
        <div className="mt-5 flex items-center gap-3 px-3"><span className="avatar">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{name}</p><p className="mt-0.5 text-xs text-dim">Your college, organized.</p></div></div>
      </div>
    </aside>
    <div className="app-main"><div className="workspace">
      <header className="app-topbar"><Brand />
        <div className="desktop-context hidden items-center gap-2 text-sm text-dim"><Icon name="book" size={17} /><span>Your college workspace</span></div>
        <div className="flex items-center gap-3">
          <span title={preview ? "Interactive preview. Sample data saved only in this browser tab." : undefined} className={`${preview ? "flex" : "hidden sm:flex"} items-center gap-1.5 text-[10px] text-dim`}><span className={`h-1.5 w-1.5 rounded-full ${stale || error ? "bg-warn" : "bg-success"}`} />{preview ? "Sample data" : loading ? "Syncing…" : stale ? "Offline" : error ? "Sync needs attention" : "Cloud connected"}</span>
          <Link
            className="topbar-settings lg:hidden"
            href={href("/settings")}
            aria-label="Settings"
            aria-current={active === "settings" ? "page" : undefined}
          >
            <Icon name="settings" size={19} />
          </Link>
          <Link className="avatar" href={href("/settings")} aria-label="Your profile">{initials}</Link>
        </div>
      </header>
      {error && <div className="mb-5"><Banner tone={stale ? "warn" : "danger"}><div className="flex items-center justify-between gap-3"><span>{error}</span><Button size="sm" variant="ghost" onClick={() => void refresh()}><Icon name="refresh" size={16} />Retry</Button></div></Banner></div>}
      <main id="main-content">{children}</main>
    </div></div>
    <nav aria-label="Sections" className="bottom-nav nav-surface"><Navigation mobile active={active} /></nav>
  </div>;
}
