/**
 * Decides whether a Renovate PR may be auto-merged, from the DIFF ALONE.
 *
 * Usage:
 *   node .github/scripts/renovate-automerge-check.js <base_sha> <head_sha> <tier>
 *
 * <tier> is the renovate/<tier> label Renovate applied (see
 * .github/renovate.json5). The label only says what the PR CLAIMS to be; this
 * script re-derives the update class from the files and refuses anything that
 * does not match, so a wrong or tampered label can never widen what merges.
 *
 * Eligible tiers and what they allow:
 *   npm-patch — direct npm deps change only within the same major.minor
 *   npm-minor — direct npm deps change within the same major, and every
 *               minor bump starts from >= 1.0.0
 *   go-patch / go-minor — same rules for direct go.mod requires
 * Common rules: only manifest/lock files may change, nothing under /upstream/,
 * no added or removed direct dependencies, no prerelease/pseudo versions, and
 * every non-dependency part of each manifest must be identical.
 *
 * Reads git objects only (never executes PR content) and uses no npm
 * dependencies, so the workflow needs no install step. pnpm-lock.yaml is
 * converted to JSON with `yq` (preinstalled on GitHub-hosted Ubuntu runners).
 * Prints the reasons and a final "eligible=true|false" line; exits 0 unless
 * invoked wrongly.
 */
'use strict';

const { execFileSync } = require('child_process');

const TIERS = {
  'npm-patch': { ecosystem: 'npm', max: 'patch' },
  'npm-minor': { ecosystem: 'npm', max: 'minor' },
  'go-patch': { ecosystem: 'go', max: 'patch' },
  'go-minor': { ecosystem: 'go', max: 'minor' },
};

const NPM_FILE = /(^|\/)(package\.json|pnpm-lock\.yaml)$/;
const GO_FILE = /(^|\/)go\.(mod|sum)$/;
const UPSTREAM_PATH = /(^|\/)upstream\//;
const NPM_DEP_SECTIONS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];
const LOCK_DEP_SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies'];
const STABLE_VERSION = /^(\d+)\.(\d+)\.(\d+)$/;
const MAX_BUFFER = 256 * 1024 * 1024;

class Ineligible extends Error {}

const git = (...args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', maxBuffer: MAX_BUFFER });
  } catch {
    throw new Ineligible(`git ${args.join(' ')} failed`);
  }
};

/** File content at a revision, or null when the file does not exist there. */
const blob = (rev, path) => {
  try {
    return execFileSync('git', ['show', `${rev}:${path}`], {
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
};

const parseJson = (text, path) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Ineligible(`${path}: invalid JSON (${e.message})`);
  }
};

const yamlToJson = (text, path) => {
  try {
    return JSON.parse(
      execFileSync('yq', ['-o=json', '.'], {
        input: text,
        encoding: 'utf8',
        maxBuffer: MAX_BUFFER,
      }),
    );
  } catch (e) {
    throw new Ineligible(`${path}: cannot parse YAML (${e.message.split('\n')[0]})`);
  }
};

// Order-insensitive deep equality for parsed JSON/YAML values.
const sameValue = (a, b) => {
  if (a === b) {
    return true;
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && sameValue(a[k], b[k]));
};

const sameKeys = (a, b) => {
  const ka = Object.keys(a).toSorted();
  const kb = Object.keys(b).toSorted();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i]);
};

const union = (a, b) => [...new Set([...a, ...b])];

/**
 * [major, minor, patch] for a stable release, null for anything else
 * (prereleases, Go pseudo-versions, +incompatible, link:, ranges, ...).
 */
const stable = (version) => {
  const m = STABLE_VERSION.exec(String(version ?? '').replace(/^v/, ''));
  return m ? m.slice(1).map(Number) : null;
};

const compare = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** 'patch' or 'minor' for an allowed change, throwing for anything else. */
const classify = (name, from, to) => {
  const prev = stable(from);
  const next = stable(to);
  const change = `${name}: ${from} -> ${to}`;
  if (!prev || !next) {
    throw new Ineligible(`${change} is not a stable-release change`);
  }
  if (compare(next, prev) <= 0) {
    throw new Ineligible(`${change} is a downgrade`);
  }
  if (next[0] !== prev[0]) {
    throw new Ineligible(`${change} is a major update`);
  }
  if (next[1] === prev[1]) {
    return 'patch';
  }
  if (prev[0] === 0) {
    throw new Ineligible(`${change} is a minor update of a pre-1.0 package`);
  }
  return 'minor';
};

const checkChanges = (changes, max) => {
  if (changes.length === 0) {
    throw new Ineligible('no direct dependency changed');
  }
  changes.forEach(([name, from, to]) => {
    const kind = classify(name, from, to);
    if (kind === 'minor' && max === 'patch') {
      throw new Ineligible(`${name}: ${from} -> ${to} is a minor update in a patch tier`);
    }
    process.stdout.write(`ok: ${name} ${from} -> ${to} (${kind})\n`);
  });
};

// Drops repeated [name, from, to] triples, keeping first-seen order.
const uniqueChanges = (changes) => {
  const seen = new Set();
  return changes.filter((c) => {
    const key = JSON.stringify(c);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

// ── npm ──────────────────────────────────────────────────────────────────

/** [lock, { "importer|section|dep": version }] for direct deps in a pnpm v9 lockfile. */
const lockDirectDeps = (text) => {
  const lock = yamlToJson(text, 'pnpm-lock.yaml') ?? {};
  if (!String(lock.lockfileVersion ?? '').startsWith('9')) {
    throw new Ineligible(`unsupported lockfileVersion ${lock.lockfileVersion}`);
  }
  const deps = {};
  Object.entries(lock.importers ?? {}).forEach(([importer, sections]) => {
    LOCK_DEP_SECTIONS.forEach((section) => {
      Object.entries(sections?.[section] ?? {}).forEach(([dep, info]) => {
        // strip the peer-dependency suffix: 5.0.1(react@18.3.1) -> 5.0.1
        [deps[`${importer}|${section}|${dep}`]] = String(info?.version ?? '').split('(');
      });
    });
  });
  return [lock, deps];
};

const checkNpm = (base, head, files, max) => {
  let changes = [];
  if (files.includes('pnpm-lock.yaml')) {
    const [baseLock, before] = lockDirectDeps(blob(base, 'pnpm-lock.yaml') ?? '');
    const [headLock, after] = lockDirectDeps(blob(head, 'pnpm-lock.yaml') ?? '');
    ['lockfileVersion', 'settings', 'overrides'].forEach((key) => {
      if (!sameValue(baseLock[key], headLock[key])) {
        throw new Ineligible(`pnpm-lock.yaml: '${key}' changed`);
      }
    });
    const added = Object.keys(after).filter((k) => !Object.hasOwn(before, k));
    const removed = Object.keys(before).filter((k) => !Object.hasOwn(after, k));
    if (added.length > 0) {
      throw new Ineligible(`direct dependencies added: ${added.join(', ')}`);
    }
    if (removed.length > 0) {
      throw new Ineligible(`direct dependencies removed: ${removed.join(', ')}`);
    }
    Object.entries(before).forEach(([key, from]) => {
      const to = after[key];
      if (from !== to) {
        changes.push([key.split('|').pop(), from, to]);
      }
    });
  }
  changes = uniqueChanges(changes);
  const changedNames = new Set(changes.map(([name]) => name));

  files
    .filter((path) => path !== 'pnpm-lock.yaml')
    .forEach((path) => {
      const oldText = blob(base, path);
      if (oldText === null) {
        throw new Ineligible(`${path} was added`);
      }
      const newText = blob(head, path);
      if (newText === null) {
        throw new Ineligible(`${path} was deleted`);
      }
      const prev = parseJson(oldText, path);
      const next = parseJson(newText, path);
      union(Object.keys(prev), Object.keys(next)).forEach((key) => {
        if (!NPM_DEP_SECTIONS.includes(key) && !sameValue(prev[key], next[key])) {
          throw new Ineligible(`${path}: '${key}' changed`);
        }
      });
      NPM_DEP_SECTIONS.forEach((section) => {
        const o = prev[section] ?? {};
        const n = next[section] ?? {};
        if (!sameKeys(o, n)) {
          throw new Ineligible(`${path}: ${section} entries added/removed`);
        }
        Object.entries(o).forEach(([dep, spec]) => {
          // A specifier change must belong to a dependency whose resolved
          // version was checked above.
          if (n[dep] !== spec && !changedNames.has(dep)) {
            throw new Ineligible(`${path}: ${dep} specifier changed without a lockfile change`);
          }
        });
      });
    });

  checkChanges(changes, max);
};

// ── go ───────────────────────────────────────────────────────────────────

const REQUIRE_LINE = /^\s*(?:require\s+)?(\S+)\s+(v\S+)(\s*\/\/\s*indirect)?\s*$/;

/** [{ module: [version, indirect] }, other non-require lines] */
const parseGoMod = (text) => {
  const requires = {};
  const other = [];
  let inRequire = false;
  text.split('\n').forEach((raw) => {
    const line = raw.replace(/\s*\/\/(?!\s*indirect).*/, '').trimEnd();
    if (line.trim() === '') {
      return;
    }
    const m = REQUIRE_LINE.exec(line);
    if (/^require\s*\(\s*$/.test(line)) {
      inRequire = true;
    } else if (inRequire && line.trim() === ')') {
      inRequire = false;
    } else if ((inRequire || line.startsWith('require ')) && m) {
      requires[m[1]] = [m[2], m[3] !== undefined];
    } else {
      other.push(line.trim());
    }
  });
  return [requires, other];
};

const checkGo = (base, head, files, max) => {
  const changes = [];
  files
    .filter((path) => path.endsWith('go.mod'))
    .forEach((path) => {
      const oldText = blob(base, path);
      if (oldText === null) {
        throw new Ineligible(`${path} was added`);
      }
      const newText = blob(head, path);
      if (newText === null) {
        throw new Ineligible(`${path} was deleted`);
      }
      const [oldReq, oldOther] = parseGoMod(oldText);
      const [newReq, newOther] = parseGoMod(newText);
      if (!sameValue(oldOther, newOther)) {
        throw new Ineligible(`${path}: non-require content changed (go/toolchain/replace/...)`);
      }

      // `go mod tidy` legitimately adds, drops, and re-classifies `// indirect`
      // requires (e.g. testify 1.12 no longer pulls in gopkg.in/yaml.v3). Their
      // versions are fixed by go.sum and the direct requires, so they are not
      // checked. A DIRECT require is different: it is code the module imports,
      // so a module may become direct only if it was already required.
      const oldDirect = Object.keys(oldReq).filter((mod) => !oldReq[mod][1]);
      const newDirect = Object.keys(newReq).filter((mod) => !newReq[mod][1]);
      const gone = oldDirect.filter((mod) => !Object.hasOwn(newReq, mod));
      if (gone.length > 0) {
        throw new Ineligible(`${path}: direct requires removed: ${gone.join(', ')}`);
      }
      const added = newDirect.filter((mod) => !Object.hasOwn(oldReq, mod));
      if (added.length > 0) {
        throw new Ineligible(`${path}: direct requires added: ${added.join(', ')}`);
      }
      union(oldDirect, newDirect).forEach((mod) => {
        const from = oldReq[mod][0];
        const to = newReq[mod][0];
        if (from !== to) {
          changes.push([mod, from, to]);
        }
      });
    });

  // A go.sum may legitimately change alone only when its go.mod is untouched
  // because nothing direct moved; that is not a dependency update.
  const orphans = files
    .filter((path) => path.endsWith('go.sum'))
    .filter((sum) => !files.includes(sum.replace(/go\.sum$/, 'go.mod')));
  if (orphans.length > 0) {
    throw new Ineligible(`go.sum changed without its go.mod: ${orphans.join(', ')}`);
  }

  checkChanges(uniqueChanges(changes), max);
};

// ── main ─────────────────────────────────────────────────────────────────

const main = (base, head, tier) => {
  try {
    const rule = TIERS[tier];
    if (!rule) {
      throw new Ineligible(`tier '${tier}' is not auto-merge eligible`);
    }
    const mergeBase = git('merge-base', base, head).trim();
    const files = git('diff', '--name-only', mergeBase, head).split('\n').filter(Boolean);
    if (files.length === 0) {
      throw new Ineligible('empty diff');
    }
    const upstream = files.filter((f) => UPSTREAM_PATH.test(f));
    if (upstream.length > 0) {
      throw new Ineligible(`touches upstream-synced files: ${upstream.join(', ')}`);
    }
    const pattern = rule.ecosystem === 'npm' ? NPM_FILE : GO_FILE;
    const foreign = files.filter((f) => !pattern.test(f));
    if (foreign.length > 0) {
      throw new Ineligible(`files outside ${rule.ecosystem} manifests: ${foreign.join(', ')}`);
    }

    process.stdout.write(
      `tier=${tier} files=${files.length} merge_base=${mergeBase.slice(0, 10)}\n`,
    );
    if (rule.ecosystem === 'npm') {
      checkNpm(mergeBase, head, files, rule.max);
    } else {
      checkGo(mergeBase, head, files, rule.max);
    }
    process.stdout.write('eligible=true\n');
  } catch (e) {
    if (!(e instanceof Ineligible)) {
      throw e;
    }
    process.stdout.write(`not eligible: ${e.message}\neligible=false\n`);
  }
};

if (process.argv.length !== 5) {
  throw new Error('usage: renovate-automerge-check.js <base_sha> <head_sha> <tier>');
}
main(...process.argv.slice(2));
