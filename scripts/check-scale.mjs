// Guards the two ceilings that capped the dispatcher at ~50 users.
// Run: node scripts/check-scale.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createClient } = require("@supabase/supabase-js");

const db = createClient("https://example.supabase.co", "x".repeat(40));
const uuid = (i) => `${String(i).padStart(8, "0")}-1111-2222-3333-444444444444`;
// Keep in step with src/app/api/cron/dispatch/route.ts.
const USER_CHUNK = 100, SEND_BATCH = 20;

let pass = 0, fail = 0;
const ck = (name, ok, detail = "") => {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name} — ${detail}`); }
};
const chunk = (a, s) => { const o = []; for (let i = 0; i < a.length; i += s) o.push(a.slice(i, i + s)); return o; };

// PostgREST puts `in.(...)` in the URL: ~39 bytes per uuid. Unchunked, this
// crossed the common 8KB gateway limit at ~205 users and 16KB at ~420.
for (const n of [100, 1000, 10000, 50000]) {
  const ids = Array.from({ length: n }, (_, i) => uuid(i));
  const worst = Math.max(...chunk(ids, USER_CHUNK).map((page) =>
    Buffer.byteLength(db.from("timetable_slots").select("*").in("user_id", page).url.toString(), "utf8")));
  ck(`${n} users: query URL stays under 8KB (${worst} bytes, ${Math.ceil(n / USER_CHUNK)} requests)`, worst < 8192, `${worst} bytes`);
}

const unchunked = Buffer.byteLength(
  db.from("timetable_slots").select("*").in("user_id", Array.from({ length: 500 }, (_, i) => uuid(i))).url.toString(), "utf8");
ck("the unchunked form really would have blown the limit", unchunked > 16384, `${unchunked} bytes`);

// Every user's summary lands in one tick, so a whole cohort's pushes go out
// together. Sequential sending was the throughput ceiling.
const LATENCY = 200; // ms, a typical FCM/APNs round trip
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const n of [50, 200]) {
  const started = Date.now();
  for (const batch of chunk(Array.from({ length: n }), SEND_BATCH)) {
    await Promise.allSettled(batch.map(() => sleep(LATENCY)));
  }
  const elapsed = Date.now() - started;
  ck(`${n} pushes clear the 60s cap (${(elapsed / 1000).toFixed(1)}s vs ${(n * LATENCY / 1000).toFixed(1)}s sequential)`,
    elapsed < 60000, `${elapsed}ms`);
}

console.log(fail === 0 ? "\nAll scale checks passed." : `\n${fail} scale check(s) FAILED.`);
process.exit(fail === 0 ? 0 : 1);
