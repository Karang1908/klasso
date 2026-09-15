// robots.txt matching is a PREFIX match, not an exact one, so `Disallow: /attendance`
// silently blocks /attendance-calculator too. That shipped, and Search Console
// reported the flagship tool page as blocked. This asserts the matrix so it
// cannot happen again. Run: node scripts/verify-robots.mjs
const BASE = process.env.BASE ?? "http://localhost:3000";

const txt = await (await fetch(`${BASE}/robots.txt`)).text();

// Collect the group that applies to a general crawler such as Googlebot.
let inStar = false;
const rules = [];
for (const raw of txt.split("\n")) {
  const line = raw.trim();
  if (/^user-agent:/i.test(line)) inStar = line.split(":")[1].trim() === "*";
  else if (inStar && /^(dis)?allow:/i.test(line)) {
    const [kind, ...rest] = line.split(":");
    rules.push([kind.trim().toLowerCase(), rest.join(":").trim()]);
  }
}

/** Google's matcher: `*` is a wildcard, `$` anchors the end, else prefix. */
const matches = (url, pattern) => {
  const body = pattern.endsWith("$") ? pattern.slice(0, -1) : pattern;
  const rx = [...body].map((c) => (c === "*" ? ".*" : c.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))).join("");
  return new RegExp(`^${rx}${pattern.endsWith("$") ? "$" : ""}`).test(url);
};

/** Longest matching rule wins, which is how an Allow overrides a broader Disallow. */
const allowed = (url) => {
  let best = null;
  for (const [kind, pattern] of rules) {
    if (pattern && matches(url, pattern) && (!best || pattern.length > best[1].length)) best = [kind, pattern];
  }
  return !(best && best[0] === "disallow");
};

const CASES = [
  ["/", true], ["/tools", true], ["/preview", true], ["/privacy", true], ["/terms", true],
  ["/attendance-calculator", true], ["/cgpa-calculator", true],
  ["/gpa-calculator", true], ["/final-grade-calculator", true],
  ["/today", false], ["/timetable", false], ["/calendar", false], ["/planning", false],
  ["/tasks", false], ["/attendance", false], ["/settings", false], ["/reset-password", false],
  ["/tasks?list=daily", false], ["/api/cron/dispatch", false], ["/api/push/test", false],
];

let passed = 0, failed = 0;
for (const [url, want] of CASES) {
  const got = allowed(url);
  const ok = got === want;
  ok ? passed++ : failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${url.padEnd(26)} ${got ? "crawlable" : "blocked"}${ok ? "" : `  (expected ${want ? "crawlable" : "blocked"})`}`);
}
console.log(`\n${passed} passed; ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
