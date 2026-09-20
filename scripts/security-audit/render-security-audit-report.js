/**
 * Aggregate weekly security-audit summary JSON files into the issue markdown body.
 *
 * Usage:
 *   node scripts/security-audit/render-security-audit-report.js \
 *     --artifacts-dir ./artifacts \
 *     --expected-npm '[".","packages/maas/frontend"]' \
 *     --expected-go '["packages/maas/bff"]' \
 *     --dependabot-prs ./dependabot-prs.json \
 *     --run-url https://github.com/.../actions/runs/123 \
 *     --out-dir ./report-out
 *
 * Writes:
 *   report-out/bot-body.md
 *   report-out/meta.json
 */
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = {
    artifactsDir: 'artifacts',
    dependabotPrs: null,
    expectedNpm: [],
    expectedGo: [],
    runUrl: '',
    outDir: 'report-out',
    scannedAt: new Date().toISOString(),
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--artifacts-dir') out.artifactsDir = argv[++i];
    else if (a === '--dependabot-prs') out.dependabotPrs = argv[++i];
    else if (a === '--expected-npm') out.expectedNpm = JSON.parse(argv[++i] || '[]');
    else if (a === '--expected-go') out.expectedGo = JSON.parse(argv[++i] || '[]');
    else if (a === '--run-url') out.runUrl = argv[++i];
    else if (a === '--out-dir') out.outDir = argv[++i];
    else if (a === '--scanned-at') out.scannedAt = argv[++i];
  }
  return out;
}

function walkJsonFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkJsonFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.json')) results.push(full);
  }
  return results;
}

function displayDir(dir) {
  if (dir === '.' || dir === '') return '`/` (workspace root)';
  return `\`${dir}\``;
}

function escCell(s) {
  return String(s ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ');
}

/** Allow only http(s) advisory URLs; encode markdown-breaking chars in the href. */
function safeUrl(u) {
  try {
    const parsed = new URL(String(u));
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return parsed.href.replace(/[()\s<>]/g, encodeURIComponent);
  } catch {
    return null;
  }
}

function advisoryLinks(urls) {
  if (!urls || !urls.length) return '—';
  const safe = urls.map(safeUrl).filter(Boolean);
  if (!safe.length) return '—';
  return safe
    .slice(0, 3)
    .map((u) => {
      const label = u.includes('GHSA-')
        ? u.match(/GHSA-[\w-]+/)?.[0] || 'advisory'
        : u.includes('pkg.go.dev/vuln/')
        ? u.split('/').pop()
        : 'advisory';
      return `[${label}](${u})`;
    })
    .join(', ');
}

function findingKey(f) {
  return `${f.ecosystem}:${f.name}:${f.id || f.name}`;
}

function dedupeFindings(findings) {
  const map = new Map();
  for (const f of findings) {
    const key = findingKey(f);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...f, dirs: [f.dir] });
    } else {
      if (!existing.dirs.includes(f.dir)) existing.dirs.push(f.dir);
      if (!existing.fixVersion && f.fixVersion) existing.fixVersion = f.fixVersion;
      if (existing.bucket === 'no_fix' && f.bucket !== 'no_fix') existing.bucket = f.bucket;
      if (f.rootWorkspace) existing.rootWorkspace = true;
    }
  }
  return [...map.values()];
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-token package name match in PR title (avoids react→react-router). */
function matchDependabotPr(finding, prs) {
  const name = finding.name.toLowerCase();
  const re = new RegExp(`(^|[^A-Za-z0-9_/@-])${escapeRegex(name)}([^A-Za-z0-9_/@-]|$)`, 'i');
  return prs.find((pr) => re.test(pr.title || '')) || null;
}

function table(headers, rows) {
  if (!rows.length) return '_None._\n';
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '--').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.map(escCell).join(' | ')} |`).join('\n');
  return `${head}\n${sep}\n${body}\n`;
}

function loadSummaries(artifactsDir) {
  const files = walkJsonFiles(artifactsDir);
  const summaries = [];
  const loadErrors = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.dir != null && Array.isArray(parsed.findings) && parsed.mode) {
        summaries.push(parsed);
      }
    } catch (err) {
      loadErrors.push({
        dir: path.basename(file),
        mode: 'artifact',
        error: `unreadable summary ${file}: ${err.message}`,
      });
    }
  }
  return { summaries, loadErrors };
}

function reconcileExpected(summaries, expectedNpm, expectedGo) {
  const errors = [];
  const has = (dir, mode) =>
    summaries.some((s) => s.dir === dir && s.mode === mode && s.status !== undefined);

  for (const dir of expectedNpm) {
    for (const mode of ['prod', 'devdep']) {
      if (!has(dir, mode)) {
        errors.push({
          dir,
          mode,
          error: `missing summary artifact for ${mode} scan of ${dir}`,
        });
      }
    }
  }
  for (const dir of expectedGo) {
    if (!has(dir, 'go')) {
      errors.push({
        dir,
        mode: 'go',
        error: `missing summary artifact for go scan of ${dir}`,
      });
    }
  }
  return errors;
}

function main() {
  const args = parseArgs(process.argv);
  const { summaries, loadErrors } = loadSummaries(args.artifactsDir);

  let dependabotPrs = [];
  if (args.dependabotPrs && fs.existsSync(args.dependabotPrs)) {
    try {
      dependabotPrs = JSON.parse(fs.readFileSync(args.dependabotPrs, 'utf8'));
      if (!Array.isArray(dependabotPrs)) dependabotPrs = [];
    } catch {
      dependabotPrs = [];
    }
  }

  const errors = [
    ...loadErrors,
    ...summaries
      .filter((s) => s.status === 'error')
      .map((s) => ({ dir: s.dir, mode: s.mode, error: s.error || 'unknown error' })),
    ...reconcileExpected(summaries, args.expectedNpm, args.expectedGo),
  ];

  if (summaries.length === 0 && args.expectedNpm.length === 0 && args.expectedGo.length === 0) {
    errors.push({
      dir: '.',
      mode: 'aggregate',
      error: 'No scan summary artifacts found — matrix jobs may have failed before upload',
    });
  }

  const prodNpm = dedupeFindings(
    summaries
      .filter((s) => s.mode === 'prod')
      .flatMap((s) => s.findings.map((f) => ({ ...f, dir: s.dir }))),
  );
  const goFindings = dedupeFindings(
    summaries
      .filter((s) => s.mode === 'go')
      .flatMap((s) => s.findings.map((f) => ({ ...f, dir: s.dir }))),
  );
  const devDep = dedupeFindings(
    summaries
      .filter((s) => s.mode === 'devdep')
      .flatMap((s) => s.findings.map((f) => ({ ...f, dir: s.dir }))),
  );

  const allProd = [...prodNpm, ...goFindings];
  const actionable = allProd.filter((f) => f.bucket === 'actionable');
  const major = allProd.filter((f) => f.bucket === 'major');
  const noFix = allProd.filter((f) => f.bucket === 'no_fix');

  const needsHumanPrs = dependabotPrs.filter((pr) =>
    (pr.labels || []).some((l) => (l.name || l) === 'dependabot-needs-human'),
  );

  // Never clean if any scanner/reconcile error exists.
  const clean = prodNpm.length === 0 && goFindings.length === 0 && errors.length === 0;

  const findingIds = allProd.map(findingKey).toSorted();
  const statusEmoji = clean ? '🟢 clean' : '🔴 findings';
  const scannedAt = args.scannedAt.replace(/\.\d+Z$/, 'Z');
  const triageDoc = '.github/security-audit-triage.md';

  const lines = [];
  lines.push('<!-- security-audit:begin -->');
  lines.push(`<!-- security-audit-ids:${findingIds.join(',')} -->`);
  lines.push('# Weekly security audit');
  lines.push('');
  lines.push(`**Status:** ${statusEmoji}  `);
  lines.push(
    `**Last scan:** ${scannedAt} · ${
      args.runUrl ? `[workflow run](${args.runUrl})` : 'workflow run'
    }  `,
  );
  lines.push(
    '**Scope:** Dependabot first-party dirs only (upstream / autox-core excluded). Root `/` is a workspace audit and may list packages also covered by nested frontend locks.',
  );
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| | Count |');
  lines.push('|--|--:|');
  lines.push(`| npm high/critical (prod) | ${prodNpm.length} |`);
  lines.push(`| Go vulnerabilities | ${goFindings.length} |`);
  lines.push(`| Scanner errors | ${errors.length} |`);
  lines.push(`| Actionable (non-major fix) | ${actionable.length} |`);
  lines.push(`| Major-only fix | ${major.length} |`);
  lines.push(`| No fix available | ${noFix.length} |`);
  lines.push(`| DevDep (informational) | ${devDep.length} |`);
  lines.push('');
  lines.push(
    '> Classification is advisory from `npm audit` / `govulncheck` metadata — not a guarantee the bump is safe here.',
  );
  lines.push('');

  const dirCell = (f) =>
    f.dirs
      .map((d) => (d === '.' || f.rootWorkspace ? `${displayDir(d)}` : displayDir(d)))
      .join(', ');

  lines.push('## Actionable now');
  lines.push('Fix available without a major bump. Prefer Dependabot / auto-merge.');
  lines.push('');
  lines.push(
    table(
      ['Severity', 'Package / module', 'Fix', 'Dirs', 'Advisory', 'Dependabot'],
      actionable.map((f) => {
        const pr = matchDependabotPr(f, dependabotPrs);
        return [
          f.severity,
          `\`${f.name}\``,
          f.fixVersion ? `\`${f.fixVersion}\`` : '—',
          dirCell(f),
          advisoryLinks(f.advisories),
          pr ? `[#${pr.number}](${pr.url})` : '—',
        ];
      }),
    ),
  );

  lines.push('## Fix available — major / breaking');
  lines.push('Needs intentional major bump (not auto-merge).');
  lines.push('');
  lines.push(
    table(
      ['Severity', 'Package', 'Fix', 'Major?', 'Dirs', 'Advisory'],
      major.map((f) => [
        f.severity,
        `\`${f.name}\``,
        f.fixVersion ? `\`${f.fixVersion}\`` : '—',
        'yes',
        dirCell(f),
        advisoryLinks(f.advisories),
      ]),
    ),
  );

  lines.push('## No fix available');
  lines.push('Nothing to bump yet — wait on advisory, accept risk, or track in Human notes.');
  lines.push('');
  lines.push(
    table(
      ['Severity', 'Package', 'Dirs', 'Advisory'],
      noFix.map((f) => [f.severity, `\`${f.name}\``, dirCell(f), advisoryLinks(f.advisories)]),
    ),
  );

  lines.push('## Needs human attention');
  lines.push('Open Dependabot PRs that already have labels but are stuck.');
  lines.push('');
  lines.push(
    table(
      ['PR', 'Labels', 'Note'],
      needsHumanPrs.map((pr) => [
        `[#${pr.number}](${pr.url}) ${(pr.title || '').slice(0, 60)}`,
        (pr.labels || []).map((l) => l.name || l).join(', '),
        'CI red — bump will not merge until fixed',
      ]),
    ),
  );
  lines.push(
    '_Transitive-only fixes:_ consider root `overrides` + `npm run sync:overrides` (RHOAIENG-57882).',
  );
  lines.push('');

  lines.push('## Go findings');
  lines.push('');
  lines.push(
    table(
      ['OSV', 'Module dir', 'Fixed in?', 'Bucket'],
      goFindings.map((f) => [
        advisoryLinks(f.advisories),
        dirCell(f),
        f.fixVersion ? `\`${f.fixVersion}\`` : '—',
        f.bucket,
      ]),
    ),
  );

  lines.push('## Scanner errors');
  if (!errors.length) {
    lines.push('_None._');
  } else {
    lines.push(
      table(
        ['Dir', 'Mode', 'Error'],
        errors.map((e) => [displayDir(e.dir), e.mode, e.error]),
      ),
    );
  }
  lines.push('');

  lines.push('## Dev dependencies (informational)');
  lines.push('Not counted toward open/close. Build-time supply chain only.');
  lines.push('');
  lines.push(
    table(
      ['Severity', 'Package', 'Fix', 'Dirs'],
      devDep.map((f) => [
        f.severity,
        `\`${f.name}\``,
        f.fixVersion ? `\`${f.fixVersion}\`${f.isSemVerMajor ? ' (major)' : ''}` : '—',
        dirCell(f),
      ]),
    ),
  );

  lines.push('## How to triage');
  lines.push(`See [\`security-audit-triage.md\`](${triageDoc}).`);
  lines.push('1. **Actionable** → let Dependabot PR merge (or open one)');
  lines.push('2. **Major-only** → schedule intentional upgrade');
  lines.push('3. **No fix** → document acceptance in Human notes below');
  lines.push(
    '4. **PR gates** still block *new* CVEs on dep PRs; this issue is inventory of `main`',
  );
  lines.push('5. Upstream-synced packages are **out of scope** → RHOAIENG-59135');
  lines.push('6. **Scanner errors** keep this issue open — never treat a failed scan as clean');
  lines.push('');
  lines.push('<!-- security-audit:end -->');

  const botBody = `${lines.join('\n')}\n`;

  fs.mkdirSync(args.outDir, { recursive: true });
  fs.writeFileSync(path.join(args.outDir, 'bot-body.md'), botBody);
  fs.writeFileSync(
    path.join(args.outDir, 'meta.json'),
    JSON.stringify(
      {
        clean,
        findingIds,
        counts: {
          npmProd: prodNpm.length,
          go: goFindings.length,
          errors: errors.length,
          actionable: actionable.length,
          major: major.length,
          noFix: noFix.length,
          devDep: devDep.length,
        },
        statusEmoji,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(path.join(args.outDir, 'step-summary.md'), botBody);

  console.log(
    `Rendered report: clean=${clean} npm=${prodNpm.length} go=${goFindings.length} errors=${errors.length}`,
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  matchDependabotPr,
  reconcileExpected,
  dedupeFindings,
  findingKey,
  loadSummaries,
  safeUrl,
  advisoryLinks,
};
