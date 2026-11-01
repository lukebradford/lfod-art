// Structural checks on the shipped site that keep deploys safe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../site/', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8');

test('every module in site/js is version-stamped through the import map', () => {
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  const modules = fs.readdirSync(new URL('js/', root)).filter((f) => f.endsWith('.js'));
  for (const m of modules) {
    if (m === 'main.js') continue; // loaded directly by the <script> tag below
    assert.equal(map[`./js/${m}`], `./js/${m}?v=dev`, `${m} missing from the import map`);
  }
  assert.match(html, /<script type="module" src="js\/main\.js\?v=dev"><\/script>/);
  assert.match(html, /href="style\.css\?v=dev"/);
  // the import map must come before any module script
  assert.ok(html.indexOf('type="importmap"') < html.indexOf('type="module"'));
});

test('modules import each other only by relative ./name.js paths the map can catch', () => {
  for (const f of fs.readdirSync(new URL('js/', root)).filter((f) => f.endsWith('.js'))) {
    const src = fs.readFileSync(new URL(`js/${f}`, root), 'utf8');
    for (const [, spec] of src.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)) {
      assert.match(spec, /^\.\/[a-z]+\.js$/, `${f} imports ${spec}`);
    }
  }
});
