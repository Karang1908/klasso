/* Klasso service worker.
 *
 * Deliberately handles push and notification clicks ONLY — it does not
 * intercept fetch. Caching app shells behind a schedule app risks showing a
 * stale timetable, which is worse than showing none; offline tolerance is
 * handled in the data layer instead, which knows when its data is old.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Klasso", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Klasso";
  const options = {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    tag: payload.tag || undefined,
    renotify: Boolean(payload.tag),
    data: { url: payload.url || "/today" },
    vibrate: [90, 40, 90],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/today";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Reuse the installed app window if it is already open.
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch {
              /* cross-origin or unsupported — focusing alone is fine */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    })(),
  );
});
