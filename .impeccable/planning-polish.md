# Klasso planning and interface refinement

Mode: Operate. Latest user request on 2026-09-09 supersedes the earlier Cadence
composition where the user's intervening code changed naming, navigation or planning.
Keep the incumbent Klasso name, celadon/evergreen themes, six destinations, Daily and
permanent Master tasks, and the existing Supabase/PWA architecture.

The supplied screenshot is defect evidence, not an approved target: the day-detail
footer has no bottom inset. The shared `.safe-b` rule was overwriting utility padding
with a zero desktop safe-area inset. Sheets now use their own non-shrinking footer,
explicit minimum padding, a scrollable body, clipped outer viewport, and keyboard-aware
visual viewport sizing.

## Requested scope

- Planning refined into a chronological day agenda containing classes and personal plans.
- Study, activity and meeting editors available from Planning, Calendar and Timetable.
- App-rendered selects, date calendars and time pickers; top-layer positioning inside sheets.
- Wide mobile glass pill, spring selection, moving highlight and reduced-effects fallbacks.
- One animated Klasso K mark, consistent static PWA icons, branded loading states.
- Responsive reflow and enlarged text, with explicit browser regression coverage.

Optional workflow refinements announced before implementation: quick duration choices,
calendar plan editing, and classes beside personal plans. Existing syllabus scheduling,
clash warnings, theme controls and permanent task semantics are retained.

## Design authority

Apple design skill is not installed. Reviewed Apple's official HIG material guidance
and W3C combobox pattern as the fallback; no claim of native SwiftUI Liquid Glass.

- https://developer.apple.com/design/human-interface-guidelines/materials
- https://developer.apple.com/design/human-interface-guidelines/sheets
- https://www.w3.org/WAI/ARIA/apg/patterns/combobox/

THESIS: Make college planning easy to scan, reliable to edit and calm to use.
OWN-WORLD: Preserve Klasso's celadon/evergreen world; opaque content, translucent floating controls, Manrope, an open-fold K monogram with one gold point.
STORY: See classes and plans together; schedule study, an activity or a meeting; change it without losing work.
FIRST VIEWPORT: Greeting-level Planning heading, add action, view/date controls, week, chronological agenda; desktop includes a compact contextual side column.
FORM: Refinement of the user-modified mineral-green app, inherited seed c82ebad3; no new world or replacement comp requested.

## Verification boundaries

First visual batch: `.impeccable/qa/klasso-round-1/`. One correction batch fixed
the build-dropped glass filter, a Calendar cell minimum-width escape at 200% text,
sheet outer scrolling, and logo first-frame visibility. Confirmation captures:
`.impeccable/qa/klasso-round-2/`. No second design detector pass.

Browser checks cover actual preview interactions, not live Supabase writes. Zoom
checks emulate the CSS viewport sizes corresponding to desktop zoom; they do not
claim testing every browser's zoom implementation. Real iPhone/Safari push and live
cloud authentication/storage remain outside this pass's verified evidence.
