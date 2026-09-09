import { NextResponse } from "next/server";

import { sendPush, vapidReady } from "@/lib/push-server";
import { adminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends a real push to every device the caller has registered, so you can
 * confirm end-to-end delivery from the Settings screen without waiting for a
 * class. Authenticated with the caller's own Supabase access token.
 */
export async function POST(request: Request) {
  if (!vapidReady()) {
    return NextResponse.json(
      { error: "Push is not configured on the server (missing VAPID keys)." },
      { status: 500 },
    );
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 401 });

  const db = adminClient();
  const { data: userData, error: userErr } = await db.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }
  const userId = userData.user.id;

  const { data: subs, error } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!subs?.length) {
    return NextResponse.json(
      { error: "This device is not subscribed to notifications yet." },
      { status: 400 },
    );
  }

  const dead: string[] = [];
  const failures: string[] = [];
  let sent = 0;

  for (const sub of subs) {
    const result = await sendPush(sub, {
      title: "Klasso is set up",
      body: "Notifications are working. You'll get reminders before class.",
      url: "/today",
      tag: "test",
    });
    if (result.ok) sent++;
    else if (result.gone) dead.push(sub.id);
    else failures.push(`${result.status ?? "?"}: ${result.error}`);
  }

  if (dead.length) await db.from("push_subscriptions").delete().in("id", dead);

  if (sent === 0) {
    return NextResponse.json(
      {
        error:
          dead.length > 0
            ? "Your subscription had expired — it has been cleared. Turn notifications off and on again."
            : failures[0] ?? "Push failed.",
      },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, sent, pruned: dead.length, failures });
}
