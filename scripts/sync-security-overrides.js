/**
 * Propagates npm overrides from the root package.json to all first-party
 * independent-install package.json files. Keeps transitive CVE remediation
 * consistent across the monorepo.
 *
 * Usage:
 *   node scripts/sync-security-overrides.js           # sync and report
 *   node scripts/sync-security-overrides.js --check   # dry-run, exit 1 if drifted
 *   node scripts/sync-security-overrides.js --install  # sync + regenerate lockfiles
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function discoverTargets() {
  const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const workspaces = rootPkg.workspaces || [];

  const targets = [];

  function addIfInstallModule(pkgDir) {
    const pkgPath = path.join(pkgDir, 'package.json');
    if (!fs.existsSync(pkgPath)) return;

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const installScript = (pkg.scripts || {})['install:module'];
    if (!installScript) return;

    const prefixMatch = installScript.match(/--prefix\s+(\S+)/);
    if (!prefixMatch) return;

    const targetDir = path.join(pkgDir, prefixMatch[1]);
    if (targetDir.includes('/upstream/')) return;

    const targetPkg = path.join(targetDir, 'package.json');
    if (fs.existsSync(targetPkg)) {
      targets.push(targetPkg);
    }
  }

  for (const ws of workspaces) {
    if (ws.endsWith('/*')) {
      const wsDir = path.join(ROOT, ws.replace(/\/\*$/, ''));
      if (!fs.existsSync(wsDir)) continue;

      for (const entry of fs.readdirSync(wsDir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          addIfInstallModule(path.join(wsDir, entry.name));
        }
      }
    } else {
      addIfInstallModule(path.join(ROOT, ws));
    }
  }

  return [...new Set(targets)].toSorted();
}

function extractUniversalOverrides(rootOverrides) {
  const universal = {};
  for (const [key, value] of Object.entries(rootOverrides)) {
    if (typeof value === 'string') {
      universal[key] = value;
    }
  }
  return universal;
}

function syncOverrides(targetPath, universalOverrides, dryRun) {
  const raw = fs.readFileSync(targetPath, 'utf8');
  const pkg = JSON.parse(raw);
  const existing = pkg.overrides || {};
  const directDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const changes = [];

  const merged = { ...existing };

  for (const [dep, version] of Object.entries(universalOverrides)) {
    const current = existing[dep];
    if (typeof current === 'object' && current !== null) {
      continue;
    }
    if (dep in directDeps) {
      continue;
    }
    if (current !== version) {
      changes.push({
        dep,
        from: current || null,
        to: version,
      });
      merged[dep] = version;
    }
  }

  if (changes.length === 0) return { changes: [] };

  if (!dryRun) {
    pkg.overrides = sortObject(merged);
    const indent = detectIndent(raw);
    const newContent = `${JSON.stringify(pkg, null, indent)}\n`;
    fs.writeFileSync(targetPath, newContent, 'utf8');
  }

  return { changes };
}

function sortObject(obj) {
  const sorted = {};
  for (const key of Object.keys(obj).toSorted()) {
    sorted[key] = obj[key];
  }
  return sorted;
}

function detectIndent(content) {
  const match = content.match(/^(\s+)"/m);
  return match ? match[1].length : 2;
}

function relativePath(absPath) {
  return path.relative(ROOT, absPath);
}

function main() {
  const args = process.argv.slice(2);
  const checkMode = args.includes('--check');
  const installMode = args.includes('--install');
  const dryRun = checkMode;

  const rootPkgPath = path.join(ROOT, 'package.json');
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  const rootOverrides = rootPkg.overrides || {};

  if (Object.keys(rootOverrides).length === 0) {
    console.log(`${colors.yellow}No overrides found in root package.json${colors.reset}`);
    return;
  }

  const universalOverrides = extractUniversalOverrides(rootOverrides);
  console.log(
    `${colors.cyan}Source of truth:${colors.reset} ` +
      `${Object.keys(universalOverrides).length} universal overrides from root package.json`,
  );
  console.log();

  const targets = discoverTargets();
  console.log(`${colors.cyan}Target files:${colors.reset} ${targets.length} discovered`);
  for (const t of targets) {
    console.log(`  ${colors.dim}${relativePath(t)}${colors.reset}`);
  }
  console.log();

  let totalChanges = 0;
  const changedFiles = [];

  for (const target of targets) {
    const { changes } = syncOverrides(target, universalOverrides, dryRun);
    if (changes.length > 0) {
      totalChanges += changes.length;
      changedFiles.push(relativePath(target));
      const verb = dryRun ? 'would update' : 'updated';
      console.log(`${colors.yellow}${verb}${colors.reset} ${relativePath(target)}`);
      for (const c of changes) {
        const from = c.from ? `${c.from} → ` : `${colors.dim}(missing)${colors.reset} → `;
        console.log(`  ${c.dep}: ${from}${colors.green}${c.to}${colors.reset}`);
      }
      console.log();
    }
  }

  if (totalChanges === 0) {
    console.log(`${colors.green}All overrides are in sync.${colors.reset}`);
    return;
  }

  console.log(
    `${colors.cyan}Summary:${colors.reset} ` +
      `${totalChanges} change(s) across ${changedFiles.length} file(s)`,
  );

  if (checkMode) {
    console.log();
    console.log(
      `${colors.red}Override drift detected.${colors.reset} Run ${colors.cyan}npm run sync:overrides${colors.reset} to fix.`,
    );
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }

  if (installMode) {
    console.log();
    console.log(`${colors.cyan}Regenerating lockfiles...${colors.reset}`);
    for (const target of targets) {
      const dir = path.dirname(target);
      if (changedFiles.includes(relativePath(target))) {
        console.log(`  npm install in ${relativePath(dir)}`);
        try {
          execSync('npm install --package-lock-only', {
            cwd: dir,
            stdio: 'pipe',
          });
        } catch (err) {
          console.error(`  ${colors.red}Failed:${colors.reset} ${err.message}`);
        }
      }
    }
  }

  console.log();
  console.log(`${colors.green}Done.${colors.reset}`);
}

main();
