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
 * Trust model — read this before relying on the output:
 *   This is a CLASSIFIER, not a sandbox. It answers "is every change in this
 *   diff attributable to a low-risk dependency update?", under the assumption
 *   that the diff was produced by the app. That assumption is enforced
 *   separately, before this script runs: renovate-auto-merge.yml requires every
 *   commit to be platform-verified (the signature is the part a branch writer
 *   cannot forge) and attributed to the Renovate app, which is what
 *   platformCommit produces. Content that cannot be attributed to a changed
 *   direct dependency is refused rather than trusted, so an unexpected
 *   resolution, snapshot or top-level lockfile edit fails closed.
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
// pnpm never writes a `peerDependencies` importer section; a peer's resolved
// version lives under one of the normal sections. A peer specifier edit is
// therefore explained by the same importer's resolved entry there.
const LOCK_SECTION_ALIASES = {
  peerDependencies: ['dependencies', 'devDependencies', 'optionalDependencies'],
};
// Resolution fields that make pnpm fetch from somewhere other than the registry.
// Renovate never emits them, so their presence is tampering, not an update.
const NON_REGISTRY_RESOLUTION_KEYS = ['tarball', 'repo', 'directory', 'type'];
// Sections of pnpm-lock.yaml that describe the update itself. Every other
// top-level key must be identical, so an unrecognized field cannot ride along.
const LOCK_UPDATE_SECTIONS = ['importers', 'packages', 'snapshots'];
// Sections of pnpm-lock.yaml that carry the resolved graph, not the change set.
const LOCK_GRAPH_SECTIONS = ['packages', 'snapshots'];
const STABLE_VERSION = /^(\d+)\.(\d+)\.(\d+)$/;
// A plain semver range: optional operator, optional v, three numeric parts.
const SEMVER_RANGE = /^(?<op>\^|~|>=|<=|>|<|=)?v?(?<version>\d+\.\d+\.\d+)$/;
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

/** Deep equality. Object key order is ignored; array order is significant. */
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

/**
 * Splits a package.json specifier into its range operator and version.
 * Returns null for anything that is not a plain semver range (aliases, URLs,
 * `file:`/`link:`/`workspace:`/`catalog:` protocols, tags, ...), which are
 * refused rather than guessed at.
 */
const parseSpec = (spec) => {
  const m = SEMVER_RANGE.exec(String(spec ?? '').trim());
  return m ? { op: m.groups.op ?? '', version: m.groups.version } : null;
};

/** [lock, { "importer|section|dep": version }] for direct deps in a pnpm v9 lockfile. */
const lockDirectDeps = (text) => {
  const lock = yamlToJson(text, 'pnpm-lock.yaml') ?? {};
  if (!String(lock.lockfileVersion ?? '').startsWith('9')) {
    throw new Ineligible(`unsupported lockfileVersion ${lock.lockfileVersion}`);
  }
  const deps = {};
  const specs = {};
  Object.entries(lock.importers ?? {}).forEach(([importer, sections]) => {
    LOCK_DEP_SECTIONS.forEach((section) => {
      Object.entries(sections?.[section] ?? {}).forEach(([dep, info]) => {
        const key = `${importer}|${section}|${dep}`;
        // strip the peer-dependency suffix: 5.0.1(react@18.3.1) -> 5.0.1
        [deps[key]] = String(info?.version ?? '').split('(');
        specs[key] = String(info?.specifier ?? '');
      });
    });
  });
  return [lock, deps, specs];
};

/**
 * A pnpm importer is `{ <section>: { <dep>: { specifier, version } } }`. A
 * version update may change only `specifier` and `version`; every other part of
 * the importer describes the workspace, not the change, so it must be identical.
 * Without this, metadata could ride along inside an otherwise eligible bump.
 */
const checkImporterShape = (baseImporters, headImporters) => {
  if (!sameKeys(baseImporters, headImporters)) {
    throw new Ineligible('pnpm-lock.yaml: importers added or removed');
  }
  Object.entries(headImporters).forEach(([importer, sections]) => {
    const before = baseImporters[importer] ?? {};
    if (!sameKeys(before, sections ?? {})) {
      throw new Ineligible(`pnpm-lock.yaml: sections changed for importer '${importer}'`);
    }
    Object.entries(sections ?? {}).forEach(([section, entries]) => {
      if (!LOCK_DEP_SECTIONS.includes(section)) {
        if (!sameValue(before[section], entries)) {
          throw new Ineligible(`pnpm-lock.yaml: '${section}' changed for importer '${importer}'`);
        }
        return;
      }
      Object.entries(entries ?? {}).forEach(([dep, info]) => {
        // Pre-existing metadata is tolerated; adding or changing a field other
        // than `specifier`/`version` is not part of a version update.
        const extra = (entry) =>
          Object.fromEntries(
            Object.entries(entry ?? {}).filter(([key]) => key !== 'specifier' && key !== 'version'),
          );
        const beforeExtra = extra(before[section]?.[dep]);
        const afterExtra = extra(info);
        if (!sameValue(beforeExtra, afterExtra)) {
          const changed = union(Object.keys(beforeExtra), Object.keys(afterExtra));
          throw new Ineligible(
            `pnpm-lock.yaml: unexpected ${changed.join(', ')} on ${dep} (importer '${importer}')`,
          );
        }
      });
    });
  });
};

/**
 * Package name from a pnpm graph key.
 *   /foo@1.2.3             -> foo
 *   /@scope/pkg@1.2.3(a@1) -> @scope/pkg
 *   1.2.3                  -> '' (not a package key)
 */
const snapshotName = (key) => {
  const m = /^\/?(?<name>(?:@[^/]+\/)?[^@(]+)@/.exec(String(key ?? ''));
  return m ? m.groups.name.trim() : '';
};

/** Version from a pnpm graph key, for binding an entry to a specific bump. */
const snapshotVersion = (key) => {
  const name = snapshotName(key);
  if (!name) {
    return '';
  }
  const rest = String(key).replace(/^\/?/, '').slice(name.length);
  return rest.replace(/^@/, '').split('(')[0];
};

/**
 * Renovate only ever resolves packages from the npm registry. A new or altered
 * non-registry entry (tarball URL, git repo, local directory) is tampering, not
 * an update. Entries that already existed unchanged in the base lockfile are
 * tolerated: they are not part of this diff, and refusing them would block every
 * npm PR in a repo that pins one package from a local path.
 */
const checkResolutions = (baseLock, headLock) => {
  LOCK_GRAPH_SECTIONS.forEach((section) => {
    const before = baseLock[section] ?? {};
    Object.entries(headLock[section] ?? {}).forEach(([key, info]) => {
      const resolution = info?.resolution;
      if (!resolution || typeof resolution !== 'object') {
        return;
      }
      const bad = Object.keys(resolution).filter((k) => NON_REGISTRY_RESOLUTION_KEYS.includes(k));
      if (bad.length === 0) {
        return;
      }
      if (Object.hasOwn(before, key) && sameValue(before[key]?.resolution, resolution)) {
        return;
      }
      throw new Ineligible(
        `pnpm-lock.yaml: ${section}['${key}'] resolves outside the registry (${bad.join(', ')})`,
      );
    });
  });
};

const LINK_FIELDS = ['dependencies', 'optionalDependencies', 'peerDependencies'];

/**
 * A snapshot entry lists the resolved versions of that package's own
 * dependencies. An unchanged package may follow a bumped transitive dep, but
 * only in those version maps, only for a dependency that is part of the
 * update, and only to the version that update resolves to. Every other field
 * must be identical.
 */
const attributableSnapshot = (before = {}, after = {}, changedNames, changedVersions) => {
  const fields = union(Object.keys(before), Object.keys(after));
  return fields.every((field) => {
    if (!LINK_FIELDS.includes(field)) {
      return sameValue(before[field], after[field]);
    }
    const a = before[field] ?? {};
    const b = after[field] ?? {};
    return union(Object.keys(a), Object.keys(b)).every((dep) => {
      if (sameValue(a[dep], b[dep])) {
        return true;
      }
      if (!changedNames.has(dep)) {
        return false;
      }
      const allowed = changedVersions.get(dep);
      // pnpm appends a peer suffix to a resolved version; the version itself
      // is what the update has to explain.
      const resolved = String(b[dep] ?? '').split('(')[0];
      return Boolean(allowed && resolved && allowed.has(resolved));
    });
  });
};

/**
 * The resolved graph may only change where a changed dependency explains it.
 * Entries for packages that are not part of the update must be byte-equal.
 * Newly added entries are allowed (a bump legitimately pulls new transitive
 * versions); removals are allowed (pnpm prunes what is no longer reachable).
 */
const checkAttributable = (baseLock, headLock, changedNames, changedVersions) => {
  LOCK_GRAPH_SECTIONS.forEach((section) => {
    const before = baseLock[section] ?? {};
    Object.entries(headLock[section] ?? {}).forEach(([key, info]) => {
      if (!Object.hasOwn(before, key)) {
        return;
      }
      const name = snapshotName(key);
      if (name && changedNames.has(name)) {
        // Only the version this update resolves to is explained by the bump.
        // Any other version of the same package must be byte-equal, so a
        // tampered or unrelated copy cannot ride along.
        const allowed = changedVersions.get(name);
        const version = snapshotVersion(key);
        if (allowed && version && allowed.has(version)) {
          return;
        }
      }
      const original = before[key];
      if (sameValue(original, info)) {
        return;
      }
      // `packages` holds resolution/integrity metadata: any difference on a
      // package outside the update is unexplained. `snapshots` holds resolved
      // dependency versions, which may legitimately follow a bumped transitive.
      const allowed =
        section === 'snapshots' &&
        attributableSnapshot(original, info, changedNames, changedVersions);
      if (!allowed) {
        throw new Ineligible(
          `pnpm-lock.yaml: ${section}['${key}'] changed, but '${name || key}' is not a ` +
            'changed direct dependency',
        );
      }
    });
  });
};

/** Whether a resolved version falls inside a parsed semver range. */
const satisfies = (resolved, spec) => {
  const r = stable(resolved);
  const s = stable(spec.version);
  if (!r || !s) {
    return false;
  }
  switch (spec.op) {
    case '':
    case '=':
      return compare(r, s) === 0;
    case '^':
      // ^0.0.x pins the patch: ^0.0.2 allows 0.0.2 only.
      if (s[0] === 0 && s[1] === 0) {
        return compare(r, s) === 0;
      }
      return compare(r, s) >= 0 && r[0] === s[0] && (s[0] !== 0 || r[1] === s[1]);
    case '~':
      return compare(r, s) >= 0 && r[0] === s[0] && r[1] === s[1];
    case '>=':
      return compare(r, s) >= 0;
    case '>':
      return compare(r, s) > 0;
    case '<=':
      return compare(r, s) <= 0;
    case '<':
      return compare(r, s) < 0;
    default:
      return false;
  }
};

/**
 * The lockfile change that explains a specifier edit for this importer and
 * dependency. Falls back to the sections pnpm actually uses for peers.
 */
const findLockChange = (changedKeys, importer, section, dep) => {
  const direct = changedKeys.get(`${importer}|${section}|${dep}`);
  if (direct) {
    return direct;
  }
  const aliases = LOCK_SECTION_ALIASES[section] ?? [];
  for (const alias of aliases) {
    const change = changedKeys.get(`${importer}|${alias}|${dep}`);
    if (change) {
      return change;
    }
  }
  return null;
};

const checkNpm = (base, head, files, max) => {
  let changes = [];
  const changedKeys = new Map();
  // `${importer}|${dep}` -> set of specifiers declared by the manifests being
  // changed. Used to authorize lockfile specifier edits.
  const manifestSpecs = new Map();
  let baseLock = null;
  let headLock = null;
  let baseSpecs = {};
  let headSpecs = {};
  if (files.includes('pnpm-lock.yaml')) {
    let before;
    let after;
    [baseLock, before, baseSpecs] = lockDirectDeps(blob(base, 'pnpm-lock.yaml') ?? '');
    [headLock, after, headSpecs] = lockDirectDeps(blob(head, 'pnpm-lock.yaml') ?? '');
    // Fail closed on every top-level key we do not know: lockfileVersion,
    // settings, overrides, and anything pnpm adds later. Only the three
    // update-carrying sections may differ, and those are checked below.
    union(Object.keys(baseLock), Object.keys(headLock))
      .filter((key) => !LOCK_UPDATE_SECTIONS.includes(key))
      .forEach((key) => {
        if (!sameValue(baseLock[key], headLock[key])) {
          throw new Ineligible(`pnpm-lock.yaml: '${key}' changed`);
        }
      });
    // Importers are the shape of the workspace, not part of a version update,
    // so a bump may only move an entry's `specifier`/`version`. Section names,
    // non-dependency sections and any extra entry field must be identical.
    checkImporterShape(baseLock.importers ?? {}, headLock.importers ?? {});
    checkResolutions(baseLock, headLock);

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
        const [, , name] = key.split('|');
        changedKeys.set(key, { from, to });
        changes.push([name, from, to]);
      }
    });
  }
  changes = uniqueChanges(changes);
  const changedNames = new Set(changes.map(([name]) => name));
  const changedVersions = new Map();
  changes.forEach(([name, , to]) => {
    if (!changedVersions.has(name)) {
      changedVersions.set(name, new Set());
    }
    changedVersions.get(name).add(to);
  });
  if (baseLock && headLock) {
    checkAttributable(baseLock, headLock, changedNames, changedVersions);
  }

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
      // The importer a package.json belongs to, using pnpm's relative-dir keys.
      const importer = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '.';
      NPM_DEP_SECTIONS.forEach((section) => {
        const o = prev[section] ?? {};
        const n = next[section] ?? {};
        Object.entries(n).forEach(([dep, declared]) => {
          const key = `${importer}|${dep}`;
          if (!manifestSpecs.has(key)) {
            manifestSpecs.set(key, new Set());
          }
          manifestSpecs.get(key).add(String(declared));
        });
        if (!sameKeys(o, n)) {
          throw new Ineligible(`${path}: ${section} entries added/removed`);
        }
        Object.entries(o).forEach(([dep, spec]) => {
          if (n[dep] === spec) {
            return;
          }
          // A specifier edit must be explained by the SAME importer+dep
          // resolving to a new version. A change elsewhere in the monorepo does
          // not authorize it.
          const change = findLockChange(changedKeys, importer, section, dep);
          if (!change) {
            throw new Ineligible(
              `${path}: ${dep} specifier changed (${spec} -> ${n[dep]}) without a matching ` +
                `lockfile change for importer '${importer}'`,
            );
          }
          const from = parseSpec(spec);
          const to = parseSpec(n[dep]);
          if (!from || !to) {
            throw new Ineligible(
              `${path}: ${dep} specifier ${spec} -> ${n[dep]} is not a plain semver range`,
            );
          }
          if (from.op !== to.op) {
            throw new Ineligible(
              `${path}: ${dep} range operator changed ('${from.op}' -> '${to.op}')`,
            );
          }
          if (!satisfies(change.from, from) || !satisfies(change.to, to)) {
            throw new Ineligible(
              `${path}: ${dep} specifier ${spec} -> ${n[dep]} does not cover the resolved ` +
                `versions ${change.from} -> ${change.to}`,
            );
          }
          const kind = classify(`${path}: ${dep} specifier`, from.version, to.version);
          if (kind === 'minor' && max === 'patch') {
            throw new Ineligible(
              `${path}: ${dep} specifier ${spec} -> ${n[dep]} is a minor update in a patch tier`,
            );
          }
        });
      });
    });

  // A lockfile specifier may only move when a manifest declares the same new
  // range, so a lockfile-only edit cannot widen what the manifest allows.
  Object.entries(headSpecs).forEach(([key, spec]) => {
    if (String(baseSpecs[key]) === String(spec)) {
      return;
    }
    const [importer, , dep] = key.split('|');
    const declared = manifestSpecs.get(`${importer}|${dep}`);
    if (!declared || !declared.has(String(spec))) {
      throw new Ineligible(
        `pnpm-lock.yaml: specifier for ${dep} (importer '${importer}') changed to '${spec}' ` +
          'without a matching package.json change',
      );
    }
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
  // `go mod tidy` may reorder non-require blocks; sort so the comparison is
  // insensitive to ordering rather than failing on a cosmetic rewrite.
  return [requires, other.toSorted()];
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
      // requires (e.g. testify 1.12 no longer pulls in gopkg.in/yaml.v3). Those
      // are bookkeeping and are allowed. A VERSION CHANGE of an indirect module
      // is not bookkeeping: it selects different dependency code that no direct
      // update explains, so it needs a human. go.sum authenticates module
      // CONTENTS; it does not pin which version go.mod selects.
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

      const addedIndirect = [];
      Object.keys(newReq)
        .filter((mod) => newReq[mod][1])
        .forEach((mod) => {
          if (!Object.hasOwn(oldReq, mod)) {
            if (!stable(newReq[mod][0])) {
              throw new Ineligible(
                `${path}: new indirect require ${mod} ${newReq[mod][0]} is not a stable release`,
              );
            }
            addedIndirect.push([mod, newReq[mod][0]]);
            return;
          }
          if (oldReq[mod][0] !== newReq[mod][0]) {
            throw new Ineligible(
              `${path}: indirect require ${mod} ${oldReq[mod][0]} -> ${newReq[mod][0]} changed; ` +
                'indirect version changes need human review',
            );
          }
        });
      // A module that stops being direct is only bookkeeping if its version did
      // not move; a re-classification plus a bump is an unexplained change.
      oldDirect
        .filter((mod) => Object.hasOwn(newReq, mod) && newReq[mod][1])
        .forEach((mod) => {
          if (oldReq[mod][0] !== newReq[mod][0]) {
            throw new Ineligible(
              `${path}: ${mod} became indirect with a version change; needs human review`,
            );
          }
        });
      if (addedIndirect.length > 0) {
        // The module@version must be described by go.sum. If the diff does not
        // touch go.sum, an already-known version is still acceptable (tidy can
        // promote a require whose hashes were already present).
        const sumPath = path.replace(/go\.mod$/, 'go.sum');
        const sum =
          (files.includes(sumPath) ? blob(head, sumPath) : null) ?? blob(base, sumPath) ?? '';
        addedIndirect.forEach(([mod, version]) => {
          const line = `${mod} ${version}`;
          if (!sum.split('\n').some((l) => l.startsWith(`${line} `))) {
            throw new Ineligible(`${path}: new indirect require ${line} is not in go.sum`);
          }
        });
      }
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
    const rule = Object.hasOwn(TIERS, tier) ? TIERS[tier] : null;
    if (!rule) {
      throw new Ineligible(`tier '${tier}' is not auto-merge eligible`);
    }
    const mergeBase = git('merge-base', base, head).trim();
    // --no-renames keeps a moved file visible as delete+add. With rename
    // detection, --name-only reports only the destination, which could move a
    // file out of an ignored path without the filters below ever seeing it.
    const files = git('diff', '--no-renames', '--name-only', mergeBase, head)
      .split('\n')
      .filter(Boolean);
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

module.exports = {
  TIERS,
  Ineligible,
  classify,
  compare,
  main,
  parseGoMod,
  parseSpec,
  sameValue,
  satisfies,
  snapshotName,
  snapshotVersion,
  stable,
  uniqueChanges,
};

if (require.main === module) {
  if (process.argv.length !== 5) {
    throw new Error('usage: renovate-automerge-check.js <base_sha> <head_sha> <tier>');
  }
  main(...process.argv.slice(2));
}
