// Turn a flat icon into a 3D icon with Vitrum (https://usevitrum.com/studio) in headless Chromium.
// No account needed.
//
// Usage: VIEW=Front OUT=/path/out.png node vitrum.js ICON.png TAG Stack tab=Material Color
//   ICON.png  PNG with a transparent background outside the rounded square (see transparent_bg.py)
//   options   button names clicked in order; "tab=Material" opens the Material tab.
//             Recipe that keeps the original colors: geometry "Stack", finish "Color".
//   VIEW      final camera view: Front (straight, use this for icons) or Angle.
//   OUT       where to save Vitrum's PNG export; without OUT it only takes a screenshot of the studio.
//   SHOT=1    save a screenshot instead of the export (when the export stays turned sideways).
//   SCALE=1.5 sharper screenshots with SHOT.
//   DIR       folder for studio screenshots when OUT is not set (default /tmp).
//
// Known quirks: the Front view sometimes does not stick (the camera keeps swaying): always look at
// the result and retry. The PNG export keeps the gray scene background: remove it afterwards.
// Environment: PLAYWRIGHT_CORE (path to the playwright-core module, default "playwright-core"),
// CHROME_PATH (Chromium executable, default: the one bundled with Playwright).
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');

const [,, img, tag, ...opts] = process.argv;
const DIR = process.env.DIR || '/tmp';
const RENDER_WAIT_MS = 15000; // the 3D is computed in software on a server without a GPU
const STEP_WAIT_MS = 8000;
const VIEW_WAIT_MS = 20000;

async function clickOption(page, option) {
  const [kind, name] = option.includes('=') ? option.split('=') : ['button', option];
  if (kind === 'tab') {
    await page.getByRole('tab', { name }).click()
      .catch(() => page.getByText(name, { exact: true }).first().click());
  } else {
    await page.getByRole('button', { name, exact: true }).first().click();
  }
  await page.waitForTimeout(STEP_WAIT_MS);
}

async function saveResult(page) {
  await page.getByRole('button', { name: 'Hide panel' }).click()
    .catch(e => console.log('VIEW ERROR', e.message.slice(0, 200)));
  await page.waitForTimeout(3000);
  await page.getByText(process.env.VIEW || 'Front', { exact: true }).last().click({ force: true })
    .catch(e => console.log('VIEW ERROR', e.message.slice(0, 200)));
  await page.waitForTimeout(VIEW_WAIT_MS);
  if (process.env.SHOT) {
    await page.screenshot({ path: process.env.OUT });
  } else {
    await page.getByRole('button', { name: 'Export' }).click();
    await page.waitForTimeout(1000);
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }),
      page.getByText('PNG image').click(),
    ]);
    await download.saveAs(process.env.OUT);
  }
  console.log('SAVED', process.env.OUT);
}

(async () => {
  if (!img) throw new Error('usage: node vitrum.js ICON.png TAG [options...]');
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || undefined,
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({
    viewport: { width: 1300, height: 1100 },
    acceptDownloads: true,
    deviceScaleFactor: Number(process.env.SCALE || 1),
  });
  page.on('pageerror', e => console.log('PAGE ERROR', e.message));
  await page.goto('https://usevitrum.com/studio', { waitUntil: 'networkidle', timeout: 60000 });
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByText('Choose image').first().click(),
  ]);
  await chooser.setFiles(img);
  await page.waitForTimeout(RENDER_WAIT_MS);
  for (const option of opts) await clickOption(page, option);
  if (process.env.OUT) {
    await saveResult(page);
  } else {
    const shot = `${DIR}/${tag || 'vitrum'}.png`;
    await page.screenshot({ path: shot });
    console.log('SCREENSHOT', shot);
  }
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
