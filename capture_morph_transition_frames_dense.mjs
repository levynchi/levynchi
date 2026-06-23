import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const outDir = 'C:/levynchi/anim_frames/transition_debug_dense';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

await page.goto(`http://127.0.0.1:8000/morph-demo/?v=${Date.now()}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

let idx = 0;
async function shot(name) {
  const file = `${outDir}/${String(idx).padStart(2, '0')}_${name}.png`;
  idx += 1;
  await page.screenshot({ path: file, fullPage: true });
}

await shot('home_before_click');
await page.click('#btn-gallery');
await shot('t0_click');

for (let i = 1; i <= 24; i += 1) {
  await page.waitForTimeout(60);
  await shot(`t${i}_${i * 60}ms`);
}

await page.waitForTimeout(400);
await shot('gallery_settled');

await browser.close();
console.log(`Saved ${idx} screenshots to ${outDir}`);
