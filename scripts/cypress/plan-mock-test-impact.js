const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const {
  buildDependencyIndex,
  normalizePath,
  planMockTestImpact,
} = require('./lib/mock-test-impact');
const { generateTestGroups } = require('../generate-cypress-test-matrix');

const parseArgs = (args) => {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || !value) {
      throw new Error(`Expected --name value arguments, received: ${args.join(' ')}`);
    }
    options[key.slice(2)] = value;
  }
  return options;
};

const git = (root, args) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

const readChanges = (root, base, head) => {
  const output = git(root, ['diff', '--name-status', '-z', '--find-renames', `${base}...${head}`]);
  const fields = output.split('\0').filter(Boolean);
  const changes = [];
  for (let index = 0; index < fields.length; ) {
    const status = fields[index++];
    if (status.startsWith('R') || status.startsWith('C')) {
      const previousPath = normalizePath(fields[index++]);
      const nextPath = normalizePath(fields[index++]);
      changes.push({ status: status[0], path: previousPath });
      changes.push({ status: status[0], path: nextPath });
    } else {
      changes.push({ status: status[0], path: normalizePath(fields[index++]) });
    }
  }
  return changes;
};

const toMarkdown = (plan, metadata) => {
  const lines = [
    '## Cypress mock test impact',
    '',
    `**Scope:** ${plan.scope} · **Selected:** ${plan.selectedGroups.length}/${metadata.totalGroups} groups`,
    '',
    plan.reason,
    '',
    `Safety: ${plan.safety}`,
    '',
    `<details><summary>Changed files (${plan.changedFiles.length})</summary>`,
    '',
    ...plan.changedFiles.map((file) => `- \`${file}\``),
    '',
    '</details>',
  ];
  if (plan.details.length > 0) {
    lines.push(
      '',
      '<details><summary>Selection evidence</summary>',
      '',
      ...plan.details.map((detail) => `- ${detail}`),
      '',
      '</details>',
    );
  }
  if (plan.selectedGroups.length > 0 && plan.selectedGroups.length < metadata.totalGroups) {
    lines.push(
      '',
      '<details><summary>Proposed groups</summary>',
      '',
      ...plan.selectedGroups.map((group) => `- \`${group}\``),
      '',
      '</details>',
    );
  }
  lines.push('', `Compared \`${metadata.base}\` with \`${metadata.head}\`.`);
  return `${lines.join('\n')}\n`;
};

const writeFile = (file, contents) => {
  if (!file) {
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
};

const createTestMatrix = (groups, selectedGroups) => {
  const selectedNames = new Set(selectedGroups);
  return groups
    .filter((group) => selectedNames.has(group.name))
    .map(({ name, spec }) => ({ name, spec }));
};

const main = () => {
  const root = path.resolve(__dirname, '../..');
  const options = parseArgs(process.argv.slice(2));
  const head = options.head || 'HEAD';
  const base = options.base || `${head}^`;
  const groups = generateTestGroups();
  const specs = [...new Set(groups.flatMap((group) => group.files))];
  const metadata = {
    base,
    head,
    totalGroups: groups.length,
    totalSpecs: specs.length,
  };

  let plan;
  try {
    const changes = readChanges(root, base, head);
    const dependencyIndex = buildDependencyIndex({ root, specs });
    plan = planMockTestImpact({ groups, changes, dependencyIndex });
    metadata.graphFiles = Object.keys(dependencyIndex.consumers).length;
    metadata.unresolvedCode = dependencyIndex.unresolvedCode.length;
    metadata.dynamicImports = dependencyIndex.dynamicImports.length;
  } catch (error) {
    plan = {
      mode: 'select',
      scope: 'full',
      changedFiles: [],
      selectedGroups: groups.map((group) => group.name).toSorted(),
      excludedGroups: [],
      reason: `Planner error; running the complete Cypress mock matrix: ${
        error instanceof Error ? error.message : String(error)
      }`,
      details: [],
      safety: 'CI runs the complete Cypress mock matrix.',
    };
    metadata.error = error instanceof Error ? error.stack : String(error);
  }

  const report = { metadata, plan };
  const markdown = toMarkdown(plan, metadata);
  const matrix = createTestMatrix(groups, plan.selectedGroups);
  writeFile(options.json, `${JSON.stringify(report, null, 2)}\n`);
  writeFile(options.markdown, markdown);
  writeFile(options.matrix, `${JSON.stringify(matrix, null, 2)}\n`);
  process.stdout.write(markdown);
};

if (require.main === module) {
  main();
}

module.exports = { createTestMatrix, parseArgs, readChanges, toMarkdown };
