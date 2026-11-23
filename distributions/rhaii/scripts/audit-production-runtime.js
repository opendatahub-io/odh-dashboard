const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { auditProductionBuilds, renderReport } = require('./runtime-audit');
const { productionTargets, MODEL_SERVING_REMOTE_ENTRY } = require('./production-build');

const distributionRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(distributionRoot, '../..');
const outputDir = path.join(distributionRoot, 'dist/runtime-audit');

const main = async (args = process.argv.slice(2)) => {
  if (args.some((arg) => arg !== '--check'))
    throw new Error('Usage: audit-production-runtime.js [--check]');
  fs.mkdirSync(outputDir, { recursive: true });
  for (const filename of ['stats.json', 'report.json', 'report.md']) {
    fs.rmSync(path.join(outputDir, filename), { force: true });
  }
  if (process.env.RHAII_TILT_FIXTURES === 'true') {
    throw new Error('Disable RHAII_TILT_FIXTURES for the production runtime audit');
  }
  if (
    process.env.MODEL_SERVING_REMOTE_ENTRY &&
    process.env.MODEL_SERVING_REMOTE_ENTRY !== MODEL_SERVING_REMOTE_ENTRY
  ) {
    throw new Error(
      `Only the image's locally built remote can be audited: ${MODEL_SERVING_REMOTE_ENTRY}`,
    );
  }
  const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
  const workingTreeDirty = Boolean(
    execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim(),
  );
  // Clear both inputs before building, so a failed host build cannot leave old
  // remote statistics alongside the current attempt.
  for (const name of Object.keys(productionTargets)) {
    fs.rmSync(path.join(outputDir, name, 'stats.json'), { force: true });
  }
  const builds = Object.entries(productionTargets).map(([name, target]) => {
    execFileSync(process.execPath, [path.join(__dirname, 'production-build.js'), name], {
      cwd: path.join(repoRoot, target.workspace),
      stdio: 'inherit',
    });
    return JSON.parse(fs.readFileSync(path.join(outputDir, name, 'stats.json'), 'utf8'));
  });
  if (!fs.existsSync(path.join(outputDir, 'model-serving/assets/remoteEntry.js'))) {
    throw new Error('Model Serving build did not emit remoteEntry.js');
  }
  const report = auditProductionBuilds(builds[0], builds[1], {
    repoRoot,
    context: distributionRoot,
    metadata: {
      sourceRevision,
      workingTreeDirty,
      buildCommand: args.includes('--check')
        ? 'pnpm run check:runtime-boundary'
        : 'pnpm run audit:runtime',
      tiltFixtures: false,
      modelServingRemote: MODEL_SERVING_REMOTE_ENTRY,
    },
  });
  fs.writeFileSync(path.join(outputDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'report.md'), renderReport(report));
  console.log(
    `Runtime boundary ${report.boundaryPassed ? 'PASS' : 'FAIL'}: ${
      report.summary.violations
    } violations. Report: ${path.join(outputDir, 'report.md')}`,
  );
  if (args.includes('--check') && !report.boundaryPassed) process.exitCode = 1;
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { main };
