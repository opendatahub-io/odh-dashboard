'use strict';

const fs = require('fs');
const path = require('path');

const { buildDependencyIndex, isDocumentationOnly, normalizePath } = require('./mock-test-impact');
const { listWorkspacePackagesFromManifest } = require('../../query-workspace-packages');

const DEFAULT_ROOT = path.resolve(__dirname, '../../..');
const DEFAULT_SUPPORT_FILE = 'packages/cypress/cypress/support/e2e.ts';
const DEFAULT_SPEC_ROOT = 'packages/cypress/cypress/tests/e2e';
const DEFAULT_CYPRESS_SOURCE_ROOT = 'packages/cypress/cypress';
const DEFAULT_TAG = '@ci-dashboard-regression-tags';
const DEFAULT_SKIP_TAGS = ['@Bug', '@Maintain', '@NonConcurrent'];
const MAX_EXTRA_TAGS = 5;
const MAX_AUTO_TAGS_PER_JOB = 8;
const MAX_SPEC_JOBS = 12;
const MAX_SPECS_PER_JOB = 10;

const normalizeTag = (tag) => (tag.startsWith('@') ? tag : `@${tag}`);

const parseTagList = (value = '') =>
  String(value)
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map(normalizeTag);

const unique = (values) => [...new Set(values)];

const isSpecFile = (file) =>
  normalizePath(file).endsWith('.cy.ts') && /(^|\/)cypress\/tests\/e2e\//.test(normalizePath(file));

const isCypressSupportFile = (file) => {
  const normalized = normalizePath(file);
  if (isDocumentationOnly(normalized)) {
    return false;
  }
  if (normalized === `${DEFAULT_SPEC_ROOT}/non-ci-specs.json`) {
    return false;
  }
  return (
    normalized.startsWith(`${DEFAULT_CYPRESS_SOURCE_ROOT}/`) ||
    /(^|\/)cypress\/(pages|fixtures|utils|support|commands|plugins)\//.test(normalized)
  );
};

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  return String(value).toLowerCase() === 'true';
};

const parseTagSelection = ({
  defaultTag = DEFAULT_TAG,
  additionalTags = '',
  prLabels = '',
  autoTags = '',
  skipDefault = false,
  skipAutoDetect = false,
}) => {
  const manualTags = parseTagList(additionalTags).slice(0, MAX_EXTRA_TAGS);
  const labelTags = parseTagList(prLabels)
    .filter((tag) => tag.startsWith('@test:'))
    .map((tag) => `@${tag.slice('@test:'.length)}`)
    .filter(Boolean)
    .slice(0, MAX_EXTRA_TAGS);
  const detectedAutoTags = skipAutoDetect ? [] : parseTagList(autoTags);
  const baseTags = skipDefault ? [] : [normalizeTag(defaultTag)];

  const selectedTags = unique([...baseTags, ...manualTags, ...labelTags, ...detectedAutoTags]);
  const sources = [];
  if (!skipDefault) {
    sources.push('default');
  }
  if (manualTags.length > 0) {
    sources.push('manual');
  }
  if (labelTags.length > 0) {
    sources.push('pr-labels');
  }
  if (detectedAutoTags.length > 0) {
    sources.push('auto-detected');
  }

  return {
    selectedTags,
    autoTags: unique(detectedAutoTags),
    source: sources.length > 0 ? sources.join('+') : 'none',
  };
};

const getGlobBaseDir = (pattern) => {
  const [prefix] = String(pattern).split('**');
  return prefix.replace(/\/+$/, '') || '.';
};

const walkFiles = (root, relativeDir, predicate) => {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) {
    return [];
  }

  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }
        visit(absolutePath);
      } else if (entry.isFile() && predicate(absolutePath)) {
        files.push(normalizePath(path.relative(root, absolutePath)));
      }
    }
  };
  visit(absoluteDir);
  return files.toSorted();
};

const discoverE2eSpecs = (root = DEFAULT_ROOT) => {
  const specs = new Set(walkFiles(root, DEFAULT_SPEC_ROOT, (file) => file.endsWith('.cy.ts')));

  for (const workspacePackage of listWorkspacePackagesFromManifest(root)) {
    const pattern = workspacePackage.cypress?.e2e;
    if (!pattern) {
      continue;
    }
    const workspacePath = workspacePackage.location ?? workspacePackage.path;
    if (!workspacePath || workspacePath === '.') {
      continue;
    }
    const packageBaseDir = path.join(workspacePath, getGlobBaseDir(pattern));
    for (const spec of walkFiles(root, packageBaseDir, (file) => file.endsWith('.cy.ts'))) {
      specs.add(spec);
    }
  }

  return [...specs].toSorted();
};

const discoverCiTags = (root = DEFAULT_ROOT) => {
  const tags = new Set([DEFAULT_TAG]);
  for (const workspacePackage of listWorkspacePackagesFromManifest(root)) {
    for (const tag of workspacePackage.e2eCiTags ?? []) {
      tags.add(normalizeTag(tag));
    }
  }
  return [...tags].toSorted();
};

const readNonCiSpecs = (root = DEFAULT_ROOT) => {
  const file = path.join(root, DEFAULT_SPEC_ROOT, 'non-ci-specs.json');
  if (!fs.existsSync(file)) {
    return {};
  }

  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error('non-ci-specs.json must contain an array');
  }

  return Object.fromEntries(
    parsed.map((entry) => {
      if (!entry.path || !entry.owner || !entry.reason) {
        throw new Error('Every non-CI spec entry requires path, owner, and reason');
      }
      return [normalizePath(entry.path), entry];
    }),
  );
};

const parseSpecSource = (source) => {
  // eslint-disable-next-line global-require
  const ts = require('typescript');
  const sourceFile = ts.createSourceFile('spec.cy.ts', source, ts.ScriptTarget.Latest, true);
  const tests = [];

  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const expressionText = node.expression.getText(sourceFile);
      if (/^(?:it|test)(?:\.only)?$/.test(expressionText)) {
        const tags = [];
        const options = node.arguments[1];
        if (options && ts.isObjectLiteralExpression(options)) {
          for (const property of options.properties) {
            if (
              ts.isPropertyAssignment(property) &&
              property.name.getText(sourceFile) === 'tags' &&
              ts.isArrayLiteralExpression(property.initializer)
            ) {
              for (const element of property.initializer.elements) {
                if (ts.isStringLiteralLike(element)) {
                  tags.push(normalizeTag(element.text));
                }
              }
            }
          }
        }
        tests.push({ tags: unique(tags) });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return tests;
};

const buildSpecInventory = ({
  specs,
  skipTags = DEFAULT_SKIP_TAGS,
  readFile = (file) => fs.readFileSync(file, 'utf8'),
  root = DEFAULT_ROOT,
}) => {
  const inventory = {};
  for (const spec of specs) {
    const tests = parseSpecSource(readFile(path.join(root, spec)));
    const executableTests = tests.filter(
      (test) => !test.tags.some((tag) => skipTags.includes(tag)),
    );
    inventory[spec] = {
      path: spec,
      testCount: tests.length,
      executableTestCount: executableTests.length,
      tags: unique(tests.flatMap((test) => test.tags)),
      executableTags: unique(executableTests.flatMap((test) => test.tags)),
    };
  }
  return inventory;
};

const resolveSelectedTags = (selectedTags, inventory) => {
  const resolved = {};
  const errors = [];
  for (const tag of selectedTags) {
    const specs = Object.values(inventory).filter((spec) => spec.executableTags.includes(tag));
    const testCount = specs.reduce((total, spec) => total + spec.executableTestCount, 0);
    if (specs.length === 0 || testCount === 0) {
      errors.push(`Selected tag ${tag} resolves to zero executable tests`);
      continue;
    }
    resolved[tag] = {
      specs: specs.map((spec) => spec.path),
      testCount,
    };
  }
  return { resolved, errors };
};

const groupTagsForJobs = (selectedTags, autoTags = []) => {
  const autoTagSet = new Set(autoTags);
  const nonAutoTags = selectedTags.filter((tag) => !autoTagSet.has(tag));
  const detectedAutoTags = selectedTags.filter((tag) => autoTagSet.has(tag));

  const groups = nonAutoTags.map((tag) => [tag]);
  if (detectedAutoTags.length > MAX_AUTO_TAGS_PER_JOB) {
    const midpoint = Math.ceil(detectedAutoTags.length / 2);
    groups.push(detectedAutoTags.slice(0, midpoint));
    groups.push(detectedAutoTags.slice(midpoint));
  } else if (detectedAutoTags.length > 0) {
    groups.push(detectedAutoTags);
  }
  return groups;
};

const sanitizeTagDir = (value) =>
  String(value)
    .replace(/^@/, '')
    .replace(/[^a-zA-Z0-9_.:-]/g, '-')
    .replace(/^-+|-+$/g, '') || 'tag';

const tagDirKey = 'tag_dir';
const runModeKey = 'run_mode';

const buildTagJobs = (selectedTags, autoTags = []) =>
  groupTagsForJobs(selectedTags, autoTags).map((tags) => ({
    tag: tags.join(' '),
    [tagDirKey]: sanitizeTagDir(tags.join('__')),
    specs: [],
    [runModeKey]: 'tag',
    timeout: Math.min(360, 30 + 7 * tags.length),
  }));

const createSpecJobs = (specs, prefix) => {
  if (specs.length === 0) {
    return [];
  }

  const jobCount = Math.max(
    1,
    Math.min(MAX_SPEC_JOBS, Math.ceil(specs.length / MAX_SPECS_PER_JOB)),
  );
  const jobs = [];
  for (let index = 0; index < jobCount; index += 1) {
    const chunk = Math.ceil(specs.length / jobCount);
    const start = index * chunk;
    const selectedSpecs = specs.slice(start, start + chunk);
    if (selectedSpecs.length === 0) {
      continue;
    }
    const suffix = String(jobs.length + 1).padStart(2, '0');
    jobs.push({
      tag: `@${prefix}-${suffix}`,
      [tagDirKey]: `${prefix.toLowerCase()}-${suffix}`,
      specs: selectedSpecs,
      [runModeKey]: 'spec',
      timeout: 360,
    });
  }
  return jobs;
};

const buildFixtureTokens = (fixturePath) => {
  const normalized = normalizePath(fixturePath);
  const withoutExtension = normalized.replace(/\.[^./]+$/, '');
  const fixtureRelative = withoutExtension.includes('/fixtures/')
    ? withoutExtension.split('/fixtures/')[1]
    : undefined;
  return unique([normalized, withoutExtension, fixtureRelative]).filter(Boolean);
};

const buildFixtureConsumers = ({ root, specs, dependencyIndex, fixturePath }) => {
  const tokens = buildFixtureTokens(fixturePath);
  const sourceFiles = walkFiles(root, DEFAULT_CYPRESS_SOURCE_ROOT, (file) =>
    /\.(ts|tsx|js)$/.test(file),
  );
  const specSet = new Set(specs);
  const consumers = new Set();

  for (const sourceFile of sourceFiles) {
    const contents = fs.readFileSync(path.join(root, sourceFile), 'utf8');
    if (!tokens.some((token) => contents.includes(token))) {
      continue;
    }
    if (specSet.has(sourceFile)) {
      consumers.add(sourceFile);
    }
    for (const consumer of dependencyIndex.consumers[sourceFile] ?? []) {
      consumers.add(consumer);
    }
  }
  return [...consumers].toSorted();
};

const buildSelectionPlan = ({
  changes,
  inventory,
  baseInventory = {},
  dependencyIndex,
  selectedTags,
  autoTags = [],
  ciTags = [DEFAULT_TAG],
  nonCiSpecs = {},
  root = DEFAULT_ROOT,
}) => {
  const errors = [];
  const changedSpecs = new Set();
  const deletedSpecs = new Set();
  const impactedSpecs = new Set();
  const details = [];

  for (const change of changes) {
    const changedPath = normalizePath(change.path);
    const previousPath = change.previousPath ? normalizePath(change.previousPath) : undefined;
    if (isSpecFile(changedPath) || (previousPath && isSpecFile(previousPath))) {
      if (change.status === 'D' || !isSpecFile(changedPath)) {
        deletedSpecs.add(changedPath);
      } else {
        changedSpecs.add(changedPath);
      }
      if (previousPath && isSpecFile(previousPath)) {
        deletedSpecs.add(previousPath);
      }
      continue;
    }

    if (!isCypressSupportFile(changedPath)) {
      continue;
    }

    if (change.status === 'D') {
      details.push(`${changedPath}: deleted support code requires the full E2E matrix`);
      for (const spec of Object.keys(inventory)) {
        impactedSpecs.add(spec);
      }
      continue;
    }

    if (/\.(ts|tsx|js)$/.test(changedPath)) {
      const consumers = dependencyIndex.consumers[changedPath] ?? [];
      if (consumers.length === 0) {
        errors.push(`No Cypress consumer was found for changed support code: ${changedPath}`);
        continue;
      }
      for (const consumer of consumers) {
        impactedSpecs.add(consumer);
      }
      details.push(`${changedPath}: ${consumers.length} importing spec(s)`);
      continue;
    }

    const consumers = buildFixtureConsumers({
      root,
      specs: Object.keys(inventory),
      dependencyIndex,
      fixturePath: changedPath,
    });
    if (consumers.length === 0) {
      errors.push(`No Cypress consumer was found for changed fixture: ${changedPath}`);
      continue;
    }
    for (const consumer of consumers) {
      impactedSpecs.add(consumer);
    }
    details.push(`${changedPath}: ${consumers.length} referencing spec(s)`);
  }

  for (const spec of changedSpecs) {
    const entry = inventory[spec];
    if (!entry) {
      errors.push(`Changed Cypress spec was not discovered: ${spec}`);
      continue;
    }
    if (entry.executableTestCount === 0) {
      errors.push(`Changed Cypress spec has no executable tests: ${spec}`);
    }
    const hasCiTag = entry.executableTags.some((tag) => ciTags.includes(tag));
    if (!hasCiTag && !nonCiSpecs[spec]) {
      errors.push(`New or modified Cypress spec has no CI-selectable tag or non-CI owner: ${spec}`);
    }
  }

  for (const spec of deletedSpecs) {
    const oldEntry = baseInventory[spec];
    if (!oldEntry) {
      errors.push(
        `Deleted or renamed Cypress spec could not be read from the base revision: ${spec}`,
      );
      continue;
    }

    const oldCiTags = oldEntry.executableTags.filter((tag) => ciTags.includes(tag));
    if (oldCiTags.length === 0) {
      if (!nonCiSpecs[spec]) {
        errors.push(`Deleted non-CI Cypress spec has no recorded owner: ${spec}`);
      }
      continue;
    }

    for (const tag of oldCiTags) {
      const survivingSpecs = Object.values(inventory).filter(
        (entry) => entry.path !== spec && entry.executableTags.includes(tag),
      );
      if (survivingSpecs.length === 0) {
        errors.push(`Deleting ${spec} removes the only coverage for ${tag}`);
      }
    }
  }

  const tagResolution = resolveSelectedTags(selectedTags, inventory);
  errors.push(...tagResolution.errors);

  const explicitChangedSpecs = [...changedSpecs].toSorted();
  const explicitImpactedSpecs = [...impactedSpecs]
    .filter((spec) => !changedSpecs.has(spec))
    .toSorted();

  const matrix = [
    ...buildTagJobs(selectedTags, autoTags),
    ...createSpecJobs(explicitChangedSpecs, 'ChangedSpec'),
    ...createSpecJobs(explicitImpactedSpecs, 'ImpactedSpec'),
  ];

  if (matrix.length === 0) {
    errors.push('No Cypress E2E jobs were selected');
  }

  const plannedTestCount = matrix.reduce((total, job) => {
    if (job.run_mode === 'spec') {
      return (
        total +
        job.specs.reduce(
          (jobTotal, spec) => jobTotal + (inventory[spec]?.executableTestCount ?? 0),
          0,
        )
      );
    }
    const tags = job.tag.split(' ');
    const jobSpecs = Object.values(inventory).filter((entry) =>
      tags.some((tag) => entry.executableTags.includes(tag)),
    );
    return total + jobSpecs.reduce((jobTotal, spec) => jobTotal + spec.executableTestCount, 0);
  }, 0);

  return {
    valid: errors.length === 0,
    errors,
    matrix,
    summary: {
      changedFiles: changes.map((change) => ({
        status: change.status,
        path: normalizePath(change.path),
        previousPath: change.previousPath ? normalizePath(change.previousPath) : undefined,
      })),
      changedSpecs: explicitChangedSpecs,
      deletedSpecs: [...deletedSpecs].toSorted(),
      impactedSpecs: explicitImpactedSpecs,
      selectedTags,
      resolvedTags: tagResolution.resolved,
      plannedTestCount,
      details,
    },
  };
};

const renderSelectionMarkdown = (summary) =>
  [
    '# Cypress E2E selection summary',
    '',
    '## Changed paths',
    ...(summary.changedFiles.length > 0
      ? summary.changedFiles.map((change) => `- ${change.status}: ${change.path}`)
      : ['- None']),
    '',
    '## Changed specs',
    ...(summary.changedSpecs.length > 0
      ? summary.changedSpecs.map((spec) => `- ${spec}`)
      : ['- None']),
    '',
    '## Impacted specs',
    ...(summary.impactedSpecs.length > 0
      ? summary.impactedSpecs.map((spec) => `- ${spec}`)
      : ['- None']),
    '',
    '## Selected tags',
    ...(summary.selectedTags.length > 0
      ? summary.selectedTags.map((tag) => `- ${tag}`)
      : ['- None']),
    '',
    '## Resolved tags',
    ...(Object.keys(summary.resolvedTags).length > 0
      ? Object.entries(summary.resolvedTags).map(
          ([tag, value]) =>
            `- ${tag}: ${value.specs.length} spec(s), ${value.testCount} executable test(s)`,
        )
      : ['- None']),
    '',
    `Planned executable test count: ${summary.plannedTestCount}`,
    '',
  ].join('\n');

module.exports = {
  DEFAULT_SKIP_TAGS,
  DEFAULT_TAG,
  buildDependencyIndexForE2e: ({ root, specs }) =>
    buildDependencyIndex({ root, specs, supportFile: DEFAULT_SUPPORT_FILE }),
  buildFixtureConsumers,
  buildSelectionPlan,
  buildSpecInventory,
  createSpecJobs,
  discoverCiTags,
  discoverE2eSpecs,
  groupTagsForJobs,
  isCypressSupportFile,
  isSpecFile,
  normalizePath,
  normalizeTag,
  parseBoolean,
  parseSpecSource,
  parseTagSelection,
  readNonCiSpecs,
  renderSelectionMarkdown,
  resolveSelectedTags,
  sanitizeTagDir,
};
