# Klasso redesign — work in progress

## Request

Read HANDOFF.md and the codebase; overhaul all UI/theme/colors with impeccable,
glassmorphism and motion.dev/animejs/GSAP; keep the complete college tracker working.
Tell the user before adding optional features. Required: separate Daily and permanent
Master to-dos. Existing records must be retained.

## Scope and product truth

`PRODUCT.md` records the existing handoff and current request. Mode: Operate.
Primary device iPhone; extend to a useful desktop workspace. No `.openai/hosting.json`.
Preserve Next.js/Supabase/Vercel architecture. No live Supabase verification yet.

## Art direction status

The user has been shown three generated portrait compositions and asked to choose
A/B/C or delegate the choice. **No answer has been received yet.** Do not record
approval or begin the replacement UI until an answer arrives. The recommendation
is A, with a responsive desktop sidebar and schedule/tasks columns.

The impeccable context script was already run this session. The new-work,
init, operate, visualize, animate and craft-floor references have been read.
Concept seed c82ebad3 assigned direction 3; the successful network-enabled rerun
provided catalog references. The retained world is the mineral-glass study space.
Directions considered: campus wayfinding, ruled study planner, mineral-glass study
space, library index, transit timetable, scientific field notes, printed course
catalog. The mineral-glass direction connects translucent study materials to
clear scheduling and checklist controls. Reference challengers from the script
include starship panels (conflicts with explicit rejection of black/purple), pixel
desktop/specimen (reduces mobile legibility), transforming silk (poor task clarity),
deep-dive profile (useful timeline metaphor but less college identification), and
darkroom workflow (fixed irreversible sequence conflicts with editable tasks).

## Comps

- `.impeccable/mocks/klasso-a.png`: live class above week strip, schedule, daily tasks.
- `.impeccable/mocks/klasso-b.png`: continuous time rail with current class inline.
- `.impeccable/mocks/klasso-c.png`: split live-class/day-progress overview.

All are generated composition studies, not deployed UI. Generated dates, extra
subjects, taglines, decorative search controls and semester claims must not be
copied as facts. Retain the real logo shape and app capabilities. No raster UI.

## Proposed implementation

Mineral green and celadon, translucent surfaces, evergreen dark mode. One consistent
sans UI family, actual SVG icons, bounded glass regions, compact shared controls.
Motion: active-navigation and segmented-control continuity using Motion; checkbox
stroke feedback via anime.js; live schedule progress via GSAP. Respect reduced motion
and do not loop decorative motion. Implement accessible sheet focus trapping.

All pages require desktop and iPhone layouts: Today, Timetable, Calendar, Tasks,
Attendance, Settings, Login. Improve the development preview from static no-ops to
interactive fixture data so controls can be exercised. Keep it production-disabled.

Optional additions already announced to the user before any implementation:
appearance controls, JSON backup export, password recovery and a recoverable error
screen. These are not implemented yet. Also announced: interactive preview and
visible save failures. Only the save failure notice is implemented so far.

## Groundwork implemented

- Task types: optional `list_kind` (legacy defaults to Master), `planned_date`, TaskScope.
- Pure `inTaskScope`, `tasksForDay`, `sortTasks` helpers in `src/lib/tasks.ts`.
- Idempotent additive schema upgrade, default Master, valid Daily date constraint.
- Completed-task clear operation accepts a scope; defaults to Master for compatibility.
- Save failure survives reconciliation refresh.
- Motion, anime.js and GSAP installed (not used by UI yet).
- Eight added task logic checks; five added schema checks.

The existing Tasks UI is still unchanged. Next step after approval: implement the
full UI and wire Daily/Master date selection, creation, editing and clearing.

## Verification still required

After implementation run `npm run check`, production build, real Chrome interaction
tests, and bounded desktop/mobile light/dark screenshots. Run one design detector;
use the skill's finish reviewer and documenter agents, passing screenshots. Write
DESIGN.md from the actual finished implementation, never the proposed palette.
