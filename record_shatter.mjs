import { chromium } from 'playwright';
import { mkdirSync, readdirSync } from 'fs';

const dir = 'C:/levynchi/anim_frames/fix1';
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 390, height: 760 } });
const page = await context.newPage();

// Start on About page, transition to Home
await page.goto('http://localhost:8000/about/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// Open menu
await page.click('button.nav-toggle');
await page.waitForTimeout(450);

// Click Home — triggers shatter after 400ms menu close
page.click('#site-nav .js-spa-nav[data-route="home"]').catch(() => {});

// Capture frames — start at ~200ms, capture for ~1.4s
let idx = 0;
for (let i = 0; i < 45; i++) {
  await page.waitForTimeout(i < 5 ? 60 : 32);
  await page.screenshot({ path: `${dir}/f${String(idx++).padStart(3,'0')}.png` });
}

await browser.close();
console.log('Done:', readdirSync(dir).length, 'frames');
