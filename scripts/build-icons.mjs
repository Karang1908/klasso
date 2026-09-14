// Rasterises assets/*.svg into the PNG sizes the PWA and iOS need.
// Run: node scripts/build-icons.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const logo = readFileSync("assets/logo.svg");
const maskable = readFileSync("assets/logo-maskable.svg");
const badge = readFileSync("assets/badge.svg");
const square = readFileSync("assets/logo-square.svg");
const og = readFileSync("assets/og.svg");
const brandmark = readFileSync("assets/logo-brandmark.svg");

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

// 120x120 transparent mark for third-party branding (Google's consent screen
// asks for exactly this size). Alpha is kept: it sits on someone else's page.
await sharp(brandmark, { density: 512 }).resize(120, 120)
  .png({ compressionLevel: 9 })
  .toFile("public/icons/brandmark-120.png");
console.log("public/icons/brandmark-120.png  120x120  alpha");

// Link preview. Next picks src/app/opengraph-image.png up by file convention.
await sharp(og, { density: 192 }).resize(1200, 630)
  .flatten({ background: "#143F31" })
  .png({ compressionLevel: 9 })
  .toFile("src/app/opengraph-image.png");
console.log("src/app/opengraph-image.png  1200x630  opaque");

// Favicon. Google's favicon crawler falls back to /favicon.ico and does not
// reliably take an SVG-only icon, which is why the search result showed a
// generic globe. Next serves src/app/favicon.ico at /favicon.ico.
//
// .ico is a container: a 6-byte header, one 16-byte directory entry per image,
// then the image payloads. PNG payloads have been legal inside .ico since
// Vista, so there is no need for a BMP encoder or an extra dependency.
const favSvg = readFileSync("assets/favicon.svg");
// 48 is the size Google asks for; 16 and 32 are what browser chrome uses.
const FAV_SIZES = [16, 32, 48];
const frames = await Promise.all(FAV_SIZES.map((n) =>
  sharp(favSvg, { density: 512 }).resize(n, n).png({ compressionLevel: 9 }).toBuffer()));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);               // reserved
header.writeUInt16LE(1, 2);               // 1 = icon
header.writeUInt16LE(frames.length, 4);

let offset = 6 + frames.length * 16;
const entries = frames.map((png, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(FAV_SIZES[i] === 256 ? 0 : FAV_SIZES[i], 0);
  e.writeUInt8(FAV_SIZES[i] === 256 ? 0 : FAV_SIZES[i], 1);
  e.writeUInt8(0, 2);                     // palette size
  e.writeUInt8(0, 3);                     // reserved
  e.writeUInt16LE(1, 4);                  // colour planes
  e.writeUInt16LE(32, 6);                 // bits per pixel
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});
writeFileSync("src/app/favicon.ico", Buffer.concat([header, ...entries, ...frames]));
console.log(`src/app/favicon.ico  ${FAV_SIZES.join("/")}  multi-size`);

// PNG fallback for anything that wants one by URL.
writeFileSync("public/favicon.png", frames[1]);
console.log("public/favicon.png  32x32");
