// Screenshots every screen of the preview harness at iPhone size, light + dark.
import { mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = process.argv[2] || "/tmp/klasso-shots";
const SCREENS = ["today", "timetable", "calendar", "planning", "tasks", "attendance", "settings", "login", "loading"];
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--no-sandbox", "--force-device-scale-factor=2"],
});

const problems = [];
for (const viewport of [{ name: "mobile", width: 390, height: 844 }, { name: "desktop", width: 1440, height: 1000 }]) {
for (const scheme of ["light", "dark"]) {
  const page = await browser.newPage();
  // Headless Chrome reports prefers-reduced-motion: reduce, which silently
  // skips every entrance animation unless it is overridden.
  const client = await page.createCDPSession();
  await client.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: scheme },
      { name: "prefers-reduced-motion", value: "no-preference" },
    ],
  });
  await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1, isMobile: viewport.name === "mobile", hasTouch: viewport.name === "mobile" });

  page.on("pageerror", (e) => problems.push(`[${scheme}] pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`[${scheme}] console: ${m.text()}`);
  });

  for (const s of SCREENS) {
    await page.goto(s === "login" ? "http://localhost:3000/login" : `http://localhost:3000/preview?s=${s}`, { waitUntil: "networkidle0", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 450));

    // Catch layout escapes that a screenshot alone can hide.
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) problems.push(`[${scheme}/${s}] horizontal overflow: ${overflow}px`);

    await page.screenshot({ path: `${OUT}/${s}-${scheme}-${viewport.name}.png`, fullPage: true });
    if (s === "today") await page.screenshot({ path: `${OUT}/${s}-${scheme}-${viewport.name}-viewport.png` });
    console.log(`${s}-${scheme}-${viewport.name}.png`);
    if (s === "calendar") {
      await page.click('main .calendar-cell[aria-current="date"]');
      await new Promise((r) => setTimeout(r, 450));
      await page.screenshot({ path: `${OUT}/calendar-sheet-${scheme}-${viewport.name}.png` });
      const footer = await page.$eval('.sheet-footer', (el) => parseFloat(getComputedStyle(el).paddingBottom));
      if (footer < 20) problems.push(`Calendar sheet footer has only ${footer}px bottom padding`);
    }
    if (s === "planning") {
      await page.goto('http://localhost:3000/preview?s=planning&new=meeting', { waitUntil: "networkidle0" });
      await new Promise((r) => setTimeout(r, 450));
      await page.screenshot({ path: `${OUT}/meeting-sheet-${scheme}-${viewport.name}.png` });
      await page.$eval('[aria-label="Plan subject"]', (el) => el.scrollIntoView({ block: "center" }));
      await page.click('[aria-label="Plan subject"]');
      await new Promise((r) => setTimeout(r, 200));
      await page.screenshot({ path: `${OUT}/dropdown-${scheme}-${viewport.name}.png` });
      await page.keyboard.press('Escape');
      await page.$eval('[aria-label="Plan date"]', (el) => el.scrollIntoView({ block: "center" }));
      await page.click('[aria-label="Plan date"]');
      await new Promise((r) => setTimeout(r, 200));
      await page.screenshot({ path: `${OUT}/date-picker-${scheme}-${viewport.name}.png` });
    }
  }
  await page.close();
}
}

await browser.close();
if (problems.length) {
  console.log("\nPROBLEMS:");
  for (const p of [...new Set(problems)]) console.log("  " + p);
  process.exitCode = 1;
} else {
  console.log("\nNo console errors, no horizontal overflow.");
}
