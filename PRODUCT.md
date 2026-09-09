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

The user requests impeccable, high-quality art direction, glassmorphism, polished animation and a cohesive color/theme overhaul. Avoid the generic black-and-purple aesthetic. Klasso and its existing schedule-ring logo are provisional project identity, retained for continuity.

## Evidence on Hand

HANDOFF.md, README.md, source code, SVG logo, existing logic/notification/PostgreSQL checks, and a development-only preview harness. No verified live cloud integration or deployment.

## Product Principles

- Show what is happening now, what is next and when college ends.
- Keep data under the student's control; no automatic task deletion.
- Make daily actions fast on a phone and useful at desktop scale.
- Explain state and failures; do not imply data was saved when it was not.

## Accessibility & Inclusion

Respect reduced motion, system appearance, keyboard navigation, readable contrast and iPhone safe areas. Inputs stay at least 16px and primary touch targets at least 44px.
