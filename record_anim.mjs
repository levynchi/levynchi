import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const framesDir = 'C:/levynchi/anim_frames/shots';
mkdirSync(framesDir, { recursive: true });

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

await page.goto('http://localhost:8000/');
await page.waitForTimeout(600);

// Open menu
await page.click('button.nav-toggle');
await page.waitForTimeout(500);

let idx = 0;
async function snap() {
  await page.screenshot({ path: `${framesDir}/f${String(idx++).padStart(4,'0')}.png` });
}

// Take a few frames before transition
for (let i = 0; i < 3; i++) { await snap(); await page.waitForTimeout(50); }

// Trigger transition and capture rapidly
page.click('a[href="/about/"]').catch(() => {});
for (let i = 0; i < 30; i++) { await snap(); await page.waitForTimeout(25); }

// Settled state
for (let i = 0; i < 3; i++) { await snap(); await page.waitForTimeout(100); }

await browser.close();
console.log(`Saved ${idx} frames to ${framesDir}`);
