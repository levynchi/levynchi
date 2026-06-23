/**
 * צילום מעבר אודות ↔ גלריה ב-morph-demo לפי שלבי buildMorphGalleryAboutDebugPhases.
 * פלט: anim_frames/morph_about_gallery/{about_to_gallery,gallery_to_about}/NN_id.png + index.html + manifest.json
 *
 * דרישה: שרת Django על http://127.0.0.1:8000/
 * הרצה: node capture_morph_about_gallery.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = 'http://127.0.0.1:8000/morph-demo/';
const ROOT = join('anim_frames', 'morph_about_gallery');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeFileId(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function waitMorphIdle(page, ms = 2200) {
  await sleep(ms);
}

async function getSteps(page, direction) {
  return page.evaluate((d) => {
    const about = document.getElementById('page-about');
    const gallery = document.getElementById('page-gallery');
    if (!window.buildMorphGalleryAboutDebugPhases) return [];
    if (d === 'about_to_gallery') {
      return window.buildMorphGalleryAboutDebugPhases(about, 'gallery', gallery);
    }
    return window.buildMorphGalleryAboutDebugPhases(gallery, 'about', about);
  }, direction);
}

async function captureSequence(page, direction, manifest) {
  const sub = direction === 'about_to_gallery' ? 'about_to_gallery' : 'gallery_to_about';
  const dir = join(ROOT, sub);
  mkdirSync(dir, { recursive: true });

  const steps = await getSteps(page, direction);
  steps.sort((a, b) => a.tMs - b.tMs || String(a.id).localeCompare(String(b.id)));

  const btn = direction === 'about_to_gallery' ? '#btn-gallery' : '#btn-about';

  await page.click(btn);

  let prev = 0;
  let idx = 0;
  for (const s of steps) {
    const delta = s.tMs - prev;
    if (delta > 0) await sleep(delta);
    prev = s.tMs;
    const fname = `${String(idx).padStart(2, '0')}_${safeFileId(s.id)}.png`;
    const fpath = join(dir, fname);
    await page.screenshot({ path: fpath, fullPage: true });
    manifest.push({
      direction: sub,
      file: `${sub}/${fname}`,
      id: s.id,
      label: s.label,
      tMs: s.tMs,
    });
    idx += 1;
  }

  await sleep(500);
  const settledName = `${String(idx).padStart(2, '0')}_settled_after.png`;
  const settledPath = join(dir, settledName);
  await page.screenshot({ path: settledPath, fullPage: true });
  manifest.push({
    direction: sub,
    file: `${sub}/${settledName}`,
    id: 'settled_after',
    label: 'After transition (~500ms after last debug step)',
    tMs: null,
  });
}

function writeIndexHtml(manifest) {
  const byDir = { about_to_gallery: [], gallery_to_about: [] };
  for (const m of manifest) {
    if (byDir[m.direction]) byDir[m.direction].push(m);
  }

  const section = (title, key) => {
    const items = byDir[key] || [];
    return `
  <section class="group" id="${key}">
    <h2>${title}</h2>
    ${items
      .map(
        (m) => `
    <figure>
      <figcaption><span class="id">${escapeHtml(m.id)}</span>${m.tMs != null ? ` <span class="t">tMs=${m.tMs}</span>` : ''}</figcaption>
      <p class="label">${escapeHtml(m.label)}</p>
      <a href="${escapeHtml(m.file)}" target="_blank" rel="noopener"><img src="${escapeHtml(m.file)}" alt="${escapeHtml(m.id)}" loading="lazy" width="390" /></a>
    </figure>`
      )
      .join('\n')}
  </section>`;
  };

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Morph — אודות ↔ גלריה</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0d0b17; color: #e8e6f0; margin: 0; padding: 24px; line-height: 1.45; }
    h1 { font-size: 1.25rem; margin-bottom: 8px; }
    h2 { font-size: 1.05rem; color: #9fe7c8; margin: 28px 0 16px; border-bottom: 1px solid #2a2836; padding-bottom: 8px; }
    figure { margin: 0 0 28px; padding: 16px; background: #13111c; border: 1px solid #2a2836; border-radius: 12px; }
    figcaption { font-family: ui-monospace, Consolas, monospace; font-size: 13px; margin-bottom: 8px; }
    .id { color: #7dd3fc; font-weight: 600; }
    .t { color: #a8a29e; font-size: 12px; }
    .label { font-size: 12px; color: #a8a29e; margin: 0 0 12px; }
    img { display: block; max-width: min(100%, 420px); height: auto; border-radius: 8px; border: 1px solid #2a2836; }
    a { color: inherit; text-decoration: none; }
    a:hover img { outline: 2px solid #00d9c8; outline-offset: 2px; }
    p.note { font-size: 13px; color: #888; margin-bottom: 24px; }
  </style>
</head>
<body>
  <h1>צילומי מעבר morph-demo (אודות ↔ גלריה)</h1>
  <p class="note">כל תמונה נקראת לפי מזהה השלב (id). פתח את הקובץ index.html מהדיסק (או דרך שרת סטטי) כדי לראות תמונות.</p>
  ${section('אודות → גלריה', 'about_to_gallery')}
  ${section('גלריה → אודות', 'gallery_to_about')}
</body>
</html>`;
  writeFileSync(join(ROOT, 'index.html'), html, 'utf8');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();

console.log('Loading', BASE);
await page.goto(BASE, { waitUntil: 'networkidle' });
await sleep(600);

// —— Home → About (התחלה מדף אודות)
await page.click('#btn-about');
await waitMorphIdle(page);

const manifest = [];

// —— About → Gallery
console.log('Capturing about → gallery…');
await captureSequence(page, 'about_to_gallery', manifest);
await waitMorphIdle(page);

// —— Gallery → About
console.log('Capturing gallery → about…');
await captureSequence(page, 'gallery_to_about', manifest);
await waitMorphIdle(page);

writeFileSync(join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
writeIndexHtml(manifest);

await browser.close();
console.log('Done. Open', join(ROOT, 'index.html'));
console.log('Manifest:', join(ROOT, 'manifest.json'));
