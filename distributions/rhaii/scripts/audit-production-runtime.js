const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { rspack } = require('@rspack/core');
const { STATS_OPTIONS, auditRuntime, renderReport } = require('./runtime-audit');

const distributionRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(distributionRoot, '../..');
const outputDir = path.join(distributionRoot, 'dist/runtime-audit');

const main = async () => {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check'))
    throw new Error('Usage: audit-production-runtime.js [--check]');
  fs.mkdirSync(outputDir, { recursive: true });
  for (const filename of ['stats.json', 'report.json', 'report.md']) {
    fs.rmSync(path.join(outputDir, filename), { force: true });
  }
  if (process.env.RHAII_TILT_FIXTURES === 'true') {
    throw new Error('Disable RHAII_TILT_FIXTURES for the production runtime audit');
  }
  if (process.env.MODEL_SERVING_REMOTE_ENTRY) {
    throw new Error(
      'Unset MODEL_SERVING_REMOTE_ENTRY: remote code cannot be verified by a local build audit',
    );
  }
  const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();
  const workingTreeDirty = Boolean(
    execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim(),
  );
  const config = require('../config/rspack.prod');
  const compiler = rspack({
    ...config,
    context: distributionRoot,
    output: { ...config.output, path: path.join(outputDir, 'assets'), clean: true },
  });
  let data;
  try {
    const stats = await new Promise((resolve, reject) => {
      compiler.run((error, result) => (error ? reject(error) : resolve(result)));
    });
    if (!stats) throw new Error('Production compilation returned no statistics');
    data = stats.toJson(STATS_OPTIONS);
    fs.writeFileSync(path.join(outputDir, 'stats.json'), JSON.stringify(data));
    if (stats.hasErrors()) {
      throw new Error(stats.toString({ all: false, errors: true }));
    }
  } finally {
    await new Promise((resolve, reject) => {
      compiler.close((error) => (error ? reject(error) : resolve()));
    });
  }
  const report = auditRuntime(data, {
    repoRoot,
    context: distributionRoot,
    metadata: {
      sourceRevision,
      workingTreeDirty,
      buildCommand: args.includes('--check')
        ? 'pnpm run check:runtime-boundary'
        : 'pnpm run audit:runtime',
      buildConfig: 'distributions/rhaii/config/rspack.prod.js',
      tiltFixtures: false,
      modelServingRemote: false,
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
