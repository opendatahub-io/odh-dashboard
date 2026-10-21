'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const {
  buildDependencyIndexForE2e,
  buildSelectionPlan,
  buildSpecInventory,
  discoverCiTags,
  discoverE2eSpecs,
  parseBoolean,
  parseSpecSource,
  parseTagSelection,
  readNonCiSpecs,
  renderSelectionMarkdown,
} = require('./lib/e2e-selection');

const parseArgs = (args) => {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Expected --name value arguments, received: ${args.join(' ')}`);
    }
    options[key.slice(2)] = value;
  }
  return options;
};

const git = (root, args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

const readChanges = (root, base, head) => {
  const output = git(root, [
    'diff',
    '--name-status',
    '-z',
    '--find-renames',
    '--diff-filter=ADMR',
    `${base}...${head}`,
  ]);
  const fields = output.split('\0').filter(Boolean);
  const changes = [];
  for (let index = 0; index < fields.length; ) {
    const status = fields[index++];
    if (status.startsWith('R')) {
      const previousPath = fields[index++];
      const nextPath = fields[index++];
      changes.push({ status: 'R', path: nextPath, previousPath });
    } else {
      changes.push({ status: status[0], path: fields[index++] });
    }
  }
  return changes;
};

const readBaseSpecInventory = ({ root, base, specs, skipTags }) => {
  const inventory = {};
  for (const spec of specs) {
    let source;
    try {
      source = git(root, ['show', `${base}:${spec}`]);
    } catch {
      continue;
    }
    const tests = parseSpecSource(source);
    const executableTests = tests.filter(
      (test) => Array.isArray(test.tags) && !test.tags.some((tag) => skipTags.includes(tag)),
    );
    inventory[spec] = {
      path: spec,
      testCount: tests.length,
      executableTestCount: executableTests.length,
      tags: [...new Set(tests.flatMap((test) => test.tags))],
      executableTags: [...new Set(executableTests.flatMap((test) => test.tags))],
    };
  }
  return inventory;
};

const writeFile = (file, contents) => {
  if (!file) {
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
};

const main = () => {
  const options = parseArgs(process.argv.slice(2));
  const root = path.resolve(options.root || path.join(__dirname, '../..'));
  const base = options.base || 'origin/main';
  const head = options.head || 'HEAD';
  const skipTags = (options['skip-tags'] || '@Bug @Maintain @NonConcurrent').split(/\s+/);

  const specs = discoverE2eSpecs(root);
  const currentInventory = buildSpecInventory({ specs, skipTags, root });
  const changes = readChanges(root, base, head);
  const deletedSpecs = changes
    .filter((change) => change.status === 'D' || change.previousPath)
    .flatMap((change) => [change.path, change.previousPath].filter(Boolean));
  const baseInventory = readBaseSpecInventory({ root, base, specs: deletedSpecs, skipTags });
  const dependencyIndex = buildDependencyIndexForE2e({ root, specs });
  const tagSelection = parseTagSelection({
    defaultTag: options['default-tag'],
    additionalTags: options['additional-tags'],
    prLabels: options['pr-labels'],
    autoTags: options['auto-tags'],
    skipDefault: parseBoolean(options['skip-default']),
    skipAutoDetect: parseBoolean(options['skip-auto-detect']),
  });

  const plan = buildSelectionPlan({
    changes,
    inventory: currentInventory,
    baseInventory,
    dependencyIndex,
    selectedTags: tagSelection.selectedTags,
    autoTags: tagSelection.autoTags,
    ciTags: discoverCiTags(root),
    nonCiSpecs: readNonCiSpecs(root),
    root,
  });

  if (!plan.valid) {
    console.error('Cypress E2E selection failed:');
    for (const error of plan.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  writeFile(options['matrix-output'], `${JSON.stringify(plan.matrix)}\n`);
  writeFile(options['source-output'], `${tagSelection.source}\n`);
  writeFile(options['summary-json'], `${JSON.stringify(plan.summary, null, 2)}\n`);
  writeFile(options['summary-md'], `${renderSelectionMarkdown(plan.summary)}\n`);
  console.log(
    `Cypress E2E selection: ${plan.matrix.length} job(s), ${
      plan.summary.plannedTestCount
    } explicit executable test(s), tags ${tagSelection.selectedTags.join(', ') || 'none'}.`,
  );
};

if (require.main === module) {
  main();
}

module.exports = { parseArgs, readBaseSpecInventory, readChanges, writeFile };
