---
name: dependency-eval
description: Evaluate a package's dependencies against actual imports, check version alignment across the monorepo, and validate override consistency. Use when asked to audit deps, check for unused/undeclared dependencies, or prepare for a version bump.
---

# Dependency Evaluation — ODH Dashboard

Audits a package's declared dependencies against its actual usage and the wider monorepo. Catches undeclared imports, unused deps, version misalignment, and override conflicts.

## Inputs

The user provides a **package name** (e.g., `model-registry`, `gen-ai`, `frontend`). Resolve it to a directory:

- If it matches a directory under `packages/`, use `packages/<name>/`
- If it matches `frontend` or `backend`, use that directory directly
- If ambiguous, list matches and ask the user to confirm

### Input validation (CWE-78)

Before running any shell commands, validate the resolved directory:

- The package name must match `^[a-z0-9-]+$`.
- The resolved path must be one of: `frontend`, `backend`, or `packages/<name>` where `<name>` passes the regex above.
- Reject paths containing `..`, spaces, shell metacharacters (``; | & $ ` ( ) { }``), or absolute-path prefixes.
- Construct the resolved path using `path.join`/`path.resolve` — never by string-interpolating user input into a shell string.
- When invoking `rg`, pass arguments as an array (or use the `--` sentinel before the path argument) so the directory cannot be interpreted as shell tokens.

## Phase 1: Gather context

1. Read the target package's `package.json` — record `dependencies`, `devDependencies`, and `overrides` (if any).
2. Read the **root** `package.json` — record `overrides` and `workspaces`.
3. If `frontend/package.json` or `backend/package.json` exist and have `overrides`, record those too.
4. Identify the package's source directory — typically `src/` or `frontend/src/` within the package.

## Phase 2: Scan imports

Scan all `.ts`, `.tsx`, `.js`, `.jsx` files in the package's source directory for import/require statements.

```bash
rg -t ts -t js --no-filename -o \
  "(?:from\s+['\"]([^'\"./][^'\"]*)['\"]|import\s+['\"]([^'\"./][^'\"]*)['\"]|import\s*\(\s*['\"]([^'\"./][^'\"]*)['\"]\s*\)|require\s*\(\s*['\"]([^'\"./][^'\"]*)['\"]\s*\))" \
  -- "<package-src-dir>"
```

This covers:
- Named imports: `import { foo } from 'pkg'` / `export { bar } from 'pkg'`
- Side-effect imports: `import 'pkg'`
- Dynamic imports: `import('pkg')`
- CommonJS requires: `require('pkg')`

For each match, extract the **package name** (the first path segment, or first two segments for scoped packages like `@patternfly/react-core`).

Build a set of **actually imported packages**.

## Phase 3: Run checks

### Check 1: Undeclared dependencies

Packages imported in source but not listed in `dependencies` or `devDependencies`.

These work today because npm workspace hoisting pulls them from the root, but they'll break if the package is ever extracted or the root dep is removed.

For each undeclared dep:
- Look up the version used in the root `package.json` or root `package-lock.json`
- Propose adding it to the package's `dependencies` (or `devDependencies` if only used in test files) with an aligned version

### Check 2: Unused dependencies

Packages listed in `dependencies` or `devDependencies` but never imported in source.

**Exceptions — do NOT flag these as unused:**
- Packages in `devDependencies` that are used via config files (e.g., `eslint`, `jest`, `typescript`, `webpack`, `ts-loader`, `css-loader`, `@types/*`)
- Packages referenced in `scripts` in `package.json`
- `@patternfly/react-tokens` or `@patternfly/patternfly` (often used via SCSS, not JS imports)

For each genuinely unused dep, propose removing it.

### Check 3: Version misalignment

Compare the package's declared dependency versions against the same dependency declared in:
- Root `package.json`
- Other workspace `package.json` files (spot check 2-3 siblings)

Flag cases where:
- The package pins a different version than the root
- The package uses a range that doesn't intersect with the root's range
- The package declares a dep that the root has in `overrides` at a different version

### Check 4: Override conflicts

For each dep in the package's `dependencies`/`devDependencies`, check if it appears in any `overrides` block (root, frontend, or backend `package.json`).

Flag if:
- The package declares version `^2.0.0` but root overrides it to `>=3.0.0`
- The override exists in one `package.json` but not another (inconsistency)
- The package's dep range conflicts with the override range

### Check 5: Nested lockfile drift (if applicable)

If the package has its own `package-lock.json` (common in `packages/*/frontend/`):
- Note that this lockfile is **not managed by Dependabot**
- Compare key shared deps (React, PatternFly, TypeScript) against root lockfile versions
- Flag significant version drift (e.g., root has `react@18.3.1` but nested has `react@18.2.0`)

## Phase 4: Generate report

```md
## Dependency Evaluation — <package-name>

### Summary
- Source files scanned: N
- Unique imports found: N
- Declared dependencies: N (deps) + N (devDeps)
- Issues found: N

### Undeclared Dependencies
| Package | Used in | Suggested version | Add to |
|---------|---------|-------------------|--------|

### Unused Dependencies
| Package | Declared in | Action |
|---------|-------------|--------|

### Version Misalignment
| Package | This package | Root | Override | Issue |
|---------|-------------|------|----------|-------|

### Override Conflicts
| Package | Declared | Override | Location | Conflict |
|---------|----------|----------|----------|----------|

### Nested Lockfile Drift
| Package | Root version | Nested version | Drift |
|---------|-------------|----------------|-------|

### Proposed Changes

<concrete package.json edits as a diff or list>
```

If no issues are found, confirm the package's dependencies are clean and aligned.

## Important constraints

- **Read-only** — do not modify files unless the user explicitly asks to apply fixes.
- **Skip upstream paths** — ignore anything under `**/upstream/**`.
- **Skip generated code** — ignore `node_modules/`, `dist/`, `build/`, `coverage/`.
- When proposing version additions, use the version from the root workspace to maintain alignment.
