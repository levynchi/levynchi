import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const outDir = 'C:/levynchi/anim_frames/transition_debug';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

await page.goto('http://127.0.0.1:8000/morph-demo/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

let i = 0;
async function shot(name) {
  const file = `${outDir}/${String(i).padStart(2, '0')}_${name}.png`;
  i += 1;
  await page.screenshot({ path: file, fullPage: true });
}

await shot('home_before_click');

await page.click('#btn-gallery');
await shot('t0_click');

for (const [name, delay] of [
  ['t1_80ms', 80],
  ['t2_160ms', 80],
  ['t3_240ms', 80],
  ['t4_320ms', 80],
  ['t5_420ms', 100],
  ['t6_560ms', 140],
  ['t7_740ms', 180],
  ['t8_980ms', 240],
  ['t9_1300ms', 320],
]) {
  await page.waitForTimeout(delay);
  await shot(name);
}

await browser.close();
console.log(`Saved ${i} screenshots to ${outDir}`);
