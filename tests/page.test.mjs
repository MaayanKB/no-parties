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

// Regression: the read-aloud text read the punch line before the explanation after the opening was reordered.
test('read-aloud follows the order the opening is shown', () => {
  const shown = [...html.matchAll(/data-t="(intro\w+)"/g)].map(m => m[1]);
  const parts = html.match(/function readAloudText\(\) \{\s*const parts = \[([^\]]+)\]/)[1];
  const read = [...parts.matchAll(/'(intro\w+)'/g)].map(m => m[1]);
  assert.deepEqual(read, shown);
});

// Regression: the hidden state of the reveal was more specific than `.motion .in`, so everything after the title
// stayed invisible. Every hidden selector must step aside once the element is `.in`.
test('reveal hidden states give way to .in', () => {
  const rule = html.match(/([^{}]*)\{\s*opacity: 0; translate: 0 12px; \}/);
  assert.ok(rule, 'hidden reveal rule not found');
  const selectors = rule[1].split(',').map(x => x.trim()).filter(Boolean);
  for (const sel of selectors) assert.match(sel, /:not\(\.in\)$/, `${sel} must end with :not(.in)`);
});

// Regression: a language picked from the menu was saved, so the page reopened in it for whoever used that browser next.
test('the language choice is not saved between visits', () => {
  assert.equal(html.match(/save\('party-deletion-lang'/), null);
});
