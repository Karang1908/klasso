"use client";

import { supabase } from "./supabase/client";

/** VAPID public keys are base64url; PushManager wants raw bytes. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushState = {
  /** The browser exposes the APIs at all. */
  supported: boolean;
  /** Running as an installed app rather than a browser tab. */
  standalone: boolean;
  isIOS: boolean;
  /**
   * iOS only delivers push to a PWA installed via Share → Add to Home Screen.
   * In a Safari tab there is nothing we can do but explain that.
   */
  needsInstall: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
};

export function detectEnvironment(): Omit<PushState, "subscribed"> {
  if (typeof window === "undefined") {
    return { supported: false, standalone: false, isIOS: false, needsInstall: false, permission: "unsupported" };
  }
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS 13+ reports as a Mac; the touch points give it away.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  return {
    supported,
    standalone,
    isIOS,
    needsInstall: isIOS && !standalone,
    permission: supported ? Notification.permission : "unsupported",
  };
}

export async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  } catch (err) {
    console.error("[klasso] service worker registration failed", err);
    return null;
  }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/**
 * Ask for permission, subscribe, and store the subscription against the signed-in
 * user. Must be called from a user gesture — iOS rejects it otherwise.
 */
export async function enablePush(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const env = detectEnvironment();
  if (!env.supported) {
    return { ok: false, error: "This browser cannot deliver push notifications." };
  }
  if (env.needsInstall) {
    return {
      ok: false,
      error:
        "On iPhone, notifications only work once Klasso is installed. Tap Share, then " +
        "“Add to Home Screen”, and turn this on from the installed app.",
    };
  }

  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return { ok: false, error: "Server is missing NEXT_PUBLIC_VAPID_PUBLIC_KEY." };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      error:
        permission === "denied"
          ? "Notifications are blocked. Allow them for Klasso in your device settings, then try again."
          : "Notification permission was dismissed.",
    };
  }

  const reg = await getRegistration();
  if (!reg) return { ok: false, error: "Could not register the service worker." };
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
      });
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Subscription failed." };
    }
  }

  const json = sub.toJSON();
  if (!json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, error: "The browser returned an incomplete subscription." };
  }

  const { error } = await supabase().from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 300),
      fail_count: 0,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function sendTestPush(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: "You are signed out." };

  const res = await fetch("/api/push/test", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) return { ok: false, error: body.error ?? `Request failed (${res.status}).` };
  return { ok: true };
}
