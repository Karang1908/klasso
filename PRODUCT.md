# Klasso

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A college student managing their own schedule, deadlines, tasks and attendance. The existing handoff identifies iPhone as the primary device; the current request also requires a fully developed desktop web app.

## Product Purpose

Bring the recurring college timetable, per-date changes, exams, tasks, attendance and configurable reminders into one personal planner.

## Capabilities and Constraints

Next.js 16, React, TypeScript, Supabase with owner-scoped RLS, and an installable PWA. Preserve date overrides, attendance occurrence keys, timezone-aware notification dispatch and existing data. The existing task list becomes Master and persists until explicitly cleared. Daily tasks belong to an individual date; retaining prior days is an implementation assumption to avoid data loss.

Cloud authentication and phone push delivery require the owner's configured Supabase project and phone; the handoff says these are not yet verified. Preview content is synthetic and must be labeled. Never put secrets in exports or browser bundles. Keep the service worker's existing push-only policy.

## Brand Commitments

The user requests impeccable, high-quality art direction, glassmorphism, polished animation and a cohesive color/theme overhaul. Avoid the generic black-and-purple aesthetic. Klasso and its existing schedule-ring logo are the settled project identity.

Standing decisions (2026-09-14), confirmed directly by the owner:

- **Dark is the default.** Every visitor starts on the dark mineral-green world; light and system are opt-in from Settings. Do not reintroduce system-follows-OS as the default.
- **Liquid glass is on, everywhere.** An earlier round removed glassmorphism after it was applied badly; the owner has since reversed that. The instruction is glass as a real material on both the marketing surface and the app, not a blur slapped on every card. What was wrong before was the execution, not the material.
- **The ring is the brand device.** The schedule ring carries the identity across the icon, the loading screen and the marketing surface.
- **No em-dashes in any user-facing copy.** Restructure the sentence instead.

## Evidence on Hand

HANDOFF.md, README.md, source code, SVG logo, existing logic/notification/PostgreSQL checks, and a development-only preview harness. No verified live cloud integration or deployment.

## Product Principles

- Show what is happening now, what is next and when college ends.
- Keep data under the student's control; no automatic task deletion.
- Make daily actions fast on a phone and useful at desktop scale.
- Explain state and failures; do not imply data was saved when it was not.

## Accessibility & Inclusion

Respect reduced motion, system appearance, keyboard navigation, readable contrast and iPhone safe areas. Inputs stay at least 16px and primary touch targets at least 44px.
