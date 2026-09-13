// Browser zoom reduces the CSS viewport. Exercise that reflow at 50–400%,
// separately from verify-ui's 150/200% text-only scaling.
import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
let failed = 0, passed = 0;
try {
  for (const zoom of [.5, .75, 1, 1.25, 1.5, 2, 3, 4]) {
    const width = Math.round(1440 / zoom), height = Math.round(1000 / zoom);
    await page.setViewport({ width, height, deviceScaleFactor: zoom });
    for (const screen of ["planning", "calendar", "today", "tasks", "timetable", "settings", "attendance"]) {
      await page.goto(`http://localhost:3000/preview?s=${screen}`, { waitUntil: "networkidle0" });
      const result = await page.evaluate(() => {
        const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        const nav = document.querySelector(".bottom-nav");
        const r = nav.getBoundingClientRect();
        const navFits = getComputedStyle(nav).display === "none" || r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
        return { overflow, navFits };
      });
      const okay = result.overflow <= 1 && result.navFits;
      okay ? passed++ : failed++;
      console.log(`${okay ? "PASS" : "FAIL"}  ${screen}, ${zoom * 100}% zoom-equivalent viewport (${width}×${height})${okay ? "" : ` ${JSON.stringify(result)}`}`);
    }
  }

  // The landing page is the other half of this: its scenes are pinned at
  // 100dvh, so anything that does not cap its height against the viewport
  // gets clipped by the pin rather than pushing the page taller.
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  for (const zoom of [.5, .75, 1, 1.25, 1.5, 2, 3, 4]) {
    const width = Math.round(1440 / zoom), height = Math.round(1000 / zoom);
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto("http://localhost:3000/", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 900));
    const result = await page.evaluate(() => {
      const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const fits = (sel, box) => [...document.querySelectorAll(sel)]
        .every((el) => el.getBoundingClientRect().height <= document.querySelector(box).clientHeight + 1);
      const brand = document.querySelector(".lp-brand").getBoundingClientRect();
      return {
        overflow,
        // tallest child of each pinned scene must fit the scene's viewport
        panFits: fits(".lp-pan-card", ".lp-pan-track"),
        stackFits: fits(".stack-inner", ".stack-vp"),
        brandOn: brand.top >= 0 && brand.left >= 0 && brand.right <= innerWidth,
      };
    });
    const okay = result.overflow <= 1 && result.panFits && result.stackFits && result.brandOn;
    okay ? passed++ : failed++;
    console.log(`${okay ? "PASS" : "FAIL"}  landing, ${zoom * 100}% zoom-equivalent viewport (${width}x${height})${okay ? "" : ` ${JSON.stringify(result)}`}`);
  }
} finally { await browser.close(); }
console.log(`\n${passed} passed; ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
