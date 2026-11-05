const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const {
  buildDependencyIndex,
  normalizePath,
  planMockTestImpact,
} = require('./lib/mock-test-impact');
const { createTestShards, generateTestGroups } = require('../generate-cypress-test-matrix');

const parseArgs = (args) => {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith('--') || value === undefined || (!value && key !== '--base')) {
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

const writeFile = (file, contents) => {
  if (!file) {
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
};

const createTestMatrix = (groups, selectedGroups) => {
  const selectedNames = new Set(selectedGroups);
  return createTestShards(groups.filter((group) => selectedNames.has(group.name))).map(
    ({ name, specs }) => ({ name, specs }),
  );
};

const sanitizeLogText = (value) =>
  [...String(value).replace(/[\r\n\u2028\u2029]+/g, ' ')]
    .map((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint < 0x20 || codePoint === 0x7f ? '?' : character;
    })
    .join('')
    .replace(/::/g, ': :');

// Workspace runners own their application's files. Shared dependencies outside those
// roots still pass through the dashboard's existing conservative selector.
const dashboardChanges = (changes, workspaces) =>
  changes.filter(
    ({ path: file }) =>
      !workspaces.some((workspace) => file === workspace || file.startsWith(`${workspace}/`)),
  );

const selectMockTests = (root, options = {}) => {
  const head = options.head || 'HEAD';
  const base = options.base || `${head}^`;
  const groups = generateTestGroups(root);
  const specs = [...new Set(groups.flatMap((group) => group.files))];

  let plan;
  try {
    const allChanges = readChanges(root, base, head);
    const changes = dashboardChanges(allChanges, options.workspaceApplications || []);
    if (allChanges.length > 0 && changes.length === 0) {
      return { matrix: [], scope: 'none', reason: 'Only standalone application files changed.' };
    }
    const dependencyIndex = buildDependencyIndex({ root, specs });
    plan = planMockTestImpact({ groups, changes, dependencyIndex });
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
  }

  const matrix = createTestMatrix(groups, plan.selectedGroups);
  return {
    matrix,
    scope: plan.scope,
    reason: plan.reason,
    groupCount: groups.length,
    selectedCount: plan.selectedGroups.length,
  };
};

const main = () => {
  const root = path.resolve(__dirname, '../..');
  const options = parseArgs(process.argv.slice(2));
  const selection = selectMockTests(root, options);
  const { matrix, scope, reason, groupCount, selectedCount } = selection;
  writeFile(options.matrix, `${JSON.stringify(matrix, null, 2)}\n`);
  writeFile(options.scope, `${scope}\n`);
  process.stdout.write(
    `Cypress mock selection: ${selectedCount}/${groupCount} groups in ${
      matrix.length
    } shards (${scope}). ${sanitizeLogText(reason)}\n`,
  );
};

if (require.main === module) {
  main();
}

module.exports = {
  createTestMatrix,
  parseArgs,
  readChanges,
  sanitizeLogText,
  selectMockTests,
  dashboardChanges,
};
