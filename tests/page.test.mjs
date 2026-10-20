// Run after `python3 build.py`: node --test tests/page.test.mjs
// Guards against a broken inline script, which would take the whole page down silently.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);

test('index.html has its inline scripts', () => {
  assert.ok(scripts.length >= 3, `expected at least 3 inline scripts, found ${scripts.length}`);
});

test('every inline script parses', () => {
  scripts.forEach((src, i) => {
    assert.doesNotThrow(() => new Function(src), `inline script #${i} has a syntax error`);
  });
});

test('no template placeholders left unfilled', () => {
  assert.equal(html.match(/\{\{[A-Z_]+\}\}/), null);
});

// Regression: dir="rtl" and .motion both sit on <html>, so a descendant selector ("[dir=rtl] .motion")
// never matches and Hebrew/Arabic got the left-to-right marker stroke.
test('right-to-left motion rules use a compound selector on <html>', () => {
  assert.equal(html.match(/\[dir="rtl"\] \.motion/), null, 'use [dir="rtl"].motion, not [dir="rtl"] .motion');
  assert.match(html, /\[dir="rtl"\]\.motion \.intro \.punch::before/);
});
