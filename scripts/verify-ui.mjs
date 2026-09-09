import { mkdirSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer from "puppeteer-core";

mkdirSync(resolve(".impeccable/qa"), { recursive: true });
const OUT = mkdtempSync(resolve(".impeccable/qa/interactions-"));
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
const client = await page.createCDPSession();
await client.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: OUT });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
let failed = 0;
let passed = 0;
const check = (name, okay, detail = "") => { if (okay) passed++; else failed++; console.log(`${okay ? "PASS" : "FAIL"}  ${name}${okay ? "" : ` — ${detail}`}`); };
const pause = (ms = 280) => new Promise((r) => setTimeout(r, ms));
// Bring a control into the usable viewport, not beneath the docked mobile nav.
// Always reach controls through this: a raw page.click() lets CDP park the
// element under the nav and the tap lands on a nav tab instead.
const click = async (selector) => { await page.$eval(selector, (el) => el.scrollIntoView({ block: "center" })); await page.locator(selector).click(); await pause(); };
const go = async (screen) => { await page.goto(`http://localhost:3000/preview?s=${screen}`, { waitUntil: "networkidle0" }); await pause(); };
const clickText = async (text, selector = "button") => {
  const handle = await page.evaluateHandle((text, selector) => [...document.querySelectorAll(selector)].find((el) => el.textContent.trim() === text && el.getBoundingClientRect().height > 0), text, selector);
  const element = handle.asElement(); if (!element) throw new Error(`No visible ${selector} with text ${text}`);
  await element.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await element.click(); await handle.dispose(); await pause();
};
const fill = async (selector, value) => {
  await page.$eval(selector, (element, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(element, value); element.dispatchEvent(new Event("input", { bubbles: true })); element.dispatchEvent(new Event("change", { bubbles: true })); }, value); await pause(50);
};
const hasTask = (title) => page.$(`button[aria-label="Edit ${title}"]`).then(Boolean);
const addTask = async (title) => { await fill('input[aria-label="New task"]', title); await page.locator('button[type="submit"]').click(); await page.waitForSelector(`button[aria-label="Edit ${title}"]`); await pause(350); };
const chooseList = async (list) => { await page.evaluate((list) => { [...document.querySelectorAll('[aria-label="Task lists"] button')].find((b) => b.querySelector("strong")?.textContent === list).click(); }, list); await pause(); };

try {
  await go("today");
  const strip = await page.$eval('.day-strip [aria-pressed="true"]', (el) => { const r = el.getBoundingClientRect(); return { visible: r.left >= 0 && r.right <= innerWidth, day: el.querySelector("strong").textContent }; });
  check("Today opens on a visible current date", strip.visible && strip.day === String(new Date().getDate()));
  check("mobile navigation has six sections", await page.$$eval('.bottom-nav a', (links) => links.length === 6));
  check("every nav tab is reachable with a thumb", await page.$$eval('.bottom-nav a', (links) => links.every((l) => l.getBoundingClientRect().width >= 44 && l.getBoundingClientRect().height >= 44)));
  // Attendance is now an in-app listbox, not an OS <select>.
  const pickAttendance = async (label) => {
    await click('[aria-label^="Attendance for"]');
    const option = await page.evaluateHandle((label) =>
      [...document.querySelectorAll('[role="option"]')].find((o) => o.textContent.trim() === label), label);
    await option.asElement().click(); await option.dispose(); await pause();
  };
  const attendanceLabel = () =>
    page.$eval('[aria-label^="Attendance for"]', (el) => el.textContent.trim());

  await pickAttendance("Present");
  check("attendance can be marked", (await attendanceLabel()).startsWith("Present"));
  check("attendance dropdown is in-app, not an OS select",
    await page.$$eval("select", (nodes) => nodes.length === 0));
  await pickAttendance("Mark");
  check("attendance can be cleared", (await attendanceLabel()).startsWith("Mark"));

  await go("tasks");
  await addTask("UI daily task");
  check("Daily task creation works", await hasTask("UI daily task"));
  await click('[aria-label="Mark UI daily task done"]');
  check("completion is checked and struck through", await page.$eval('[aria-label="Edit UI daily task"] .task-title', (el) => getComputedStyle(el).textDecorationLine.includes("line-through")));
  await page.reload({ waitUntil: "networkidle0" }); await pause();
  check("preview task state survives a reload", Boolean(await page.$('[aria-label="Mark UI daily task not done"]')));
  await chooseList("Master"); await addTask("UI permanent task");
  await chooseList("Daily"); await click('[aria-label="Next day"]');
  check("tomorrow has an independent Daily list", !(await hasTask("UI daily task")));
  await chooseList("Master"); check("Master survives a daily date change", await hasTask("UI permanent task"));
  await chooseList("Daily"); await click('[aria-label="Previous day"]');
  check("previous Daily tasks remain accessible", await hasTask("UI daily task"));

  await chooseList("Master");
  await click('[aria-label="Edit UI permanent task"]'); await page.waitForSelector("dialog[open]");
  await fill("dialog input", "UI renamed permanent task");
  for (let i = 0; i < 14; i++) await page.keyboard.press("Tab");
  check("sheet keeps keyboard focus inside", await page.evaluate(() => Boolean(document.activeElement.closest("dialog"))));
  await clickText("Save changes", "dialog button");
  check("task details save", await hasTask("UI renamed permanent task"));
  await click('[aria-label="Edit UI renamed permanent task"]');
  await click('dialog [aria-label="List"]');
  { const opt = await page.evaluateHandle(() =>
      [...document.querySelectorAll('[role="option"]')].find((o) => o.textContent.includes("Daily")));
    await opt.asElement().click(); await opt.dispose(); await pause(); }
  await clickText("Save changes", "dialog button");
  check("moving to Daily removes the task from Master", !(await hasTask("UI renamed permanent task")));
  await chooseList("Daily"); check("moved task appears once in Daily", await page.$$eval('[aria-label="Edit UI renamed permanent task"]', (els) => els.length === 1));

  await chooseList("Master"); await addTask("UI clear me");
  await click('[aria-label="Mark UI clear me done"]');
  await clickText("Clear completed");
  check("clearing requires an explicit confirmation", Boolean(await page.$('dialog[open]')));
  await page.evaluate(() => [...document.querySelectorAll("dialog button")].find((b) => b.textContent.trim().startsWith("Delete ")).click()); await pause();
  check("completed Master tasks clear", !(await hasTask("UI clear me")));
  await chooseList("Daily"); check("clearing Master leaves completed Daily tasks alone", await hasTask("UI daily task"));
  await clickText("Clear this list"); await page.keyboard.press("Escape"); await pause();
  check("Escape dismisses the sheet without deleting", !(await page.$("dialog[open]")) && await hasTask("UI daily task"));

  await go("timetable"); await clickText("Whole week");
  check("whole-week grid renders every fixture class", await page.$$eval('[title*="·"]', (blocks) => blocks.length === 9));
  check("whole-week grid scrolls within the page", await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
  await clickText("Subjects");
  await fill('dialog input[placeholder="e.g. Data Structures"]', "UI test subject");
  await clickText("Add subject", "dialog button");
  check("subject manager adds a subject", await page.$eval("dialog", (el) => el.textContent.includes("UI test subject")));
  await page.keyboard.press("Escape"); await pause();
  await clickText("Add a class");
  await click('dialog [aria-label="Subject"]');
  { const opt = await page.evaluateHandle(() =>
      [...document.querySelectorAll('[role="option"]')].find((o) => o.textContent.trim() === "UI test subject"));
    await opt.asElement().click(); await opt.dispose(); await pause(); }
  await clickText("Add class", "dialog button");
  check("new weekly class persists in the grid", await page.$$eval('[title*="·"]', (blocks) => blocks.length === 10));

  await go("calendar"); await clickText("Add entry");
  await fill('dialog input[placeholder="e.g. Physics Midterm"]', "UI practice exam");
  await clickText("Add", "dialog button");
  check("calendar entry appears", await page.evaluate(() => document.querySelector("main").textContent.includes("UI practice exam")));
  if (await page.$('dialog[open]')) { await page.keyboard.press("Escape"); await pause(); }
  await clickText("Add entry");
  check("a new event form resets its title", await page.$eval('dialog input[placeholder="e.g. Physics Midterm"]', (el) => el.value === ""));
  await fill('dialog input[placeholder="e.g. Physics Midterm"]', "Invalid time");
  const times = await page.$$('dialog input[data-input-type="time"]');
  await times[0].evaluate((el) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "14:00"); el.dispatchEvent(new Event("input", { bubbles: true })); }); await pause();
  await times[1].evaluate((el) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, "13:00"); el.dispatchEvent(new Event("input", { bubbles: true })); }); await pause();
  check("calendar rejects an end before start", await page.$$eval("dialog button", (buttons) => buttons.find((button) => button.textContent.trim() === "Add").disabled));
  await page.keyboard.press("Escape"); await pause();

  await go("settings"); await clickText("Dark");
  check("dark appearance applies immediately", await page.evaluate(() => document.documentElement.dataset.theme === "dark"));
  await page.reload({ waitUntil: "networkidle0" }); await pause();
  check("appearance survives reload", await page.evaluate(() => document.documentElement.dataset.theme === "dark"));
  await clickText("Light");
  const before = await page.$eval('[aria-label="Class reminders"]', (el) => el.getAttribute("aria-checked"));
  await click('[aria-label="Class reminders"]');
  check("reminder preference is editable", await page.$eval('[aria-label="Class reminders"]', (el, before) => el.getAttribute("aria-checked") !== before, before));
  await clickText("Download backup"); await pause(500);
  const backup = readdirSync(OUT).find((name) => name.endsWith(".json"));
  const exported = backup ? JSON.parse(readFileSync(resolve(OUT, backup), "utf8")) : null;
  check("backup includes both task lists and no session", exported?.version === 2 && exported.data.tasks.some((task) => task.list_kind === "daily") && exported.data.tasks.some((task) => (task.list_kind ?? "master") === "master") && !exported.session && !JSON.stringify(exported).includes("access_token"));

  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await go("today");
  check("reduced-motion view remains visible and usable", await page.$eval(".live-panel", (el) => getComputedStyle(el).opacity === "1") && await page.$eval(".day-strip", (el) => el.childElementCount === 7));
  await page.setViewport({ width: 360, height: 800, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  check("small phone has no horizontal overflow", await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // A saved snapshot written by an older build has no key for a field added
  // since. Restoring it wholesale left that field undefined and the first
  // consumer to .filter() it took the whole page down.
  await go("today");
  for (const missing of ["blocks", "events", "tasks", "attendance", "subjects"]) {
    await page.evaluate((key, drop) => {
      const raw = JSON.parse(sessionStorage.getItem(key) || "null");
      if (raw?.data) { delete raw.data[drop]; sessionStorage.setItem(key, JSON.stringify(raw)); }
    }, "klasso-preview-v3", missing);
    await page.reload({ waitUntil: "networkidle0" }); await pause(400);
    check(`survives a saved snapshot with no "${missing}"`,
      await page.evaluate(() => !document.body.innerText.includes("Something went wrong")));
  }

  // Liquid Glass must actually reach the nav. A hand-written -webkit- prefix
  // once made the minifier drop the standard property, so the glass silently
  // vanished while the markup still looked right.
  await go("today");
  const glass = await page.evaluate(() => {
    const nav = document.querySelector(".bottom-nav");
    const c = getComputedStyle(nav);
    const others = [...document.querySelectorAll("*")]
      .filter((e) => !nav.contains(e) && e !== nav && !e.closest(".app-sidebar") && getComputedStyle(e).backdropFilter !== "none").length;
    return { filter: c.backdropFilter, radius: c.borderRadius, contentLayerGlass: others };
  });
  check("nav renders as Liquid Glass", glass.filter.includes("blur"), glass.filter);
  check("nav is a full pill", glass.radius.startsWith("999"), glass.radius);
  check("glass stays out of the content layer", glass.contentLayerGlass === 0, String(glass.contentLayerGlass));

  // Text scaling: the guideline asks for at least 200% enlargement.
  for (const scale of ["150%", "200%"]) {
    for (const screen of ["today", "planning", "tasks", "attendance", "timetable", "calendar", "settings"]) {
      await go(screen);
      await page.evaluate((s) => { document.documentElement.style.fontSize = s; }, scale);
      await pause(200);
      const over = await page.evaluate(() => {
        const limit = document.documentElement.clientWidth;
        const amount = document.documentElement.scrollWidth - limit;
        if (amount <= 0) return { amount, who: "" };
        const clipped = (el) => { for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n); if (["hidden","auto","scroll"].includes(o.overflowX)) return true; } return false; };
        const bad = [...document.querySelectorAll("*")].map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ el, r }) => r.right > limit + 1 && r.width > 0 && !clipped(el))[0];
        return { amount, who: bad ? `${bad.el.tagName.toLowerCase()}.${bad.el.className.toString().split(" ").slice(0,3).join(".")} "${(bad.el.textContent||"").trim().slice(0,30)}"` : "unknown" };
      });
      check(`${screen} survives ${scale} text`, over.amount === 0, `${over.amount}px — ${over.who}`);
    }
  }
  await page.evaluate(() => { document.documentElement.style.fontSize = ""; });

  // The in-app mark is transparent and takes its colour from the theme: green
  // on light, white on dark. It also renders more than once per page, so each
  // copy needs its own gradient id — a shared one resolved to the copy inside
  // the hidden sidebar and the tile silently disappeared.
  for (const [scheme, expected] of [["light", "rgb(33, 98, 76)"], ["dark", "rgb(255, 255, 255)"]]) {
    await go("today");
    // Drive the app's own theme attribute: an explicit choice overrides the
    // media query, which is exactly what a user toggling Appearance does.
    await page.evaluate((s) => { document.documentElement.dataset.theme = s; }, scheme);
    await pause(200);
    const mark = await page.evaluate(() => {
      const visible = [...document.querySelectorAll(".brandmark")].find((m) => m.getBoundingClientRect().width > 0);
      if (!visible) return { stroke: "no mark", tile: true };
      return { stroke: getComputedStyle(visible.querySelector(".bm-arc")).stroke, tile: Boolean(visible.querySelector("rect")) };
    });
    check(`brand mark is ${scheme === "light" ? "green on light" : "white on dark"}`, mark.stroke === expected, mark.stroke);
    check(`brand mark stays transparent in ${scheme}`, mark.tile === false, `tile rendered: ${mark.tile}`);
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });

  // The shell was capped at 1600px and centred, so on a wide viewport — which
  // is what low browser zoom produces — the app drifted inward and the fixed
  // sidebar drifted with it, leaving dead space down the left edge.
  for (const width of [1280, 1600, 1920, 2560]) {
    await page.setViewport({ width, height: 900 });
    await go("today");
    const left = await page.evaluate(() => {
      const el = document.querySelector(".app-sidebar");
      return el && getComputedStyle(el).display !== "none"
        ? Math.round(el.getBoundingClientRect().left) : null;
    });
    check(`sidebar stays pinned left at ${width}px`, left !== null && left <= 24, `left=${left}`);
  }
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  check("no uncaught browser errors", errors.length === 0, errors.join(" | "));
} catch (error) { failed++; console.error("FAIL  interaction sequence:", error); }
finally { await browser.close(); }
console.log(`\n${passed} passed; ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
