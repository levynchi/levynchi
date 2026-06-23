import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const outDir = 'C:/levynchi/anim_frames/video';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  recordVideo: {
    dir: outDir,
    size: { width: 390, height: 844 },
  },
});

const page = await context.newPage();
await page.goto('http://127.0.0.1:8000/morph-demo/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// Show morph cards order: home → gallery → home → gallery (list should match placeholders)
await page.click('#btn-gallery');
await page.waitForTimeout(1600);
await page.click('#btn-home');
await page.waitForTimeout(1200);
await page.click('#btn-gallery');
await page.waitForTimeout(2000);

await page.waitForTimeout(400);
const video = page.video();
await context.close();
await browser.close();

if (video) {
  const videoPath = await video.path();
  console.log(`Gallery order check video: ${videoPath}`);
}
