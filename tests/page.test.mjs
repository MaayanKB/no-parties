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
});

// Regression: the read-aloud text read the punch line before the explanation after the opening was reordered.
test('read-aloud follows the order the opening is shown', () => {
  const shown = [...html.matchAll(/data-t="(intro\w+)"/g)].map(m => m[1]);
  const parts = html.match(/function readAloudText\(\) \{\s*const parts = \[([^\]]+)\]/)[1];
  const read = [...parts.matchAll(/'(intro\w+)'/g)].map(m => m[1]);
  assert.deepEqual(read, shown);
});

// Regression: a language picked from the menu was saved, so the page reopened in it for whoever used that browser next.
test('the language choice is not saved between visits', () => {
  assert.equal(html.match(/save\('party-deletion-lang'/), null);
});

// Regression: the header's colour fade runs below the header, and since the header is positioned it painted over
// the opening lines. The opening block must be positioned too, so it stays above the fade.
test('the opening text sits above the header fade', () => {
  assert.match(html, /\.hero::before \{[^}]*bottom: -\d+px/, 'the fade is expected to run below the header');
  assert.match(html, /\.intro \{ position: relative;/);
});

// Regression: 5 cheers cycled over 13 lists, so the same line came back again and again.
test('every confirmed list before the last gets its own cheer, in every language', () => {
  const i18n = JSON.parse(readFileSync(new URL('../data/i18n.json', import.meta.url), 'utf8'));
  const parties = JSON.parse(readFileSync(new URL('../data/parties.json', import.meta.url), 'utf8'));
  const polling = JSON.parse(readFileSync(new URL('../data/polling.json', import.meta.url), 'utf8'));
  const withEmail = new Set(parties.filter(p => p.email).map(p => p.number));
  const lists = new Set(polling.likely.filter(x => withEmail.has(x.number)).map(x => x.list));
  for (const [lang, ui] of Object.entries(i18n.ui)) {
    assert.ok(new Set(ui.cheers).size >= lists.size - 1, `${lang}: ${ui.cheers.length} cheers for ${lists.size} lists`);
  }
});

// Regression: after the last list was sent, the bordered "send all" box stayed on screen, empty.
test('the send-all box hides when nothing is left to send', () => {
  assert.match(html, /\$\('bulk-box'\)\.hidden = !queue && !left\.length;/);
});

// Regression: the calendar event's text went out unescaped, and a comma cuts it short in some calendar apps (RFC 5545).
test('calendar text is escaped', () => {
  assert.match(html, /`DESCRIPTION:\$\{icsText\(/);
  assert.match(html, /`SUMMARY:\$\{icsText\(/);
});

// Privacy: usage counts carry event names only, never what was typed into the form.
test('tracked events never include form values', () => {
  const calls = [...html.matchAll(/track\(([^)]*)\)/g)].map(m => m[1]);
  assert.ok(calls.length >= 10, 'expected the tracked events to be found');
  for (const arg of calls) assert.doesNotMatch(arg, /value\(|f-|letterText|formValues/, `track(${arg})`);
});

// Regression: the letter's line breaks went out as bare LF, and some mail apps ran it into one paragraph.
test('mailto bodies use CRLF line breaks', () => {
  assert.match(html, /const mailBody = text => enc\(text\.replace\(\/\\r\?\\n\/g, '\\r\\n'\)\);/);
  assert.equal(html.match(/mailto:[^`]*&body=\$\{enc\(/), null, 'mailto bodies must go through mailBody()');
});

// Regression: content below the title stayed hidden on Brave mobile, even when scrolling, because it waited for the
// script to show it. Hidden states must be CSS animations that end visible on their own, never "hidden until JS".
test('nothing stays hidden waiting for the script', () => {
  assert.equal(html.match(/:not\(\.in\)/), null, 'no hidden state that waits for a JS class');
  assert.equal(html.match(/\.tq:not\(\.written\) \{ visibility: hidden/), null);
  assert.match(html, /animation: hold-in [^;]*var\(--hold, \d+ms\)/, 'the hold has a default, so it ends without JS');
  assert.match(html, /@supports \(animation-timeline: view\(\)\)/, 'scroll reveal only where supported');
});

// Regression: the answer pops in from scale(.6), and fitOneLine() measured it while scaled, so in Arabic (wide
// fallback font) the text measured narrower than it was and ran off a 390px screen.
test('the one-line title fit undoes the pop-in scale', () => {
  assert.match(html, /const width = \(\) => range\.getBoundingClientRect\(\)\.width \/ scale;/);
});
