import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const outDir = 'C:/levynchi/anim_frames/video';
mkdirSync(outDir, { recursive: true });

const beforeSrc = 'file:///C:/levynchi/anim_frames/video/911a8ecc9edbf094de74f91b96a45f10.webm';
const afterSrc = 'file:///C:/levynchi/anim_frames/video/75a72ab1ce31428f183974714db008e2.webm';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 860, height: 900 },
  recordVideo: {
    dir: outDir,
    size: { width: 860, height: 900 },
  },
});

const page = await context.newPage();
await page.setContent(`
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      body { margin: 0; background: #0b0b12; color: #fff; font-family: Arial, sans-serif; }
      .wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px; }
      .card { background: #161624; border: 1px solid #2b2b3d; border-radius: 10px; overflow: hidden; }
      .title { padding: 8px 10px; font-weight: 700; font-size: 14px; letter-spacing: .02em; }
      video { width: 100%; height: 820px; object-fit: contain; background: #000; display: block; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="title">Before (jump visible)</div>
        <video id="before" src="${beforeSrc}" muted playsinline></video>
      </div>
      <div class="card">
        <div class="title">After (smoothed hand-off)</div>
        <video id="after" src="${afterSrc}" muted playsinline></video>
      </div>
    </div>
    <script>
      const a = document.getElementById('before');
      const b = document.getElementById('after');
      Promise.all([
        new Promise(r => a.onloadedmetadata = r),
        new Promise(r => b.onloadedmetadata = r),
      ]).then(async () => {
        a.currentTime = 0;
        b.currentTime = 0;
        await a.play();
        await b.play();
      });
    </script>
  </body>
</html>`);

await page.waitForTimeout(7000);

const video = page.video();
await context.close();
await browser.close();

if (video) {
  const path = await video.path();
  console.log(`Side-by-side compare video: ${path}`);
}
