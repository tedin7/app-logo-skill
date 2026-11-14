// Build a site's icons from the chosen logo, hybrid setup:
//   favicon.ico (16+32)            from the FLAT icon (crisp at tab size)
//   icon-192.png, icon-512.png     from the 3D render, gray Vitrum background removed, transparent corners
//   apple-touch-icon.png (180)     from the 3D render, full bleed, no transparency (iOS rounds it)
//   apple-touch-icon-precomposed.png  same as apple-touch-icon.png
//
// Usage: node site_icons.js RENDER_3D.png FLAT_TRANSPARENT.png OUT_DIR/ [#rrggbb]
//   RENDER_3D.png         Vitrum PNG export (front view), square
//   FLAT_TRANSPARENT.png  flat icon with transparent background (transparent_bg.py)
//   #rrggbb               fill color for the apple-touch icon edges (default: sampled from the center)
// Requires sharp (npm i sharp, outside the site repo; run with NODE_PATH pointing to it).
//
// Background detection: Vitrum's scene background is a light, almost neutral gray. A pixel is
// background when it is light and has low saturation. Check the output with your own eyes.
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const [,, RENDER_3D, FLAT, OUT_DIR, APPLE_FILL] = process.argv;
const PWA_SIZES = [512, 192];
const FAVICON_SIZES = [16, 32];
const APPLE_SIZE = 180;
const APPLE_INSET_RATIO = 0.03;

const isSceneBackground = (r, g, b) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max > 170 && (max - min) < 28;
};

function floodFromEdges(data, width, height) {
  const background = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1);
  while (stack.length) {
    const p = stack.pop();
    if (background[p] || !isSceneBackground(data[p * 4], data[p * 4 + 1], data[p * 4 + 2])) continue;
    background[p] = 1;
    const x = p % width, y = (p / width) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - width);
    if (y < height - 1) stack.push(p + width);
  }
  return background;
}

function boundingBox(alpha, width, height) {
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let i = 0; i < width * height; i++) {
    if (alpha[i] <= 128) continue;
    const x = i % width, y = (i / width) | 0;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function squareCrop(rgba, width, height, alpha) {
  const box = boundingBox(alpha, width, height);
  const side = Math.max(box.width, box.height);
  return sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract(box)
    .extend({ right: side - box.width, bottom: side - box.height, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
}

async function cutout3d() {
  const { data, info } = await sharp(RENDER_3D).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const background = floodFromEdges(data, width, height);
  const mask = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) mask[i] = background[i] ? 0 : 255;
  // erode (blur + high threshold) and soften the edge
  const soft = await sharp(mask, { raw: { width, height, channels: 1 } })
    .blur(3).threshold(250).blur(1.2).extractChannel(0).raw().toBuffer();
  const rgba = Buffer.from(data);
  for (let i = 0; i < width * height; i++) rgba[i * 4 + 3] = soft[i];
  return squareCrop(rgba, width, height, soft);
}

async function flatCropped() {
  const { data, info } = await sharp(FLAT).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const alpha = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) alpha[i] = data[i * 4 + 3];
  return squareCrop(data, width, height, alpha);
}

function icoFromPngs(pngs, sizes) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map((png, i) => {
    const entry = Buffer.alloc(16);
    entry[0] = sizes[i]; entry[1] = sizes[i];
    entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8); entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...pngs]);
}

async function centerColor(image) {
  const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
  const p = ((info.height >> 2) * info.width + (info.width >> 2)) * info.channels;
  return { r: data[p], g: data[p + 1], b: data[p + 2] };
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

(async () => {
  if (!RENDER_3D || !FLAT || !OUT_DIR) throw new Error('usage: node site_icons.js RENDER_3D.png FLAT.png OUT_DIR/ [#rrggbb]');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = name => path.join(OUT_DIR, name);

  const icon3d = await cutout3d();
  for (const size of PWA_SIZES) {
    await sharp(icon3d).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(out(`icon-${size}.png`));
  }
  const side = (await sharp(icon3d).metadata()).width;
  const inset = Math.round(side * APPLE_INSET_RATIO);
  const fill = APPLE_FILL ? hexToRgb(APPLE_FILL) : await centerColor(icon3d);
  const apple = await sharp(icon3d)
    .extract({ left: inset, top: inset, width: side - 2 * inset, height: side - 2 * inset })
    .flatten({ background: fill }).resize(APPLE_SIZE, APPLE_SIZE, { kernel: 'lanczos3' })
    .png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(out('apple-touch-icon.png'), apple);
  fs.writeFileSync(out('apple-touch-icon-precomposed.png'), apple);

  const flat = await flatCropped();
  const pngs = [];
  for (const size of FAVICON_SIZES) {
    pngs.push(await sharp(flat).resize(size, size, { kernel: 'lanczos3', fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer());
  }
  fs.writeFileSync(out('favicon.ico'), icoFromPngs(pngs, FAVICON_SIZES));
  console.log('SAVED icons in', OUT_DIR);
})().catch(e => { console.error(e.message); process.exit(1); });
