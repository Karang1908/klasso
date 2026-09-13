// Rasterises assets/*.svg into the PNG sizes the PWA and iOS need.
// Run: node scripts/build-icons.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const logo = readFileSync("assets/logo.svg");
const maskable = readFileSync("assets/logo-maskable.svg");
const badge = readFileSync("assets/badge.svg");
const square = readFileSync("assets/logo-square.svg");
const og = readFileSync("assets/og.svg");

mkdirSync("public/icons", { recursive: true });

// Everything that a platform masks for itself must be a full-bleed SQUARE.
// iOS, Android and link-preview scrapers all composite transparency onto white
// before applying their own shape, so pre-rounded transparent art shows up as
// white corners around the icon. Only the badge keeps an alpha channel.
const jobs = [
  [square, "public/icons/icon-192.png", 192, true],
  [square, "public/icons/icon-512.png", 512, true],
  [maskable, "public/icons/maskable-192.png", 192, true],
  [maskable, "public/icons/maskable-512.png", 512, true],
  [square, "public/icons/apple-touch-icon.png", 180, true],
  [square, "src/app/apple-icon.png", 180, true],
  // Monochrome notification badge: alpha is the whole point here.
  [badge, "public/icons/badge-96.png", 96, false],
];

for (const [svg, out, size, opaque] of jobs) {
  let pipe = sharp(svg, { density: 384 }).resize(size, size);
  // Belt and braces: even a square source can carry a stray alpha channel.
  if (opaque) pipe = pipe.flatten({ background: "#1B4E3B" });
  await pipe.png({ compressionLevel: 9 }).toFile(out);
  console.log(`${out}  ${size}x${size}${opaque ? "  opaque" : "  alpha"}`);
}

// Link preview. Next picks src/app/opengraph-image.png up by file convention.
await sharp(og, { density: 192 }).resize(1200, 630)
  .flatten({ background: "#143F31" })
  .png({ compressionLevel: 9 })
  .toFile("src/app/opengraph-image.png");
console.log("src/app/opengraph-image.png  1200x630  opaque");

// Favicon: a real multi-size .ico so browsers and the Windows taskbar are happy.
// Transparent PNG fallback for browsers that do not take an SVG favicon.
const ico = await sharp(readFileSync("assets/favicon.svg"), { density: 384 }).resize(32, 32).png().toBuffer();
writeFileSync("public/favicon.png", ico);
console.log("public/favicon.png  32x32");
