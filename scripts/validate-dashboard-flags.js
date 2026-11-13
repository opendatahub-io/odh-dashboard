/**
 * Validates that the dashboard feature-flag list (OdhDashboardConfig `spec.dashboardConfig`)
 * is the same in every copy that declares it:
 *
 *   crd       manifests/base/crd/odhdashboardconfigs.opendatahub.io.crd.yaml
 *   type      packages/k8s-core/src/k8sTypes.ts            (DashboardCommonConfig)
 *   frontend  frontend/src/concepts/areas/const.ts          (allFeatureFlagsConfig)
 *   backend   backend/src/utils/constants.ts                (blankDashboardCR)
 *   coreBff   distributions/core-bff/bff/internal/models/dashboard_config.go (DashboardFeatureFlags)
 *
 * The script has no dependencies so it can run before `pnpm install`.
 *
 * Usage:
 *   node scripts/validate-dashboard-flags.js           # fail on drift
 *   node scripts/validate-dashboard-flags.js --table   # also print the full flag table
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const SOURCES = [
  {
    id: 'crd',
    file: 'manifests/base/crd/odhdashboardconfigs.opendatahub.io.crd.yaml',
    parse: (content) => parseCrdFlags(content),
  },
  {
    id: 'type',
    file: 'packages/k8s-core/src/k8sTypes.ts',
    parse: (content) => parseTsTypeFlags(content, 'DashboardCommonConfig'),
  },
  {
    id: 'frontend',
    file: 'frontend/src/concepts/areas/const.ts',
    parse: (content) => parseFrontendFlags(content, 'allFeatureFlagsConfig'),
  },
  {
    id: 'backend',
    file: 'backend/src/utils/constants.ts',
    parse: (content) => parseBackendFlags(content, 'blankDashboardCR'),
  },
  {
    id: 'coreBff',
    file: 'distributions/core-bff/bff/internal/models/dashboard_config.go',
    parse: (content) => parseGoStructFlags(content, 'DashboardFeatureFlags'),
  },
];

const SOURCE_IDS = SOURCES.map((s) => s.id);

/**
 * Flags that are intentionally missing from some copies. Each entry lists the copies the flag
 * is allowed to be absent from and why. Keep this list short: anything here is a flag one
 * runtime cannot see.
 *
 * Flags whose CRD description starts with "DEPRECATED" do not need an entry: the CRD keeps them
 * (with a CEL ratchet) so existing OdhDashboardConfig objects still validate, and any other copy
 * may drop them once nothing reads them.
 */
const ALLOWED_ABSENCES = {
  bidirectionalYamlWizardGa: {
    absentFrom: ['crd', 'frontend', 'backend', 'coreBff'],
    reason:
      'Area dev flag (devFlags in packages/model-serving/extensions/odh.ts), toggled per session; ' +
      'typed only so Cypress mocks can set it through mockDashboardConfig.',
  },
};

/** Copies whose flag values are runtime defaults and must agree value for value. */
const DEFAULT_VALUE_SOURCES = ['backend', 'coreBff'];

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

/** Returns the index just past the brace that closes the one at `openIndex`. */
function findMatchingBrace(content, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < content.length; i++) {
    const ch = content[i];
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return i + 1;
      }
    }
  }
  return -1;
}

/** Returns the body (without the outer braces) of the first `{` after `marker`. */
function extractBlock(content, marker, label) {
  const start = content.indexOf(marker);
  if (start === -1) {
    throw new Error(`Could not find "${marker}" (${label})`);
  }
  const open = content.indexOf('{', start + marker.length - 1);
  const end = open === -1 ? -1 : findMatchingBrace(content, open);
  if (end === -1) {
    throw new Error(`Unterminated block after "${marker}" (${label})`);
  }
  return content.slice(open + 1, end - 1);
}

/** Keeps only the text at brace depth 0 of `body`, so nested objects are skipped. */
function topLevelOnly(body) {
  let depth = 0;
  let out = '';
  for (const ch of body) {
    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
    } else if (depth === 0) {
      out += ch;
    }
  }
  return out;
}

/**
 * Removes `//` line comments (whole-line or trailing) and `/* *\/` block comments that sit
 * outside string literals. Newlines are kept so line structure is preserved.
 */
function stripComments(content) {
  let out = '';
  let quote = null;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];
    if (quote) {
      out += ch;
      if (ch === '\\') {
        out += next ?? '';
        i++;
      } else if (ch === quote) {
        quote = null;
      }
    } else if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      out += ch;
    } else if (ch === '/' && next === '/') {
      while (i < content.length && content[i] !== '\n') {
        i++;
      }
      out += '\n';
    } else if (ch === '/' && next === '*') {
      const end = content.indexOf('*/', i + 2);
      const stop = end === -1 ? content.length : end + 2;
      out += content.slice(i, stop).replace(/[^\n]/g, '');
      i = stop - 1;
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Parses `key: true|false` lines into `{ key: boolean }`. Every non-blank line must be a single
 * boolean assignment, so a default the parser cannot read fails loudly instead of being skipped.
 */
function parseBooleanAssignments(body, label) {
  const values = {};
  for (const raw of stripComments(body).split('\n')) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    const m = line.match(/^['"]?([A-Za-z_$][\w$]*)['"]?\s*:\s*(true|false)\s*,?$/);
    if (!m) {
      throw new Error(
        `${label}: cannot parse default "${line}"; use one "flag: true|false" per line`,
      );
    }
    values[m[1]] = m[2] === 'true';
  }
  return values;
}

function keysFromObjectBody(body) {
  const keys = [];
  for (const match of topLevelOnly(stripComments(body)).matchAll(
    /^\s*['"]?([A-Za-z_$][\w$]*)['"]?\??\s*:/gm,
  )) {
    keys.push(match[1]);
  }
  return keys;
}

/** CRD: the keys of `dashboardConfig.properties`, found by indentation. */
function parseCrdFlags(content) {
  return parseCrdProperties(content).map((p) => p.name);
}

/** CRD: the `dashboardConfig` properties whose description starts with "DEPRECATED". */
function parseCrdDeprecatedFlags(content) {
  return parseCrdProperties(content)
    .filter((p) => /^['"]?DEPRECATED\b/.test(p.description))
    .map((p) => p.name);
}

/** CRD: `{ name, description }` for each `dashboardConfig.properties` entry. */
function parseCrdProperties(content) {
  const lines = content.split('\n');
  const dcIndex = lines.findIndex((l) => /^\s*dashboardConfig:\s*$/.test(l));
  if (dcIndex === -1) {
    throw new Error('Could not find "dashboardConfig:" in the CRD');
  }
  const indentOf = (l) => l.length - l.trimStart().length;
  const dcIndent = indentOf(lines[dcIndex]);
  let propsIndex = -1;
  for (let i = dcIndex + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim() || l.trim().startsWith('#')) {
      continue;
    }
    if (indentOf(l) <= dcIndent) {
      break;
    }
    if (indentOf(l) === dcIndent + 2 && /^\s*properties:\s*$/.test(l)) {
      propsIndex = i;
      break;
    }
  }
  if (propsIndex === -1) {
    throw new Error('Could not find "dashboardConfig.properties" in the CRD');
  }
  const propsIndent = indentOf(lines[propsIndex]);
  let keyIndent = -1;
  const props = [];
  for (let i = propsIndex + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim() || l.trim().startsWith('#')) {
      continue;
    }
    const indent = indentOf(l);
    if (indent <= propsIndent) {
      break;
    }
    if (keyIndent === -1) {
      keyIndent = indent;
    }
    if (indent === keyIndent) {
      const m = l.match(/^\s*['"]?([\w$]+)['"]?:/);
      if (m) {
        props.push({ name: m[1], description: '' });
      }
    } else if (indent === keyIndent + 2 && props.length > 0) {
      const d = l.match(/^\s*description:\s*(.*)$/);
      if (d) {
        props[props.length - 1].description = d[1].trim();
      }
    }
  }
  return props;
}

/** TypeScript type alias: `export type <name> = { key: ...; key?: ...; }`. */
function parseTsTypeFlags(content, typeName) {
  return keysFromObjectBody(extractBlock(content, `export type ${typeName} = {`, typeName));
}

/**
 * Frontend: `const <name> = { ...groupA, ...groupB }` where each group is an
 * `export const groupX = { ... }` object literal in the same file.
 */
function parseFrontendFlags(content, combinedName) {
  const combined = extractBlock(content, `const ${combinedName} = {`, combinedName);
  const groups = [...combined.matchAll(/\.\.\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  if (groups.length === 0) {
    throw new Error(`"${combinedName}" spreads no flag groups`);
  }
  return groups.flatMap((group) =>
    keysFromObjectBody(extractBlock(content, `const ${group} = {`, group)),
  );
}

/** Backend: the `dashboardConfig` object literal inside `<name>`. */
function parseBackendFlags(content, constName) {
  const cr = extractBlock(content, `export const ${constName}`, constName);
  return keysFromObjectBody(extractBlock(cr, 'dashboardConfig:', `${constName}.dashboardConfig`));
}

/** Go struct: the json tag name of every field in `type <name> struct { ... }`. */
function parseGoStructFlags(content, structName) {
  const body = extractBlock(content, `type ${structName} struct {`, structName);
  const keys = [];
  for (const match of body.matchAll(/`[^`]*json:"([^",]+)[^"]*"[^`]*`/g)) {
    if (match[1] !== '-') {
      keys.push(match[1]);
    }
  }
  return keys;
}

/** Backend: `{ flag: boolean }` from the `dashboardConfig` literal inside `<name>`. */
function parseBackendDefaults(content, constName) {
  const cr = extractBlock(content, `export const ${constName}`, constName);
  const body = extractBlock(cr, 'dashboardConfig:', `${constName}.dashboardConfig`);
  return parseBooleanAssignments(body, `${constName}.dashboardConfig`);
}

/**
 * Go: `{ jsonTag: boolean }` from the `<field>: DashboardFeatureFlags{ ... }` literal in
 * `<varName>`, mapping Go field names back to json tags through the struct.
 * A bool field left out of the literal gets Go's zero value, so it starts as `false`.
 */
function parseGoDefaults(content, structName, varName) {
  const body = extractBlock(content, `type ${structName} struct {`, structName);
  const tagByField = {};
  const values = {};
  for (const m of body.matchAll(/^\s*(\w+)\s+(\S+)\s+`[^`]*json:"([^",]+)[^"]*"[^`]*`/gm)) {
    const [, field, type, tag] = m;
    if (tag === '-') {
      continue;
    }
    tagByField[field] = tag;
    if (type === 'bool') {
      values[tag] = false;
    }
  }
  const blank = extractBlock(content, `var ${varName} = `, varName);
  const literal = extractBlock(blank, `${structName}{`, `${varName} ${structName}`);
  const assigned = parseBooleanAssignments(literal, `${varName}.${structName}`);
  for (const [field, value] of Object.entries(assigned)) {
    values[tagByField[field] ?? field] = value;
  }
  return values;
}

/**
 * Compares default values between copies that hold runtime defaults.
 * A flag missing from one side is reported by compareFlags, not here.
 */
function compareDefaults(defaultsBySource) {
  const ids = Object.keys(defaultsBySource);
  const errors = [];
  const [first, ...rest] = ids;
  for (const flag of Object.keys(defaultsBySource[first])) {
    for (const other of rest) {
      if (!(flag in defaultsBySource[other])) {
        continue;
      }
      const a = defaultsBySource[first][flag];
      const b = defaultsBySource[other][flag];
      if (a !== b) {
        errors.push(`"${flag}" defaults to ${a} in ${first} but ${b} in ${other}`);
      }
    }
  }
  return errors;
}

function findDuplicates(keys) {
  const seen = new Set();
  const dupes = new Set();
  for (const k of keys) {
    if (seen.has(k)) {
      dupes.add(k);
    }
    seen.add(k);
  }
  return [...dupes];
}

/**
 * Compares the flag lists.
 * @param {Record<string, string[]>} flagsBySource source id -> flag names
 * @param {Record<string, {absentFrom: string[], reason: string}>} allowed
 * @param {string[]} deprecated flags the CRD marks as DEPRECATED; only the CRD must keep them
 * @returns {{ rows: {flag: string, present: Record<string, boolean>}[], errors: string[] }}
 */
function compareFlags(flagsBySource, allowed = ALLOWED_ABSENCES, deprecated = []) {
  const deprecatedSet = new Set(deprecated);
  const ids = Object.keys(flagsBySource);
  const errors = [];
  const sets = {};
  for (const id of ids) {
    for (const dupe of findDuplicates(flagsBySource[id])) {
      errors.push(`${id}: flag "${dupe}" is declared more than once`);
    }
    sets[id] = new Set(flagsBySource[id]);
  }

  const allFlags = [...new Set(ids.flatMap((id) => flagsBySource[id]))].toSorted((a, b) =>
    a.localeCompare(b),
  );

  const rows = allFlags.map((flag) => {
    const present = Object.fromEntries(ids.map((id) => [id, sets[id].has(flag)]));
    const missing = ids.filter((id) => !present[id]);
    const allowedMissing = allowed[flag]?.absentFrom ?? [];
    const unexpected = deprecatedSet.has(flag)
      ? missing.filter((id) => id === 'crd')
      : missing.filter((id) => !allowedMissing.includes(id));
    if (unexpected.length > 0) {
      const has = ids.filter((id) => present[id]);
      errors.push(
        `"${flag}" is missing from ${unexpected.join(', ')} (present in ${has.join(', ')})`,
      );
    }
    return { flag, present, deprecated: deprecatedSet.has(flag) };
  });

  for (const [flag, entry] of Object.entries(allowed)) {
    if (!allFlags.includes(flag)) {
      errors.push(`allow-list entry "${flag}" does not match any flag; remove it`);
      continue;
    }
    if (!entry.reason) {
      errors.push(`allow-list entry "${flag}" needs a reason`);
    }
    const stale = entry.absentFrom.filter((id) => sets[id]?.has(flag));
    if (stale.length > 0) {
      errors.push(
        `allow-list entry "${flag}" says it is absent from ${stale.join(
          ', ',
        )}, but it is present; update the entry`,
      );
    }
  }

  return { rows, errors };
}

function formatTable(rows, ids) {
  const width = Math.max(4, ...rows.map((r) => r.flag.length));
  const header = `${'flag'.padEnd(width)}  ${ids.map((id) => id.padEnd(8)).join(' ')}`;
  const lines = rows.map(
    (r) =>
      `${r.flag.padEnd(width)}  ${ids
        .map((id) => (r.present[id] ? 'x' : '-').padEnd(8))
        .join(' ')}${r.deprecated ? ' deprecated' : ''}`,
  );
  return [header, '-'.repeat(header.length), ...lines].join('\n');
}

function readSources(root = REPO_ROOT) {
  const contents = {};
  const flagsBySource = {};
  for (const source of SOURCES) {
    contents[source.id] = fs.readFileSync(path.join(root, source.file), 'utf8');
    const flags = source.parse(contents[source.id]);
    if (flags.length === 0) {
      throw new Error(`No flags parsed from ${source.file}; the parser needs updating`);
    }
    flagsBySource[source.id] = flags;
  }
  const defaultsBySource = {
    backend: parseBackendDefaults(contents.backend, 'blankDashboardCR'),
    coreBff: parseGoDefaults(contents.coreBff, 'DashboardFeatureFlags', 'BlankDashboardCR'),
  };
  return {
    flagsBySource,
    deprecated: parseCrdDeprecatedFlags(contents.crd),
    defaultsBySource: Object.fromEntries(
      DEFAULT_VALUE_SOURCES.map((id) => [id, defaultsBySource[id]]),
    ),
  };
}

function validate(argv = process.argv.slice(2)) {
  const { flagsBySource, deprecated, defaultsBySource } = readSources();
  const { rows, errors } = compareFlags(flagsBySource, ALLOWED_ABSENCES, deprecated);
  errors.push(...compareDefaults(defaultsBySource));

  console.log(`\n${colors.cyan}Dashboard feature flags${colors.reset}`);
  for (const source of SOURCES) {
    console.log(
      `  ${source.id.padEnd(9)} ${String(flagsBySource[source.id].length).padStart(3)}  ${
        source.file
      }`,
    );
  }
  if (argv.includes('--table')) {
    console.log(`\n${formatTable(rows, SOURCE_IDS)}`);
  }

  if (errors.length > 0) {
    console.error(`\n${colors.red}✗ Dashboard feature flags have drifted:${colors.reset}\n`);
    for (const error of errors) {
      console.error(`  ${error}`);
    }
    console.error(
      `\nAdd the flag to every copy listed above with the same default, mark it DEPRECATED in ` +
        `the CRD, or document an intentional absence in ALLOWED_ABSENCES in ` +
        `scripts/validate-dashboard-flags.js.\n`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `\n${colors.green}✓ All ${rows.length} dashboard feature flags match across copies.${colors.reset}\n`,
  );
  process.exitCode = 0;
}

if (require.main === module) {
  try {
    validate();
  } catch (error) {
    console.error(`${colors.red}${error.message}${colors.reset}`);
    process.exitCode = 1;
  }
}

module.exports = {
  ALLOWED_ABSENCES,
  SOURCES,
  compareDefaults,
  compareFlags,
  formatTable,
  parseBackendDefaults,
  parseBackendFlags,
  parseCrdDeprecatedFlags,
  parseCrdFlags,
  parseFrontendFlags,
  parseGoDefaults,
  parseGoStructFlags,
  parseTsTypeFlags,
  readSources,
};
