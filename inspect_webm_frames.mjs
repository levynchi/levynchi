import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const videoFile = 'file:///C:/levynchi/anim_frames/video/871d0510334436a49edf76eeb16d794d.webm';
const outDir = 'C:/levynchi/anim_frames/video_inspect';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 980, height: 920 } });
const page = await context.newPage();

await page.setContent(`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; background: #0b0b12; color: #fff; font-family: Arial, sans-serif; }
      .wrap { padding: 12px; }
      .title { font-weight: 700; margin-bottom: 8px; }
      video { width: 100%; height: 860px; object-fit: contain; background: #000; border-radius: 10px; border: 1px solid #2b2b3d; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="title">Inspect: ${videoFile}</div>
      <video id="v" src="${videoFile}" muted playsinline></video>
    </div>
  </body>
</html>`);

await page.waitForTimeout(400);

async function grab(atSeconds, name) {
  await page.evaluate(async (t) => {
    const v = document.getElementById('v');
    await new Promise((r) => { if (v.readyState >= 1) r(); else v.onloadedmetadata = r; });
    v.currentTime = t;
    await new Promise((r) => v.onseeked = r);
    v.pause();
  }, atSeconds);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
}

await grab(0.3, 't0_0p3s');
await grab(0.8, 't1_0p8s');
await grab(1.2, 't2_1p2s');
await grab(1.6, 't3_1p6s');
await grab(2.0, 't4_2p0s');

await browser.close();
console.log(`Saved inspected frames to ${outDir}`);

