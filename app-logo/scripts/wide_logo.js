// Wide logo (icon + site name) for a cookie consent banner such as Google AdSense / Funding Choices:
// PNG, 5:1, transparent background, far below the 150 KB limit. Uses the header's real font.
//
// Usage: node wide_logo.js FLAT_ICON.png FONT.woff2 OUT.png "TRENI" "#090b0f" "AMO" "#4b65d9"
//   FONT.woff2  the font of the site's header, downloaded from the site itself (look for the .woff2
//               file referenced in the HTML). Google Fonts often fails from a server and the logo then
//               silently falls back to Arial: check the result with your own eyes.
//   The name is split in two parts so each can have its own color; the second part is optional.
// Environment: PLAYWRIGHT_CORE, CHROME_PATH (see vitrum.js).
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('fs');

const [,, ICON, FONT, OUT, PART1, COLOR1, PART2 = '', COLOR2] = process.argv;
const WIDTH = 1000;
const HEIGHT = 200;
const ICON_SIZE = 170;
const FONT_SIZE = 118;

const base64 = file => fs.readFileSync(file).toString('base64');
const escapeHtml = text => text.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

function page() {
  return `<!doctype html><html><head><style>
@font-face{font-family:'SiteFont';font-weight:100 900;src:url(data:font/woff2;base64,${base64(FONT)}) format('woff2')}
html,body{margin:0;background:transparent}
.box{width:${WIDTH}px;height:${HEIGHT}px;display:flex;align-items:center;justify-content:center;gap:34px}
.icon{width:${ICON_SIZE}px;height:${ICON_SIZE}px;border-radius:20%;
  background:url(data:image/png;base64,${base64(ICON)}) center/112% no-repeat}
.name{font-family:'SiteFont',sans-serif;font-weight:700;font-size:${FONT_SIZE}px;letter-spacing:-3px;line-height:1}
</style></head><body><div class="box"><div class="icon"></div><div class="name">
<span style="color:${COLOR1}">${escapeHtml(PART1)}</span><span style="color:${COLOR2 || COLOR1}">${escapeHtml(PART2)}</span>
</div></div></body></html>`;
}

(async () => {
  if (!ICON || !FONT || !OUT || !PART1 || !COLOR1) {
    throw new Error('usage: node wide_logo.js FLAT_ICON.png FONT.woff2 OUT.png PART1 COLOR1 [PART2 COLOR2]');
  }
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const tab = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  await tab.setContent(page(), { waitUntil: 'networkidle' });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: OUT, omitBackground: true });
  console.log('SAVED', OUT, fs.statSync(OUT).size, 'bytes');
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
