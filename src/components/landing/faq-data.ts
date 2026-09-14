/**
 * The questions people type before installing something like this.
 *
 * Deliberately a plain module, not part of the client component that renders
 * it: a "use client" module's non-component exports arrive on the server as
 * opaque client references, so building the FAQPage schema from them fails at
 * prerender with "FAQS.map is not a function".
 *
 * Every answer must stay true of the shipped product. Structured data that
 * contradicts the page is worse than none, and Google treats it as spam.
 */
export const FAQS: { q: string; a: string }[] = [
  {
    q: "Is Klasso free?",
    a: "Yes. Klasso is free to use, with no ads, no trackers and no paid tier. You can export everything you have put in at any time from Settings.",
  },
  {
    q: "Will it remind me before class starts?",
    a: "Yes. Klasso sends a push notification to your phone before each class, and you choose the lead time. You can set separate lead times for classes, exams, study blocks and tasks, and a single morning summary of the whole day.",
  },
  {
    q: "Do reminders work when the app is closed?",
    a: "Yes. Reminders are web push notifications sent from the server, so they arrive whether or not the app is open. On iPhone and iPad you must add Klasso to your home screen first, because iOS only delivers web push to installed apps.",
  },
  {
    q: "Does it track my attendance percentage?",
    a: "Yes. Mark yourself present or absent in one tap as each class happens, and Klasso keeps a running percentage for every subject. You can set the minimum attendance your course requires per subject and see how much room you have left.",
  },
  {
    q: "Does it work on iPhone and Android?",
    a: "Klasso runs in any modern browser and installs to your home screen on both iPhone and Android, where it opens full screen like a native app. It also works on a laptop.",
  },
  {
    q: "Does it work offline?",
    a: "Your timetable, tasks and attendance are available offline once the app has loaded, and changes sync when you are back online.",
  },
  {
    q: "Can I change one week without changing every week?",
    a: "Yes. Your timetable is a weekly pattern, but any single date can be edited on its own. Cancel one Tuesday lecture, move a lab, or add a one-off class without disturbing the rest of the term.",
  },
  {
    q: "Do I need a college email or an institution account?",
    a: "No. Klasso is not tied to any university system. Sign up with any email address or a Google account and enter your own timetable.",
  },
];
