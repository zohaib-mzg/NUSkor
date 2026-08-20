// NUSkor service worker: shows Web Push notifications and routes
// notification clicks to the right place.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "NUSkor",
    body: "You have a new notification.",
    url: "/",
  };
  try {
    const parsed = event.data ? event.data.json() : {};
    data = { title: parsed.title ?? data.title, body: parsed.body ?? data.body, url: parsed.url ?? data.url };
  } catch {
    // ignore malformed payloads, fall back to defaults
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: `${self.location.origin}/logo.png`,
      badge: `${self.location.origin}/logo.png`,
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    event.notification.data?.url ?? "/",
    self.location.origin,
  );

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (new URL(client.url).pathname === url.pathname && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url.href);
      }
    }),
  );
});