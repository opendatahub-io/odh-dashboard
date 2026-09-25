const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DELEGATION_PATTERN = /^cd ([^&]+) && pnpm run (lint(?::fix)?)$/;

function workspacePackages(packageList = readWorkspacePackages()) {
  return packageList.map(({ name, path: packagePath }) => {
    try {
      return {
        name,
        path: path.resolve(packagePath),
        manifest: JSON.parse(fs.readFileSync(path.join(packagePath, 'package.json'), 'utf8')),
      };
    } catch (error) {
      throw new Error(`Could not read workspace manifest for ${name}`, { cause: error });
    }
  });
}

function readWorkspacePackages() {
  try {
    return JSON.parse(
      execFileSync('pnpm', ['m', 'ls', '--json', '--depth=-1'], { cwd: ROOT, encoding: 'utf8' }),
    );
  } catch (error) {
    throw new Error('Could not read pnpm workspace packages', { cause: error });
  }
}

function lintPlan(packageList) {
  const packages = workspacePackages(packageList);
  const byPath = new Map(
    packages.map((workspacePackage) => [workspacePackage.path, workspacePackage]),
  );
  const delegations = [];

  for (const workspacePackage of packages) {
    const scripts = workspacePackage.manifest.scripts || {};
    const lintScript = scripts.lint;
    const lintFixScript = scripts['lint:fix'];
    const lintMatch = typeof lintScript === 'string' && lintScript.match(DELEGATION_PATTERN);
    const lintFixMatch =
      typeof lintFixScript === 'string' && lintFixScript.match(DELEGATION_PATTERN);
    const declaredDelegation = workspacePackage.manifest['lint:delegates'];

    if (
      declaredDelegation &&
      (!Array.isArray(declaredDelegation) || declaredDelegation.length !== 1)
    ) {
      throw new Error(`${workspacePackage.name} must declare exactly one lint delegation`);
    }
    if (declaredDelegation && !lintMatch) {
      throw new Error(
        `${workspacePackage.name} declares lint delegation but does not delegate its lint script`,
      );
    }

    if (lintMatch || lintFixMatch) {
      if (!lintMatch || !lintFixMatch || lintMatch[1] !== lintFixMatch[1]) {
        throw new Error(
          `${workspacePackage.name} must delegate lint and lint:fix to the same workspace path`,
        );
      }

      if (!declaredDelegation || declaredDelegation[0] !== lintMatch[1]) {
        throw new Error(
          `${workspacePackage.name} must declare its lint delegation as [${JSON.stringify(
            lintMatch[1],
          )}]`,
        );
      }

      const targetPath = path.resolve(workspacePackage.path, lintMatch[1]);
      const target = byPath.get(targetPath);
      if (!target) {
        throw new Error(
          `${workspacePackage.name} delegates lint to non-workspace path ${lintMatch[1]}`,
        );
      }
      if (target.manifest['lint:owner'] !== true) {
        throw new Error(
          `${workspacePackage.name} delegates lint to ${target.name}, which is not declared as a lint owner`,
        );
      }

      delegations.push({ parent: workspacePackage, target });
    }
  }

  const owners = new Map();
  for (const delegation of delegations) {
    const existing = owners.get(delegation.target.path);
    if (existing) {
      throw new Error(
        `${delegation.target.name} has multiple lint owners: ${existing.name} and ${delegation.parent.name}`,
      );
    }
    owners.set(delegation.target.path, delegation.parent);
  }

  return {
    delegatedParents: delegations.map(({ parent }) => parent.name).toSorted(),
    delegatedTargets: delegations.map(({ target }) => target.name).toSorted(),
  };
}

function main() {
  const [command, ...rawTurboArgs] = process.argv.slice(2);
  const turboArgs = rawTurboArgs[0] === '--' ? rawTurboArgs.slice(1) : rawTurboArgs;
  if (!['check', 'lint', 'lint:fix'].includes(command)) {
    throw new Error('Usage: lint-orchestration.js <check|lint|lint:fix> [turbo arguments]');
  }

  const plan = lintPlan();
  if (command === 'check') {
    console.log(
      `Lint ownership check passed for ${plan.delegatedTargets.length} delegated source trees`,
    );
    return;
  }

  const filters = plan.delegatedParents.map((name) => `--filter=!${name}`);
  execFileSync('turbo', ['run', command, ...turboArgs, ...filters], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { lintPlan, workspacePackages };
