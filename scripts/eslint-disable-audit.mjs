#!/usr/bin/env node

// Zero-dependency ESLint inline-disable audit for the ODH Dashboard monorepo.
// Deterministically scans all .ts/.tsx/.js/.jsx files, counts every form of
// eslint-disable / @ts-ignore / @ts-expect-error / @ts-nocheck directive,
// and reports results by type, rule, file, and package.
//
// Usage:  node scripts/eslint-disable-audit.mjs [options]
//
// Options:
//   --json                     Output raw JSON to stdout
//   --baseline <file>          Compare current scan against a saved baseline
//   --save-baseline <file>     Write current results to a JSON baseline file
//   --fail-on-increase         Exit 1 if any suppression category regressed vs baseline
//   --include-generated        Include generated/third_party files in counts
//   --help                     Show this message

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(__filename, '..', '..');

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'jest-coverage',
  '.nyc_output',
  '.turbo',
  'public',
  'public-cypress',
]);

const GENERATED_MARKERS = ['generated', 'third_party'];

// ── Regex patterns ──────────────────────────────────────────────────────────

// Line comments: // eslint-disable-next-line [rules] [-- desc]
const RE_DISABLE_NEXT_LINE = /\/\/\s*eslint-disable-next-line(?:\s+(.+))?$/;
const RE_DISABLE_LINE = /\/\/\s*eslint-disable-line(?:\s+(.+))?$/;

// Block-comment variants of next-line and line-level (JSX style).
// Must be checked BEFORE the generic block disable to avoid misclassification.
// e.g. {/* eslint-disable-next-line camelcase */} or /* eslint-disable-next-line no-console */
const RE_BLOCK_NEXT_LINE = /\/\*\s*eslint-disable-next-line(?:\s+(.*?))?\s*\*\//;
const RE_BLOCK_LINE = /\/\*\s*eslint-disable-line(?:\s+(.*?))?\s*\*\//;

// Generic block/file-level disable: /* eslint-disable [rules] */
const RE_DISABLE_BLOCK = /\/\*\s*eslint-disable(?!-(?:next-line|line))(?:\s+(.*?))?\s*\*\//;

// TypeScript directives with optional trailing description text.
// Captures everything after the directive keyword, including colons and dashes
// (e.g. `// @ts-expect-error: reason` or `// @ts-ignore no types available`).
const RE_TS_IGNORE = /\/\/\s*@ts-ignore(.*)$/;
const RE_TS_EXPECT_ERROR = /\/\/\s*@ts-expect-error(.*)$/;
const RE_TS_NOCHECK = /\/\/\s*@ts-nocheck(.*)$/;
// JSX-style: {/* @ts-ignore */} etc.
const RE_TS_IGNORE_BLOCK = /\/\*\s*@ts-ignore(.*?)\s*\*\//;
const RE_TS_EXPECT_ERROR_BLOCK = /\/\*\s*@ts-expect-error(.*?)\s*\*\//;
const RE_TS_NOCHECK_BLOCK = /\/\*\s*@ts-nocheck(.*?)\s*\*\//;

function splitRulesAndDescription(raw) {
  if (!raw || !raw.trim()) {
    return { rules: [], description: null };
  }
  const idx = raw.indexOf(' -- ');
  let rulesPart;
  let description;
  if (idx !== -1) {
    rulesPart = raw.slice(0, idx).trim();
    description = raw.slice(idx + 4).trim() || null;
  } else {
    rulesPart = raw.trim();
    description = null;
  }
  const rules = rulesPart
    ? rulesPart
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
    : [];
  return { rules, description };
}

function extractTsDescription(raw) {
  if (!raw || !raw.trim()) {
    return null;
  }
  // Strip leading punctuation that acts as a separator: ":", "-", "--", "–"
  const stripped = raw.replace(/^[\s:–—-]+/, '').trim();
  return stripped || null;
}

// ── CLI parsing ─────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    json: false,
    baseline: null,
    saveBaseline: null,
    failOnIncrease: false,
    includeGenerated: false,
    help: false,
  };
  let i = 2; // skip node and script path
  while (i < argv.length) {
    switch (argv[i]) {
      case '--json':
        args.json = true;
        break;
      case '--baseline':
        args.baseline = argv[++i];
        break;
      case '--save-baseline':
        args.saveBaseline = argv[++i];
        break;
      case '--fail-on-increase':
        args.failOnIncrease = true;
        break;
      case '--include-generated':
        args.includeGenerated = true;
        break;
      case '--help':
        args.help = true;
        break;
      default:
        console.error(`Unknown option: ${argv[i]}`);
        process.exit(2);
    }
    i++;
  }
  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/eslint-disable-audit.mjs [options]

Options:
  --json                     Output raw JSON instead of formatted tables
  --baseline <file>          Compare against a baseline JSON file and report deltas
  --save-baseline <file>     Save current results as a baseline JSON file
  --fail-on-increase         Exit 1 if any suppression category increased vs baseline
  --include-generated        Include generated/third_party files in counts
  --help                     Show usage information`);
}

// ── File discovery ──────────────────────────────────────────────────────────

async function walkDir(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkDir(fullPath)));
    } else if (entry.isFile()) {
      const ext = entry.name.slice(entry.name.lastIndexOf('.'));
      if (EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

// ── Scanning ────────────────────────────────────────────────────────────────

function isGenerated(relPath) {
  const lower = relPath.toLowerCase();
  return GENERATED_MARKERS.some((m) => lower.includes(`${sep}${m}${sep}`) || lower.includes(`/${m}/`));
}

function scanLine(line, lineNumber, relPath) {
  const gen = isGenerated(relPath);

  // ── eslint-disable-next-line ──────────────────────────────────────────
  // Check // comment first, then /* */ block comment (JSX).
  let m = RE_DISABLE_NEXT_LINE.exec(line);
  if (m) {
    const { rules, description } = splitRulesAndDescription(m[1]);
    return [{
      file: relPath, line: lineNumber,
      type: rules.length ? 'eslint-disable-next-line-scoped' : 'eslint-disable-next-line-bare',
      rules, description, generated: gen,
    }];
  }
  m = RE_BLOCK_NEXT_LINE.exec(line);
  if (m) {
    const { rules, description } = splitRulesAndDescription(m[1]);
    return [{
      file: relPath, line: lineNumber,
      type: rules.length ? 'eslint-disable-next-line-scoped' : 'eslint-disable-next-line-bare',
      rules, description, generated: gen,
    }];
  }

  // ── eslint-disable-line ───────────────────────────────────────────────
  m = RE_DISABLE_LINE.exec(line);
  if (m) {
    const { rules, description } = splitRulesAndDescription(m[1]);
    return [{
      file: relPath, line: lineNumber,
      type: rules.length ? 'eslint-disable-line-scoped' : 'eslint-disable-line-bare',
      rules, description, generated: gen,
    }];
  }
  m = RE_BLOCK_LINE.exec(line);
  if (m) {
    const { rules, description } = splitRulesAndDescription(m[1]);
    return [{
      file: relPath, line: lineNumber,
      type: rules.length ? 'eslint-disable-line-scoped' : 'eslint-disable-line-bare',
      rules, description, generated: gen,
    }];
  }

  // ── eslint-disable (block/file-level) ─────────────────────────────────
  // Checked AFTER next-line/line to avoid misclassification.
  m = RE_DISABLE_BLOCK.exec(line);
  if (m) {
    const { rules, description } = splitRulesAndDescription(m[1]);
    return [{
      file: relPath, line: lineNumber,
      type: rules.length ? 'eslint-disable-block-scoped' : 'eslint-disable-block-bare',
      rules, description, generated: gen,
    }];
  }

  // ── TypeScript directives ─────────────────────────────────────────────
  // Can coexist on the same line (rare), so we don't early-return.
  const hits = [];

  m = RE_TS_IGNORE.exec(line) || RE_TS_IGNORE_BLOCK.exec(line);
  if (m) {
    hits.push({
      file: relPath, line: lineNumber, type: 'ts-ignore',
      rules: [], description: extractTsDescription(m[1]), generated: gen,
    });
  }
  m = RE_TS_EXPECT_ERROR.exec(line) || RE_TS_EXPECT_ERROR_BLOCK.exec(line);
  if (m) {
    hits.push({
      file: relPath, line: lineNumber, type: 'ts-expect-error',
      rules: [], description: extractTsDescription(m[1]), generated: gen,
    });
  }
  m = RE_TS_NOCHECK.exec(line) || RE_TS_NOCHECK_BLOCK.exec(line);
  if (m) {
    hits.push({
      file: relPath, line: lineNumber, type: 'ts-nocheck',
      rules: [], description: extractTsDescription(m[1]), generated: gen,
    });
  }

  return hits;
}

async function scanFile(filePath, relPath) {
  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    hits.push(...scanLine(lines[i], i + 1, relPath));
  }
  return hits;
}

const CONCURRENCY = 64;

async function scanFilesInBatches(relFiles) {
  const allHits = [];
  for (let i = 0; i < relFiles.length; i += CONCURRENCY) {
    const batch = relFiles.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((relPath) => scanFile(join(REPO_ROOT, relPath), relPath)),
    );
    for (const hits of results) {
      allHits.push(...hits);
    }
  }
  return allHits;
}

// ── Aggregation ─────────────────────────────────────────────────────────────

function inferPackage(relPath) {
  // Forward-slash normalize for consistency
  const normalized = relPath.split(sep).join('/');
  if (normalized.startsWith('frontend/src/') || normalized.startsWith('frontend/config/')) {
    return 'frontend';
  }
  if (normalized.startsWith('backend/')) {
    return 'backend';
  }
  const pkgMatch = normalized.match(/^packages\/([^/]+)/);
  if (pkgMatch) {
    return `packages/${pkgMatch[1]}`;
  }
  return 'root';
}

function aggregate(allHits, includeGenerated) {
  const filtered = includeGenerated ? allHits : allHits.filter((h) => !h.generated);

  const byType = {
    'eslint-disable-next-line-scoped': 0,
    'eslint-disable-next-line-bare': 0,
    'eslint-disable-block-scoped': 0,
    'eslint-disable-block-bare': 0,
    'eslint-disable-line-scoped': 0,
    'eslint-disable-line-bare': 0,
    'ts-ignore': 0,
    'ts-expect-error': 0,
    'ts-nocheck': 0,
  };

  const ruleMap = new Map();
  const fileMap = new Map();
  const pkgMap = new Map();
  let withDescription = 0;
  let withoutDescription = 0;

  const bareDisables = [];
  const generatedFilesSet = new Set();

  for (const hit of allHits) {
    if (hit.generated) {
      generatedFilesSet.add(hit.file);
    }
  }

  for (const hit of filtered) {
    byType[hit.type] = (byType[hit.type] || 0) + 1;

    if (hit.description) {
      withDescription++;
    } else {
      withoutDescription++;
    }

    for (const rule of hit.rules) {
      ruleMap.set(rule, (ruleMap.get(rule) || 0) + 1);
    }

    fileMap.set(hit.file, (fileMap.get(hit.file) || 0) + 1);

    const pkg = inferPackage(hit.file);
    pkgMap.set(pkg, (pkgMap.get(pkg) || 0) + 1);

    if (
      hit.type === 'eslint-disable-next-line-bare' ||
      hit.type === 'eslint-disable-block-bare' ||
      hit.type === 'eslint-disable-line-bare'
    ) {
      bareDisables.push({ file: hit.file, line: hit.line, type: hit.type });
    }
  }

  const byRule = [...ruleMap.entries()]
    .map(([rule, count]) => ({ rule, count }))
    .sort((a, b) => b.count - a.count || a.rule.localeCompare(b.rule));

  const byFile = [...fileMap.entries()]
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));

  const byPackage = [...pkgMap.entries()]
    .map(([pkg, count]) => ({ package: pkg, count }))
    .sort((a, b) => b.count - a.count || a.package.localeCompare(b.package));

  const totalDirectives = Object.values(byType).reduce((s, v) => s + v, 0);
  const totalFiles = fileMap.size;

  return {
    summary: { totalDirectives, totalFiles, withDescription, withoutDescription },
    byType,
    byRule,
    byFile,
    byPackage,
    critical: {
      bareDisables: bareDisables.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
      generatedFiles: [...generatedFilesSet].sort(),
    },
  };
}

// ── Output: JSON ────────────────────────────────────────────────────────────

function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

function buildReport(report) {
  return {
    timestamp: new Date().toISOString(),
    commit: getGitCommit(),
    ...report,
  };
}

// ── Output: Tables ──────────────────────────────────────────────────────────

function useColor() {
  if (process.env.NO_COLOR || process.env.CI) {
    return false;
  }
  return process.stdout.isTTY ?? false;
}

function c(code, text) {
  if (!useColor()) {
    return text;
  }
  return `\x1b[${code}m${text}\x1b[0m`;
}

const red = (t) => c('31', t);
const green = (t) => c('32', t);
const yellow = (t) => c('33', t);
const bold = (t) => c('1', t);
const dim = (t) => c('2', t);

function pad(str, len, alignRight = false) {
  const s = String(str);
  if (alignRight) {
    return s.padStart(len);
  }
  return s.padEnd(len);
}

function printTable(headers, rows, alignments) {
  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i]).length)),
  );

  const headerLine = headers
    .map((h, i) => pad(h, colWidths[i], alignments?.[i] === 'right'))
    .join('  ');
  console.log(bold(headerLine));
  console.log(dim(colWidths.map((w) => '─'.repeat(w)).join('──')));

  for (const row of rows) {
    const line = row
      .map((cell, i) => pad(cell, colWidths[i], alignments?.[i] === 'right'))
      .join('  ');
    console.log(line);
  }
  console.log();
}

function printReport(report) {
  const { summary, byType, byRule, byFile, byPackage, critical } = report;

  console.log(bold('\n═══ ESLint Disable Audit Report ═══\n'));

  // Summary
  console.log(bold('Summary'));
  console.log(`  Total directives:      ${bold(String(summary.totalDirectives))}`);
  console.log(`  Files affected:        ${bold(String(summary.totalFiles))}`);
  console.log(`  With description:      ${green(String(summary.withDescription))} (${((summary.withDescription / summary.totalDirectives) * 100).toFixed(1)}%)`);
  console.log(`  Without description:   ${yellow(String(summary.withoutDescription))} (${((summary.withoutDescription / summary.totalDirectives) * 100).toFixed(1)}%)`);
  console.log();

  // By type
  console.log(bold('By Suppression Type'));
  const typeRows = Object.entries(byType).map(([type, count]) => {
    const risk = type.includes('bare')
      ? red('CRITICAL')
      : type.startsWith('ts-ignore')
        ? yellow('HIGH')
        : type.includes('block')
          ? yellow('HIGH')
          : 'Medium';
    return [type, String(count), risk];
  });
  printTable(['Type', 'Count', 'Risk'], typeRows, ['left', 'right', 'left']);

  // Top rules
  console.log(bold('Top Suppressed Rules (top 20)'));
  const ruleRows = byRule.slice(0, 20).map((r) => [r.rule, String(r.count)]);
  printTable(['Rule', 'Count'], ruleRows, ['left', 'right']);

  // Highest density files
  console.log(bold('Highest-Density Files (top 15)'));
  const fileRows = byFile.slice(0, 15).map((f) => [f.file, String(f.count)]);
  printTable(['File', 'Count'], fileRows, ['left', 'right']);

  // Per-package
  console.log(bold('Per-Package Breakdown'));
  const pkgRows = byPackage.map((p) => [p.package, String(p.count)]);
  printTable(['Package', 'Count'], pkgRows, ['left', 'right']);

  // Critical: bare disables
  if (critical.bareDisables.length > 0) {
    console.log(red(bold('CRITICAL: Bare Disables (no rule specified)')));
    const bareRows = critical.bareDisables.map((b) => [b.file, String(b.line), b.type]);
    printTable(['File', 'Line', 'Type'], bareRows, ['left', 'right', 'left']);
  } else {
    console.log(green(bold('No bare disables found.')));
    console.log();
  }

  // Generated files
  if (critical.generatedFiles.length > 0) {
    console.log(dim(`Generated/third-party files excluded from counts: ${critical.generatedFiles.length}`));
    for (const f of critical.generatedFiles) {
      console.log(dim(`  ${f}`));
    }
    console.log();
  }
}

// ── Baseline comparison ─────────────────────────────────────────────────────

async function loadBaseline(filePath) {
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

function compareBaseline(current, baseline) {
  const deltas = [];
  let hasRegression = false;

  // Compare byType
  for (const [type, currentCount] of Object.entries(current.byType)) {
    const baselineCount = baseline.byType?.[type] ?? 0;
    const delta = currentCount - baselineCount;
    if (delta !== 0) {
      const status = delta > 0 ? 'REGRESSION' : 'IMPROVED';
      if (delta > 0) {
        hasRegression = true;
      }
      deltas.push({ category: type, baseline: baselineCount, current: currentCount, delta, status });
    }
  }

  // Compare top rules
  const baselineRuleMap = new Map((baseline.byRule || []).map((r) => [r.rule, r.count]));
  for (const { rule, count } of current.byRule) {
    const baselineCount = baselineRuleMap.get(rule) ?? 0;
    const delta = count - baselineCount;
    if (delta !== 0) {
      const status = delta > 0 ? 'REGRESSION' : 'IMPROVED';
      if (delta > 0) {
        hasRegression = true;
      }
      deltas.push({
        category: `rule: ${rule}`,
        baseline: baselineCount,
        current: count,
        delta,
        status,
      });
    }
  }

  // Check for new bare disables
  const baselineBareFiles = new Set(
    (baseline.critical?.bareDisables || []).map((b) => `${b.file}:${b.line}`),
  );
  const newBare = current.critical.bareDisables.filter(
    (b) => !baselineBareFiles.has(`${b.file}:${b.line}`),
  );
  if (newBare.length > 0) {
    hasRegression = true;
  }

  return { deltas, hasRegression, newBare };
}

function printComparison(comparison) {
  const { deltas, hasRegression, newBare } = comparison;

  console.log(bold('\n═══ Baseline Comparison ═══\n'));

  if (deltas.length === 0 && newBare.length === 0) {
    console.log(green('No changes from baseline.'));
    console.log();
    return;
  }

  const rows = deltas.map((d) => {
    const deltaStr = d.delta > 0 ? `+${d.delta}` : String(d.delta);
    const statusStr = d.status === 'REGRESSION' ? red(d.status) : green(d.status);
    return [d.category, String(d.baseline), String(d.current), deltaStr, statusStr];
  });
  printTable(
    ['Category', 'Baseline', 'Current', 'Delta', 'Status'],
    rows,
    ['left', 'right', 'right', 'right', 'left'],
  );

  if (newBare.length > 0) {
    console.log(red(bold(`NEW bare disables detected: ${newBare.length}`)));
    for (const b of newBare) {
      console.log(red(`  ${b.file}:${b.line} (${b.type})`));
    }
    console.log();
  }

  if (hasRegression) {
    console.log(red(bold('RESULT: REGRESSIONS DETECTED')));
  } else {
    console.log(green(bold('RESULT: All changes are improvements')));
  }
  console.log();
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.failOnIncrease && !args.baseline) {
    console.error('Error: --fail-on-increase requires --baseline <file>');
    process.exit(2);
  }

  // Discover files
  const allFiles = await walkDir(REPO_ROOT);
  const relFiles = allFiles.map((f) => relative(REPO_ROOT, f)).sort();

  // Scan all files with concurrent I/O
  const allHits = await scanFilesInBatches(relFiles);

  // Aggregate
  const report = aggregate(allHits, args.includeGenerated);
  const fullReport = buildReport(report);

  // Save baseline if requested
  if (args.saveBaseline) {
    await writeFile(args.saveBaseline, JSON.stringify(fullReport, null, 2) + '\n', 'utf-8');
    if (!args.json) {
      console.log(`Baseline saved to ${args.saveBaseline}`);
    }
  }

  // Baseline comparison
  let exitCode = 0;
  let comparison = null;
  if (args.baseline) {
    const baseline = await loadBaseline(args.baseline);
    comparison = compareBaseline(report, baseline);
    if (args.failOnIncrease && comparison.hasRegression) {
      exitCode = 1;
    }
  }

  // Output
  if (args.json) {
    const output = comparison ? { ...fullReport, comparison } : fullReport;
    console.log(JSON.stringify(output, null, 2));
  } else {
    printReport(report);
    if (comparison) {
      printComparison(comparison);
    }
  }

  process.exit(exitCode);
}

// ── Exports (for testing) ───────────────────────────────────────────────────

export {
  splitRulesAndDescription,
  extractTsDescription,
  parseArgs,
  isGenerated,
  scanLine,
  inferPackage,
  aggregate,
  compareBaseline,
  SKIP_DIRS,
  EXTENSIONS,
};

// Run main only when executed directly (not when imported by tests).
const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url).replace(/\\/g, '/') ===
    process.argv[1].replace(/\\/g, '/');

if (isDirectRun) {
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}
