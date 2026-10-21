'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const { buildDependencyIndex, isDocumentationOnly, normalizePath } = require('./mock-test-impact');
const { listWorkspacePackagesFromManifest } = require('../../query-workspace-packages');

const DEFAULT_ROOT = path.resolve(__dirname, '../../..');
const DEFAULT_SUPPORT_FILE = 'packages/cypress/cypress/support/e2e.ts';
const DEFAULT_SPEC_ROOT = 'packages/cypress/cypress/tests/e2e';
const DEFAULT_CYPRESS_SOURCE_ROOT = 'packages/cypress/cypress';
const DEFAULT_TAG = '@ci-dashboard-regression-tags';
const DEFAULT_SKIP_TAGS = ['@Bug', '@Maintain', '@NonConcurrent'];
const PATH_IMPACT_MAP_FILE = 'scripts/cypress/e2e-path-impact.json';
const FRONTEND_CI_TAGS_FILE = '.github/frontend-ci-tags.json';
const COVERAGE_INVENTORY_FILE = 'scripts/cypress/e2e-coverage-inventory.json';
const ENVIRONMENT_CAPABILITIES_FILE = 'scripts/cypress/e2e-environment-capabilities.json';
const PATH_IMPACT_SCHEMA_VERSION = 1;
const PATH_SELECTION_MODES = new Set(['changed-spec', 'reverse-impact', 'tag', 'none']);
const PATH_TAG_DERIVATIONS = new Set([
  'workspace-package',
  'workspace-package-from-manifest-path',
  'frontend-area',
]);
const MAX_EXTRA_TAGS = 5;
const MAX_AUTO_TAGS_PER_JOB = 8;
const MAX_SPEC_JOBS = 12;
const MAX_SPECS_PER_JOB = 10;
const MAX_EXPLICIT_IMPACTED_SPECS = 5;
const FULL_COVERAGE_TAGS = [
  '@SmokeSet1',
  '@SmokeSet2',
  '@SmokeSet3',
  '@SmokeSet4',
  '@SmokeSet5',
  '@SanitySet1',
  '@SanitySet2',
  '@SanitySet3',
  '@SanitySet4',
  '@SanitySet5',
];

const normalizeTag = (tag) => (tag.startsWith('@') ? tag : `@${tag}`);

const parseTagList = (value = '') =>
  String(value)
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map(normalizeTag);

const unique = (values) => [...new Set(values)];

const readJsonFile = (root, relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

const assertStringArray = (value, field) => {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string' || !entry)) {
    throw new Error(`${field} must be an array of non-empty strings`);
  }
};

const validatePathImpactMap = (pathImpactMap) => {
  if (pathImpactMap.schemaVersion !== PATH_IMPACT_SCHEMA_VERSION) {
    throw new Error('e2e-path-impact.json must use schemaVersion 1');
  }
  if (!Array.isArray(pathImpactMap.mappings) || pathImpactMap.mappings.length === 0) {
    throw new Error('e2e-path-impact.json must contain at least one mapping');
  }

  const mappingIds = new Set();
  for (const mapping of pathImpactMap.mappings) {
    if (!mapping.id || typeof mapping.id !== 'string' || mappingIds.has(mapping.id)) {
      throw new Error('Every E2E path-impact mapping requires a unique non-empty id');
    }
    mappingIds.add(mapping.id);
    if (!mapping.description || typeof mapping.description !== 'string') {
      throw new Error(`E2E path-impact mapping ${mapping.id} requires a description`);
    }
    assertStringArray(mapping.pathPatterns, `E2E path mapping ${mapping.id} pathPatterns`);
    if (!PATH_SELECTION_MODES.has(mapping.selectionMode)) {
      throw new Error(`E2E path mapping ${mapping.id} has an invalid selectionMode`);
    }
    if (mapping.selectionMode === 'tag' && !mapping.cypressTags && !mapping.deriveCypressTags) {
      throw new Error(`E2E tag mapping ${mapping.id} requires cypressTags or deriveCypressTags`);
    }
    if (mapping.cypressTags) {
      assertStringArray(mapping.cypressTags, `E2E path mapping ${mapping.id} cypressTags`);
    }
    if (mapping.deriveCypressTags && !PATH_TAG_DERIVATIONS.has(mapping.deriveCypressTags)) {
      throw new Error(`E2E path mapping ${mapping.id} has an invalid deriveCypressTags strategy`);
    }
    if (mapping.deriveCypressTags && !mapping.fallbackCypressTags) {
      throw new Error(`E2E derived tag mapping ${mapping.id} requires fallbackCypressTags`);
    }
    if (mapping.fallbackCypressTags) {
      assertStringArray(
        mapping.fallbackCypressTags,
        `E2E path mapping ${mapping.id} fallbackCypressTags`,
      );
    }
    assertStringArray(mapping.environments ?? [], `E2E path mapping ${mapping.id} environments`);
    assertStringArray(
      mapping.supportingChecks ?? [],
      `E2E path mapping ${mapping.id} supportingChecks`,
    );
    assertStringArray(
      mapping.coverageInventoryIds ?? [],
      `E2E path mapping ${mapping.id} coverageInventoryIds`,
    );
  }

  return pathImpactMap;
};

const readPathImpactMap = (root = DEFAULT_ROOT) =>
  validatePathImpactMap(readJsonFile(root, PATH_IMPACT_MAP_FILE));

const validateCoverageInventory = (coverageInventory, pathImpactMap) => {
  if (coverageInventory.schemaVersion !== PATH_IMPACT_SCHEMA_VERSION) {
    throw new Error('e2e-coverage-inventory.json must use schemaVersion 1');
  }
  if (!Array.isArray(coverageInventory.behaviors)) {
    throw new Error('e2e-coverage-inventory.json must contain a behaviors array');
  }

  const mappingIds = new Set(pathImpactMap.mappings.map((mapping) => mapping.id));
  const behaviorIds = new Set();
  for (const behavior of coverageInventory.behaviors) {
    if (!behavior.id || typeof behavior.id !== 'string' || behaviorIds.has(behavior.id)) {
      throw new Error('Every E2E coverage behavior requires a unique non-empty id');
    }
    behaviorIds.add(behavior.id);
    if (!mappingIds.has(behavior.mappingId)) {
      throw new Error(`E2E coverage behavior ${behavior.id} references an unknown mapping`);
    }
    assertStringArray(
      behavior.cypressTags ?? [],
      `E2E coverage behavior ${behavior.id} cypressTags`,
    );
    const assertion = behavior.terminalStateAssertion;
    if (
      !assertion ||
      typeof assertion.asserted !== 'boolean' ||
      !assertion.description ||
      typeof assertion.description !== 'string'
    ) {
      throw new Error(`E2E coverage behavior ${behavior.id} requires a terminal-state assertion`);
    }
  }

  return coverageInventory;
};

const readCoverageInventory = (root = DEFAULT_ROOT, pathImpactMap = readPathImpactMap(root)) =>
  validateCoverageInventory(readJsonFile(root, COVERAGE_INVENTORY_FILE), pathImpactMap);

const validateEnvironmentCapabilities = (environmentCapabilities) => {
  if (environmentCapabilities.schemaVersion !== PATH_IMPACT_SCHEMA_VERSION) {
    throw new Error('e2e-environment-capabilities.json must use schemaVersion 1');
  }
  if (
    !environmentCapabilities.defaultCapabilities ||
    typeof environmentCapabilities.defaultCapabilities !== 'object'
  ) {
    throw new Error('E2E environment capabilities require defaultCapabilities');
  }
  assertStringArray(environmentCapabilities.tags, 'E2E environment capability tags');
  if (new Set(environmentCapabilities.tags).size !== environmentCapabilities.tags.length) {
    throw new Error('E2E environment capability tags must be unique');
  }
  if (
    environmentCapabilities.tagOverrides &&
    typeof environmentCapabilities.tagOverrides !== 'object'
  ) {
    for (const [tag, capabilities] of Object.entries(environmentCapabilities.tagOverrides)) {
      if (!environmentCapabilities.tags.includes(tag) || typeof capabilities !== 'object') {
        throw new Error(`E2E environment override for ${tag} is invalid`);
      }
    }
  }

  return environmentCapabilities;
};

const readEnvironmentCapabilities = (root = DEFAULT_ROOT) =>
  validateEnvironmentCapabilities(readJsonFile(root, ENVIRONMENT_CAPABILITIES_FILE));

const globSegmentToRegExp = (segment) =>
  new RegExp(
    `^${segment
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')}$`,
  );

const matchPathSegments = (patternParts, pathParts) => {
  if (patternParts.length === 0) {
    return pathParts.length === 0;
  }
  if (patternParts[0] === '**') {
    if (patternParts.length === 1) {
      return true;
    }
    return pathParts.some((_, index) =>
      matchPathSegments(patternParts.slice(1), pathParts.slice(index)),
    );
  }
  if (pathParts.length === 0 || !globSegmentToRegExp(patternParts[0]).test(pathParts[0])) {
    return false;
  }
  return matchPathSegments(patternParts.slice(1), pathParts.slice(1));
};

const matchesPathPattern = (pattern, candidatePath) =>
  matchPathSegments(String(pattern).split('/'), normalizePath(candidatePath).split('/'));

const readFrontendAreaTags = (root = DEFAULT_ROOT) => readJsonFile(root, FRONTEND_CI_TAGS_FILE);

const findWorkspacePackagesForPath = (changedPath, workspacePackages) => {
  const normalizedPath = normalizePath(changedPath);
  return workspacePackages
    .filter((workspacePackage) => {
      const packagePath = workspacePackage.path ?? workspacePackage.location;
      return (
        packagePath &&
        packagePath !== '.' &&
        (normalizedPath === packagePath || normalizedPath.startsWith(`${packagePath}/`))
      );
    })
    .toSorted((first, second) => {
      const firstPath = first.path ?? first.location;
      const secondPath = second.path ?? second.location;
      return secondPath.length - firstPath.length || firstPath.localeCompare(secondPath);
    });
};

const deriveWorkspacePackageTags = (changedPath, workspacePackages) => {
  const candidates = findWorkspacePackagesForPath(changedPath, workspacePackages);
  const taggedCandidates = candidates.filter((workspacePackage) =>
    Boolean(workspacePackage.e2eCiTags?.length),
  );
  return unique(
    (taggedCandidates.length > 0 ? taggedCandidates : candidates).flatMap(
      (workspacePackage) => workspacePackage.e2eCiTags ?? [],
    ),
  ).map(normalizeTag);
};

const deriveModuleManifestTags = (changedPath, workspacePackages) => {
  const parts = normalizePath(changedPath).split('/');
  if (parts[0] !== 'manifests' || parts[1] !== 'modules' || !parts[2]) {
    return [];
  }
  return deriveWorkspacePackageTags(`packages/${parts[2]}/package.json`, workspacePackages);
};

const deriveFrontendAreaTags = (changedPath, frontendAreaTags) => {
  const parts = normalizePath(changedPath).split('/');
  if (
    parts[0] !== 'frontend' ||
    parts[1] !== 'src' ||
    !['pages', 'concepts', 'api', 'routes'].includes(parts[2]) ||
    !parts[3]
  ) {
    return [];
  }
  const tag = frontendAreaTags[parts[3]];
  return tag ? [normalizeTag(tag)] : [];
};

const resolveTagCapabilities = (environmentCapabilities, tag) => ({
  ...environmentCapabilities.defaultCapabilities,
  ...(environmentCapabilities.tagOverrides?.[tag] ?? {}),
});

const isSpecFile = (file) =>
  normalizePath(file).endsWith('.cy.ts') && /(^|\/)cypress\/tests\/e2e\//.test(normalizePath(file));

const isCypressTestFile = (file) => /(^|\/)cypress\/tests\//.test(normalizePath(file));

const isCypressSupportFile = (file) => {
  const normalized = normalizePath(file);
  if (isDocumentationOnly(normalized)) {
    return false;
  }
  if (normalized === `${DEFAULT_SPEC_ROOT}/non-ci-specs.json`) {
    return false;
  }
  if (isCypressTestFile(normalized) && !isSpecFile(normalized)) {
    return false;
  }
  return (
    normalized.startsWith(`${DEFAULT_CYPRESS_SOURCE_ROOT}/`) ||
    /(^|\/)cypress\/(pages|fixtures|utils|support|commands|plugins)\//.test(normalized)
  );
};

const SAFE_SPEC_PATH_PATTERN = /^[A-Za-z0-9_./-]+\.cy\.ts$/;

const isSafeSpecPath = (spec) => SAFE_SPEC_PATH_PATTERN.test(normalizePath(spec));

const resolvePathImpact = ({
  changes = [],
  root = DEFAULT_ROOT,
  pathImpactMap,
  workspacePackages,
  frontendAreaTags,
  coverageInventory,
  environmentCapabilities,
}) => {
  const map = pathImpactMap ? validatePathImpactMap(pathImpactMap) : readPathImpactMap(root);
  const errors = [];
  const matchedMappings = [];
  const impactfulPaths = new Set();
  const unmatchedImpactfulPaths = new Set();
  const tags = new Set();
  const derivedTags = new Set();
  const environments = new Set();
  const supportingChecks = new Set();
  const coverageGaps = new Set();

  let resolvedWorkspacePackages = workspacePackages;
  let resolvedFrontendAreaTags = frontendAreaTags;
  let resolvedCoverageInventory = coverageInventory;
  let resolvedEnvironmentCapabilities = environmentCapabilities;

  const getWorkspacePackages = () => {
    if (resolvedWorkspacePackages === undefined) {
      resolvedWorkspacePackages = listWorkspacePackagesFromManifest(root);
    }
    return resolvedWorkspacePackages;
  };
  const getFrontendAreaTags = () => {
    if (resolvedFrontendAreaTags === undefined) {
      resolvedFrontendAreaTags = readFrontendAreaTags(root);
    }
    return resolvedFrontendAreaTags;
  };
  const getCoverageInventory = () => {
    if (resolvedCoverageInventory === undefined) {
      resolvedCoverageInventory = readCoverageInventory(root, map);
    } else {
      validateCoverageInventory(resolvedCoverageInventory, map);
    }
    return resolvedCoverageInventory;
  };
  const getEnvironmentCapabilities = () => {
    if (resolvedEnvironmentCapabilities === undefined) {
      resolvedEnvironmentCapabilities = readEnvironmentCapabilities(root);
    } else {
      validateEnvironmentCapabilities(resolvedEnvironmentCapabilities);
    }
    return resolvedEnvironmentCapabilities;
  };

  for (const change of changes) {
    for (const changedPath of [change.path, change.previousPath]) {
      if (!changedPath) {
        continue;
      }

      const normalizedPath = normalizePath(changedPath);
      const mapping = map.mappings.find((candidate) =>
        candidate.pathPatterns.some((pattern) => matchesPathPattern(pattern, normalizedPath)),
      );
      if (!mapping) {
        unmatchedImpactfulPaths.add(normalizedPath);
        errors.push(`Changed path has no E2E path-impact mapping: ${normalizedPath}`);
        continue;
      }

      let mappingTags = mapping.cypressTags ? mapping.cypressTags.map(normalizeTag) : [];
      let usedFallback = false;
      if (mapping.deriveCypressTags) {
        const derived =
          mapping.deriveCypressTags === 'workspace-package'
            ? deriveWorkspacePackageTags(normalizedPath, getWorkspacePackages())
            : mapping.deriveCypressTags === 'workspace-package-from-manifest-path'
            ? deriveModuleManifestTags(normalizedPath, getWorkspacePackages())
            : deriveFrontendAreaTags(normalizedPath, getFrontendAreaTags());
        for (const tag of derived) {
          derivedTags.add(tag);
        }
        mappingTags = derived;
        if (mappingTags.length === 0) {
          mappingTags = mapping.fallbackCypressTags.map(normalizeTag);
          usedFallback = true;
        }
      }

      matchedMappings.push({
        path: normalizedPath,
        mappingId: mapping.id,
        selectionMode: mapping.selectionMode,
        cypressTags: mappingTags,
        derivedTags: mapping.deriveCypressTags ? mappingTags : [],
        fallbackUsed: usedFallback,
        environments: mapping.selectionMode === 'none' ? [] : mapping.environments,
        supportingChecks: mapping.supportingChecks,
        coverageInventoryIds: mapping.coverageInventoryIds ?? [],
      });

      if (mapping.selectionMode === 'none') {
        continue;
      }

      impactfulPaths.add(normalizedPath);
      for (const tag of mappingTags) {
        tags.add(tag);
      }
      for (const environment of mapping.environments) {
        environments.add(environment);
      }
      for (const check of mapping.supportingChecks) {
        supportingChecks.add(check);
      }

      const inventory = getCoverageInventory();
      for (const behaviorId of mapping.coverageInventoryIds ?? []) {
        const behavior = inventory.behaviors.find((entry) => entry.id === behaviorId);
        if (!behavior) {
          errors.push(
            `E2E path mapping ${mapping.id} references unknown coverage behavior ${behaviorId}`,
          );
          continue;
        }
        if (!behavior.terminalStateAssertion.asserted) {
          errors.push(`E2E coverage behavior ${behaviorId} has no terminal-state assertion`);
        }
      }

      const capabilities = getEnvironmentCapabilities();
      for (const tag of mappingTags) {
        if (!capabilities.tags.includes(tag)) {
          errors.push(
            `E2E path-impact tag ${tag} is missing from the environment capability matrix`,
          );
          continue;
        }
        const tagCapabilities = resolveTagCapabilities(capabilities, tag);
        for (const environment of mapping.environments) {
          if (tagCapabilities[environment] === undefined) {
            errors.push(
              `E2E environment capability matrix has no ${environment} capability for ${tag}`,
            );
          } else if (!tagCapabilities[environment]) {
            const reason = capabilities.notSupportedReasons?.[environment] ?? 'no reason recorded';
            const gap = `${tag} cannot run in ${environment}: ${reason}`;
            coverageGaps.add(gap);
            errors.push(`E2E path-impact coverage gap: ${gap}`);
          }
        }
      }
    }
  }

  return {
    errors,
    matchedMappings: matchedMappings.toSorted(
      (first, second) =>
        first.path.localeCompare(second.path) || first.mappingId.localeCompare(second.mappingId),
    ),
    impactfulPaths: [...impactfulPaths].toSorted(),
    unmatchedImpactfulPaths: [...unmatchedImpactfulPaths].toSorted(),
    tags: [...tags].toSorted(),
    derivedTags: [...derivedTags].toSorted(),
    selectedEnvironments: [...environments].toSorted(),
    supportingChecks: [...supportingChecks].toSorted(),
    coverageGaps: [...coverageGaps].toSorted(),
  };
};

const resolvePathImpactTags = (changes = [], options = {}) =>
  resolvePathImpact({ ...options, changes }).tags;

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

const collectVariableInitializers = (sourceFile) => {
  const initializers = new Map();
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      initializers.set(node.name.text, node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return initializers;
};

const resolveCallName = (node, initializers, seen = new Set()) => {
  if (ts.isIdentifier(node)) {
    if (seen.has(node.text)) {
      return node.text;
    }
    const initializer = initializers.get(node.text);
    return initializer
      ? resolveCallName(initializer, initializers, new Set([...seen, node.text]))
      : node.text;
  }
  if (ts.isPropertyAccessExpression(node)) {
    const base = resolveCallName(node.expression, initializers, seen);
    return base ? `${base}.${node.name.text}` : null;
  }
  return null;
};

const resolveTagsExpression = (node, initializers, seen = new Set()) => {
  if (ts.isStringLiteralLike(node)) {
    return [normalizeTag(node.text)];
  }
  if (ts.isIdentifier(node)) {
    if (seen.has(node.text)) {
      return null;
    }
    const initializer = initializers.get(node.text);
    return initializer
      ? resolveTagsExpression(initializer, initializers, new Set([...seen, node.text]))
      : null;
  }
  if (ts.isArrayLiteralExpression(node)) {
    const tags = [];
    for (const element of node.elements) {
      const elementTags = resolveTagsExpression(element, initializers, seen);
      if (elementTags === null) {
        return null;
      }
      tags.push(...elementTags);
    }
    return unique(tags);
  }
  if (ts.isSpreadElement(node)) {
    return resolveTagsExpression(node.expression, initializers, seen);
  }
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) {
    return resolveTagsExpression(node.expression, initializers, seen);
  }
  return null;
};

const parseSpecSource = (source) => {
  const sourceFile = ts.createSourceFile('spec.cy.ts', source, ts.ScriptTarget.Latest, true);
  const initializers = collectVariableInitializers(sourceFile);
  const tests = [];

  const visit = (node, enclosingSkipped = false) => {
    if (ts.isCallExpression(node)) {
      const expressionText = resolveCallName(node.expression, initializers);
      if (
        expressionText &&
        /^(?:it|test)(?:\.(?:only|skip))?$/.test(expressionText) &&
        !enclosingSkipped &&
        !expressionText.endsWith('.skip')
      ) {
        let tags = [];
        let tagsResolved = true;
        const options = node.arguments[1];
        if (options && ts.isObjectLiteralExpression(options)) {
          for (const property of options.properties) {
            if (
              (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) &&
              property.name.getText(sourceFile) === 'tags'
            ) {
              const initializer = ts.isPropertyAssignment(property)
                ? property.initializer
                : property.name;
              const resolvedTags = resolveTagsExpression(initializer, initializers);
              tagsResolved = resolvedTags !== null;
              tags = resolvedTags ?? [];
            }
          }
        }
        tests.push({ tags: tagsResolved ? unique(tags) : null });
      }
    }
    let childSkipped = enclosingSkipped;
    if (ts.isCallExpression(node)) {
      const expressionText = resolveCallName(node.expression, initializers);
      childSkipped ||= Boolean(
        expressionText && /^(?:describe|context)\.skip$/.test(expressionText),
      );
    }
    ts.forEachChild(node, (child) => visit(child, childSkipped));
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
      (test) => Array.isArray(test.tags) && !test.tags.some((tag) => skipTags.includes(tag)),
    );
    inventory[spec] = {
      path: spec,
      testCount: tests.length,
      executableTestCount: executableTests.length,
      tags: unique(tests.flatMap((test) => test.tags ?? [])),
      executableTags: unique(executableTests.flatMap((test) => test.tags)),
      executableTestTags: executableTests.map((test) => test.tags),
    };
  }
  return inventory;
};

const resolveSelectedTags = (selectedTags, inventory) => {
  const resolved = {};
  const errors = [];
  for (const tag of selectedTags) {
    const specs = Object.values(inventory).filter((spec) => spec.executableTags.includes(tag));
    const testCount = specs.reduce(
      (total, spec) =>
        total + (spec.executableTestTags ?? []).filter((tags) => tags.includes(tag)).length,
      0,
    );
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

const buildNamedTagJobs = (tagGroups, prefix) =>
  tagGroups.map((tags, index) => ({
    tag: tags.join(' '),
    [tagDirKey]: `${sanitizeTagDir(prefix)}-${String(index + 1).padStart(2, '0')}`,
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

const isExecutableSpec = (spec, inventory) => (inventory[spec]?.executableTestCount ?? 0) > 0;

const isCiRunnableSpec = (spec, inventory, ciTags) => {
  const entry = inventory[spec];
  return (
    isExecutableSpec(spec, inventory) &&
    Boolean(entry?.executableTags.some((tag) => ciTags.includes(tag)))
  );
};

const resolveAvailableFullCoverageTags = (inventory) =>
  FULL_COVERAGE_TAGS.filter((tag) =>
    Object.values(inventory).some((entry) => entry.executableTags.includes(tag)),
  );

const selectImpactTags = (specs, inventory, ciTags) => {
  const candidateTags = unique(ciTags.filter((tag) => tag !== DEFAULT_TAG && tag.endsWith('CI')));
  const selectedTags = new Set();
  const uncoveredSpecs = [];

  for (const spec of specs) {
    const candidates = candidateTags.filter((tag) => inventory[spec]?.executableTags.includes(tag));
    if (candidates.length === 0) {
      uncoveredSpecs.push(spec);
      continue;
    }

    const tagCoverage = candidates.map((tag) => ({
      tag,
      testCount: Object.values(inventory)
        .filter((entry) => entry.executableTags.includes(tag))
        .reduce((total, entry) => total + entry.executableTestCount, 0),
    }));
    const sortedTagCoverage = tagCoverage.toSorted(
      (first, second) => first.testCount - second.testCount || first.tag.localeCompare(second.tag),
    );
    selectedTags.add(sortedTagCoverage[0].tag);
  }

  return {
    tags: [...selectedTags].toSorted(),
    uncoveredSpecs: uncoveredSpecs.toSorted(),
  };
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
  pathImpactMap,
  workspacePackages,
  frontendAreaTags,
  coverageInventory,
  environmentCapabilities,
}) => {
  const errors = [];
  const changedSpecs = new Set();
  const deletedSpecs = new Set();
  const impactedSpecs = new Set();
  let fullCoverageRequired = false;
  const details = [];
  const pathImpact = resolvePathImpact({
    changes,
    root,
    pathImpactMap,
    workspacePackages,
    frontendAreaTags,
    coverageInventory,
    environmentCapabilities,
  });
  errors.push(...pathImpact.errors);
  if (pathImpact.tags.length > 0) {
    details.push(`Path-impact mappings require ${pathImpact.tags.join(', ')}`);
  }
  const effectiveSelectedTags = unique([...selectedTags, ...pathImpact.tags]);
  const effectiveAutoTags = unique([...autoTags, ...pathImpact.tags]);

  for (const change of changes) {
    const changedPath = normalizePath(change.path);
    const previousPath = change.previousPath ? normalizePath(change.previousPath) : undefined;
    const changedPathIsSpec = isSpecFile(changedPath);
    const previousPathIsSpec = Boolean(previousPath && isSpecFile(previousPath));
    if (changedPathIsSpec) {
      if (change.status === 'D') {
        deletedSpecs.add(changedPath);
      } else {
        changedSpecs.add(changedPath);
      }
    }
    if (previousPathIsSpec) {
      deletedSpecs.add(previousPath);
    }
    if (changedPathIsSpec) {
      continue;
    }

    if (!isCypressSupportFile(changedPath)) {
      continue;
    }

    if (change.status === 'D') {
      fullCoverageRequired = true;
      details.push(
        `${changedPath}: deleted support code requires the canonical full-coverage tag sets`,
      );
      continue;
    }

    if (/\.(ts|tsx|js)$/.test(changedPath)) {
      const consumers = dependencyIndex.consumers[changedPath] ?? [];
      if (consumers.length === 0) {
        for (const spec of Object.keys(inventory)) {
          if (isCiRunnableSpec(spec, inventory, ciTags)) {
            impactedSpecs.add(spec);
          }
        }
        details.push(`${changedPath}: no consumers found; scheduled all CI-runnable E2E specs`);
        continue;
      }
      const executableConsumers = consumers.filter((consumer) =>
        isCiRunnableSpec(consumer, inventory, ciTags),
      );
      for (const consumer of executableConsumers) {
        impactedSpecs.add(consumer);
      }
      details.push(
        `${changedPath}: ${executableConsumers.length} executable importing spec(s) of ${consumers.length}`,
      );
      continue;
    }

    const consumers = buildFixtureConsumers({
      root,
      specs: Object.keys(inventory),
      dependencyIndex,
      fixturePath: changedPath,
    });
    if (consumers.length === 0) {
      for (const spec of Object.keys(inventory)) {
        if (isCiRunnableSpec(spec, inventory, ciTags)) {
          impactedSpecs.add(spec);
        }
      }
      details.push(`${changedPath}: no consumers found; scheduled all CI-runnable E2E specs`);
      continue;
    }
    const executableConsumers = consumers.filter((consumer) =>
      isCiRunnableSpec(consumer, inventory, ciTags),
    );
    for (const consumer of executableConsumers) {
      impactedSpecs.add(consumer);
    }
    details.push(
      `${changedPath}: ${executableConsumers.length} executable referencing spec(s) of ${consumers.length}`,
    );
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

  const tagResolution = resolveSelectedTags(effectiveSelectedTags, inventory);
  errors.push(...tagResolution.errors);

  const explicitChangedSpecs = [...changedSpecs].toSorted();
  const explicitImpactedSpecs = [...impactedSpecs]
    .filter((spec) => !changedSpecs.has(spec))
    .toSorted();
  const selectedTagSet = new Set(effectiveSelectedTags);
  const uncoveredImpactedSpecs = explicitImpactedSpecs.filter(
    (spec) => !inventory[spec]?.executableTags.some((tag) => selectedTagSet.has(tag)),
  );
  let impactMode = 'none';
  let impactedTagJobs = [];
  let explicitImpactSpecs = [];

  if (fullCoverageRequired) {
    impactMode = 'full-coverage-tags';
    const fullCoverageTags = resolveAvailableFullCoverageTags(inventory);
    if (fullCoverageTags.length === 0) {
      errors.push('No canonical full-coverage tag sets contain executable tests');
    } else {
      impactedTagJobs = buildNamedTagJobs(
        groupTagsForJobs(fullCoverageTags, fullCoverageTags),
        'full-coverage',
      );
    }
  } else if (uncoveredImpactedSpecs.length > MAX_EXPLICIT_IMPACTED_SPECS) {
    const impactTags = selectImpactTags(uncoveredImpactedSpecs, inventory, ciTags);
    if (impactTags.uncoveredSpecs.length > MAX_EXPLICIT_IMPACTED_SPECS) {
      impactMode = 'full-coverage-tags';
      const fullCoverageTags = resolveAvailableFullCoverageTags(inventory);
      if (fullCoverageTags.length === 0) {
        errors.push('No canonical full-coverage tag sets contain executable tests');
      } else {
        impactedTagJobs = buildNamedTagJobs(
          groupTagsForJobs(fullCoverageTags, fullCoverageTags),
          'full-coverage',
        );
      }
    } else {
      impactMode = 'ci-tags';
      impactedTagJobs = buildNamedTagJobs(
        groupTagsForJobs(impactTags.tags, impactTags.tags),
        'impacted-tag',
      );
      explicitImpactSpecs = impactTags.uncoveredSpecs;
    }
  } else if (uncoveredImpactedSpecs.length > 0) {
    impactMode = 'explicit-specs';
    explicitImpactSpecs = uncoveredImpactedSpecs;
  }

  for (const spec of [...explicitChangedSpecs, ...explicitImpactSpecs]) {
    if (!isSafeSpecPath(spec)) {
      errors.push(`Cypress spec path contains unsupported characters: ${spec}`);
    }
  }

  const calculateJobTestCount = (job) => {
    if (job.run_mode === 'spec') {
      return job.specs.reduce(
        (jobTotal, spec) => jobTotal + (inventory[spec]?.executableTestCount ?? 0),
        0,
      );
    }
    const tags = job.tag.split(' ');
    return Object.values(inventory).reduce(
      (jobTotal, entry) =>
        jobTotal +
        (entry.executableTestTags ?? []).filter((testTags) =>
          testTags.some((tag) => tags.includes(tag)),
        ).length,
      0,
    );
  };

  const matrix = [
    ...buildTagJobs(effectiveSelectedTags, effectiveAutoTags),
    ...createSpecJobs(explicitChangedSpecs, 'ChangedSpec'),
    ...impactedTagJobs,
    ...createSpecJobs(explicitImpactSpecs, 'ImpactedSpec'),
  ].map((job) => ({ ...job, plannedTestCount: calculateJobTestCount(job) }));

  if (matrix.length === 0) {
    errors.push('No Cypress E2E jobs were selected');
  }

  const plannedTestCount = matrix.reduce((total, job) => total + job.plannedTestCount, 0);

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
      impactMode,
      selectedTags: effectiveSelectedTags,
      pathImpactTags: pathImpact.tags,
      derivedPathImpactTags: pathImpact.derivedTags,
      matchedMappings: pathImpact.matchedMappings,
      selectedEnvironments: pathImpact.selectedEnvironments,
      supportingChecks: pathImpact.supportingChecks,
      coverageGaps: pathImpact.coverageGaps,
      unmatchedImpactfulPaths: pathImpact.unmatchedImpactfulPaths,
      selectedSuites: effectiveSelectedTags,
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
    `Impact strategy: ${summary.impactMode}`,
    '',
    '## Matched path-impact mappings',
    ...(summary.matchedMappings.length > 0
      ? summary.matchedMappings.map(
          (mapping) =>
            `- ${mapping.path}: ${mapping.mappingId}${
              mapping.cypressTags.length > 0 ? ` → ${mapping.cypressTags.join(', ')}` : ''
            }`,
        )
      : ['- None']),
    '',
    '## Selected tags',
    ...(summary.selectedTags.length > 0
      ? summary.selectedTags.map((tag) => `- ${tag}`)
      : ['- None']),
    '',
    '## Selected environments',
    ...(summary.selectedEnvironments.length > 0
      ? summary.selectedEnvironments.map((environment) => `- ${environment}`)
      : ['- None']),
    '',
    '## Supporting checks',
    ...(summary.supportingChecks.length > 0
      ? summary.supportingChecks.map((check) => `- ${check}`)
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
    '## Coverage gaps',
    ...(summary.coverageGaps.length > 0
      ? summary.coverageGaps.map((gap) => `- ${gap}`)
      : ['- None']),
    '',
    '## Unmatched impactful paths',
    ...(summary.unmatchedImpactfulPaths.length > 0
      ? summary.unmatchedImpactfulPaths.map((path) => `- ${path}`)
      : ['- None']),
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
  isSafeSpecPath,
  normalizePath,
  normalizeTag,
  parseBoolean,
  parseSpecSource,
  parseTagSelection,
  matchesPathPattern,
  readNonCiSpecs,
  readPathImpactMap,
  renderSelectionMarkdown,
  resolvePathImpact,
  resolvePathImpactTags,
  resolveSelectedTags,
  sanitizeTagDir,
};
