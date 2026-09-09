// Rasterises assets/*.svg into the PNG sizes the PWA and iOS need.
// Run: node scripts/build-icons.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const logo = readFileSync("assets/logo.svg");
const maskable = readFileSync("assets/logo-maskable.svg");
const badge = readFileSync("assets/badge.svg");

mkdirSync("public/icons", { recursive: true });

const jobs = [
  [logo, "public/icons/icon-192.png", 192],
  [logo, "public/icons/icon-512.png", 512],
  [maskable, "public/icons/maskable-192.png", 192],
  [maskable, "public/icons/maskable-512.png", 512],
  // iOS home-screen icon. Safari does not round corners for you on all
  // versions, and it never respects transparency, so this is the squircle art.
  [logo, "public/icons/apple-touch-icon.png", 180],
  [logo, "src/app/apple-icon.png", 180],
  [badge, "public/icons/badge-96.png", 96],
];

for (const [svg, out, size] of jobs) {
  await sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
  console.log(`${out}  ${size}x${size}`);
}

// Favicon: a real multi-size .ico so browsers and the Windows taskbar are happy.
// Transparent PNG fallback for browsers that do not take an SVG favicon.
const ico = await sharp(readFileSync("assets/favicon.svg"), { density: 384 }).resize(32, 32).png().toBuffer();
writeFileSync("public/favicon.png", ico);
console.log("public/favicon.png  32x32");
