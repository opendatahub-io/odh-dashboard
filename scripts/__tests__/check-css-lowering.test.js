const { after, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

const GUARD = path.join(__dirname, '..', 'check-css-lowering.sh');

const runGuard = (args) =>
  new Promise((resolve) => {
    execFile('bash', [GUARD, ...args], (error, stdout, stderr) => {
      resolve({ code: error ? error.code : 0, stdout, stderr });
    });
  });

const dists = [];

after(() => {
  for (const dist of dists) {
    rmSync(dist, { recursive: true, force: true });
  }
});

// Builds a throwaway dist directory from a file-name → CSS map.
const makeDist = (files) => {
  const dist = mkdtempSync(path.join(tmpdir(), 'css-guard-'));
  dists.push(dist);
  for (const [name, css] of Object.entries(files)) {
    const target = path.join(dist, name);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, css);
  }
  return dist;
};

describe('check-css-lowering.sh', () => {
  it('passes a clean dist and reports the scanned file count', async () => {
    const dist = makeDist({
      'main.css': '.pf-c-card__title{padding-inline-start:0}',
      'assets/chunk.css': '.pf-c-card__body{margin-inline-end:8px}',
    });

    const { code, stdout } = await runGuard([dist]);

    assert.equal(code, 0);
    assert.match(stdout, /PASS: no logical-properties lowering in 2 CSS file\(s\)/);
  });

  it('fails on the bare :lang(ae) fallback (default es6 targets)', async () => {
    const dist = makeDist({
      'main.css': '.pf-c-card__title:lang(ae){padding-left:24px}',
    });

    const { code, stderr } = await runGuard([dist]);

    assert.equal(code, 1);
    assert.match(stderr, /FAIL: LightningCSS logical-properties lowering found/);
    assert.match(stderr, /main\.css/);
  });

  it('fails on comma-separated RTL fallback lists (:lang(ae,ar) — safari 14 targets)', async () => {
    const dist = makeDist({
      'main.css': '.pf-c-card__title:lang(ae,ar,fa,he){border-top-right-radius:3px}',
    });

    const { code, stderr } = await runGuard([dist]);

    assert.equal(code, 1);
    assert.match(stderr, /FAIL: LightningCSS logical-properties lowering found/);
    assert.match(stderr, /main\.css/);
  });

  it('fails on spaced comma-separated lists (:lang(ae, ar))', async () => {
    const dist = makeDist({
      'main.css': '.pf-c-card__title:lang(ae, ar, fa){border-top-left-radius:3px}',
    });

    const { code } = await runGuard([dist]);

    assert.equal(code, 1);
  });

  it('does not match unrelated :lang() selectors', async () => {
    const dist = makeDist({
      'main.css': '.x:lang(az){color:red}.y:lang(ku){color:blue}.z:lang(aved){color:green}',
    });

    const { code, stdout } = await runGuard([dist]);

    assert.equal(code, 0);
    assert.match(stdout, /PASS/);
  });

  it('fails when a scan target contains no CSS files', async () => {
    const dist = makeDist({ 'notes.txt': 'not a stylesheet' });

    const { code, stderr } = await runGuard([dist]);

    assert.equal(code, 1);
    assert.match(stderr, /no CSS files found/);
  });

  it('prints usage and exits 2 without arguments', async () => {
    const { code, stderr } = await runGuard([]);

    assert.equal(code, 2);
    assert.match(stderr, /Usage:/);
  });
});
