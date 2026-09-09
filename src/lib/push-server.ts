import webpush, { type PushSubscription as WebPushSubscription } from "web-push";

let configured = false;

export function vapidReady(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY,
  );
}

function configure() {
  if (configured) return;
  if (!vapidReady()) throw new Error("VAPID keys are not configured");
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:noreply@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export type SendResult =
  | { ok: true }
  /** The browser has permanently discarded this subscription — delete the row. */
  | { ok: false; gone: true; status: number; error: string }
  | { ok: false; gone: false; status: number | null; error: string };

export async function sendPush(
  sub: StoredSubscription,
  payload: PushPayload,
): Promise<SendResult> {
  configure();
  const target: WebPushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };

  try {
    await webpush.sendNotification(target, JSON.stringify(payload), { TTL: 600 });
    return { ok: true };
  } catch (err: unknown) {
    const status =
      typeof err === "object" && err && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : null;
    const message = err instanceof Error ? err.message : String(err);
    // 404 Not Found / 410 Gone: the push service dropped the subscription.
    if (status === 404 || status === 410) {
      return { ok: false, gone: true, status, error: message };
    }
    return { ok: false, gone: false, status, error: message };
  }
}
