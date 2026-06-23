import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const outDir = 'C:/levynchi/anim_frames/about_gallery_ae_dense';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

await page.goto(`http://127.0.0.1:8000/morph-demo/?v=${Date.now()}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

// Start from the About page so the captured sequence is specifically About -> Gallery.
await page.click('#btn-about');
await page.waitForTimeout(1400);

let index = 0;
function fileName(label) {
  return `${outDir}/${String(index).padStart(4, '0')}_${label}.png`;
}

await page.screenshot({ path: fileName('about_start'), fullPage: true });
index += 1;

await page.click('#btn-gallery');

const stepMs = 20;
const endMs = 1600;
let prev = 0;
for (let t = stepMs; t <= endMs; t += stepMs) {
  await page.waitForTimeout(t - prev);
  prev = t;
  await page.screenshot({ path: fileName(`ag_${String(t).padStart(4, '0')}ms`), fullPage: true });
  index += 1;
}

await page.waitForTimeout(500);
await page.screenshot({ path: fileName('gallery_settled'), fullPage: true });

await browser.close();
console.log(outDir);
