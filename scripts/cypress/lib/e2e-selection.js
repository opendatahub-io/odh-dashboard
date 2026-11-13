'use strict';

const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { globSync } = require('glob');

const {
  buildDependencyIndex,
  isCypressIrrelevantChange,
  normalizePath,
} = require('./mock-test-impact');
const { listWorkspacePackagesFromManifest } = require('../../query-workspace-packages');

const DEFAULT_ROOT = path.resolve(__dirname, '../../..');
const DEFAULT_SUPPORT_FILE = 'packages/cypress/cypress/support/e2e.ts';
const DEFAULT_SPEC_ROOT = 'packages/cypress/cypress/tests/e2e';
const DEFAULT_CYPRESS_SOURCE_ROOT = 'packages/cypress/cypress';
const DEFAULT_TAG = '@ci-dashboard-regression-tags';
const DEFAULT_SKIP_TAGS = ['@Bug', '@Maintain', '@NonConcurrent'];
const PATH_IMPACT_MAP_FILE = 'scripts/cypress/e2e-path-impact.json';
const FRONTEND_CI_TAGS_FILE = '.github/frontend-ci-tags.json';
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
const MAX_TAG_DIR_LENGTH = 80;
const WORKSPACE_DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];
const FULL_COVERAGE_TAGS = [
  '@SmokeSet1',
  '@SmokeSet2',
  '@SmokeSet3',
  '@SmokeSet4',
  '@SmokeSet5',
  '@Tier1Set1',
  '@Tier1Set2',
  '@Tier1Set3',
  '@Tier1Set4',
  '@Tier1Set5',
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
  }

  return pathImpactMap;
};

const readPathImpactMap = (root = DEFAULT_ROOT) =>
  validatePathImpactMap(readJsonFile(root, PATH_IMPACT_MAP_FILE));

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

const deriveWorkspacePackageTags = (changedPath, workspacePackages, availableTags = []) => {
  const candidates = findWorkspacePackagesForPath(changedPath, workspacePackages);
  const expandedPackages = new Set(candidates);
  const packagesByName = new Map(
    workspacePackages
      .filter((workspacePackage) => workspacePackage.name)
      .map((workspacePackage) => [workspacePackage.name, workspacePackage]),
  );
  const reverseDependencies = new Map();
  for (const workspacePackage of workspacePackages) {
    for (const field of WORKSPACE_DEPENDENCY_FIELDS) {
      for (const dependencyName of Object.keys(workspacePackage[field] ?? {})) {
        if (!packagesByName.has(dependencyName) || dependencyName === workspacePackage.name) {
          continue;
        }
        const dependents = reverseDependencies.get(dependencyName) ?? new Set();
        dependents.add(workspacePackage.name);
        reverseDependencies.set(dependencyName, dependents);
      }
    }
  }

  const expandedPackageNames = new Set(
    candidates
      .filter((workspacePackage) => workspacePackage.name)
      .map((workspacePackage) => workspacePackage.name),
  );
  const pendingPackageNames = [...expandedPackageNames];
  while (pendingPackageNames.length > 0) {
    const packageName = pendingPackageNames.pop();
    for (const dependentName of reverseDependencies.get(packageName) ?? []) {
      if (expandedPackageNames.has(dependentName)) {
        continue;
      }
      expandedPackageNames.add(dependentName);
      pendingPackageNames.push(dependentName);
      const dependentPackage = packagesByName.get(dependentName);
      if (dependentPackage) {
        expandedPackages.add(dependentPackage);
      }
    }
  }

  return unique(
    [...expandedPackages].flatMap((workspacePackage) => {
      const isDirectCandidate = candidates.includes(workspacePackage);
      return (workspacePackage.e2eCiTags ?? []).filter(
        (tag) => isDirectCandidate || availableTags.includes(normalizeTag(tag)),
      );
    }),
  ).map(normalizeTag);
};

const deriveModuleManifestTags = (changedPath, workspacePackages, availableTags = []) => {
  const parts = normalizePath(changedPath).split('/');
  if (parts[0] !== 'manifests' || parts[1] !== 'modules' || !parts[2]) {
    return [];
  }
  return deriveWorkspacePackageTags(
    `packages/${parts[2]}/package.json`,
    workspacePackages,
    availableTags,
  );
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

const isSpecFile = (file) =>
  normalizePath(file).endsWith('.cy.ts') && /(^|\/)cypress\/tests\/e2e\//.test(normalizePath(file));

const isCypressTestFile = (file) => /(^|\/)cypress\/tests\//.test(normalizePath(file));

const isCypressSupportFile = (file) => {
  const normalized = normalizePath(file);
  if (isCypressIrrelevantChange(normalized)) {
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
  availableTags = [],
  frontendAreaTags,
}) => {
  const map = pathImpactMap ? validatePathImpactMap(pathImpactMap) : readPathImpactMap(root);
  const errors = [];
  const matchedMappings = [];
  const impactfulPaths = new Set();
  const unmatchedImpactfulPaths = new Set();
  const tags = new Set();
  const derivedTags = new Set();

  let resolvedWorkspacePackages = workspacePackages;
  let resolvedFrontendAreaTags = frontendAreaTags;

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
            ? deriveWorkspacePackageTags(normalizedPath, getWorkspacePackages(), availableTags)
            : mapping.deriveCypressTags === 'workspace-package-from-manifest-path'
            ? deriveModuleManifestTags(normalizedPath, getWorkspacePackages(), availableTags)
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
      });

      if (mapping.selectionMode === 'none') {
        continue;
      }

      impactfulPaths.add(normalizedPath);
      for (const tag of mappingTags) {
        tags.add(tag);
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

const discoverSpecs = (root, type) => {
  const centralRoot = `${DEFAULT_CYPRESS_SOURCE_ROOT}/tests/${type}`;
  const specs = new Set(walkFiles(root, centralRoot, (file) => file.endsWith('.cy.ts')));

  for (const workspacePackage of listWorkspacePackagesFromManifest(root)) {
    const declaredPattern = workspacePackage.cypress?.[type];
    const workspacePath = workspacePackage.location ?? workspacePackage.path;
    if (!workspacePath || workspacePath === '.') {
      continue;
    }
    // Nested upstream mock suites belong in the impact graph even when they
    // are run by their own Cypress project rather than the central runner.
    const patterns = [
      declaredPattern,
      ...(type === 'mocked' ? ['**/cypress/tests/mocked/**/*.cy.ts'] : []),
    ].filter(Boolean);
    for (const pattern of patterns) {
      const packagePattern = normalizePath(path.join(workspacePath, pattern));
      for (const spec of globSync(packagePattern, {
        cwd: root,
        dot: true,
        nodir: true,
        matchBase: true,
        ignore: ['**/node_modules/**', '**/.git/**'],
      })) {
        if (spec.endsWith('.cy.ts')) {
          specs.add(normalizePath(spec));
        }
      }
    }
  }

  return [...specs].toSorted();
};

const discoverE2eSpecs = (root = DEFAULT_ROOT) => discoverSpecs(root, 'e2e');

const discoverCiTags = (root = DEFAULT_ROOT) => {
  const frontendTags = fs.existsSync(path.join(root, FRONTEND_CI_TAGS_FILE))
    ? Object.values(readFrontendAreaTags(root)).map(normalizeTag)
    : [];
  const tags = new Set([DEFAULT_TAG, ...FULL_COVERAGE_TAGS, ...frontendTags]);
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

// Resolve only top-level literal constants used directly as Mocha options.
// Any other reference could mutate or shadow the object, so fail closed.
const collectLiteralOptions = (sourceFile, initializers) => {
  const declarations = new Map();
  for (const statement of sourceFile.statements) {
    if (
      !ts.isVariableStatement(statement) ||
      !(statement.declarationList.flags & ts.NodeFlags.Const)
    ) {
      continue;
    }
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.initializer &&
        ts.isObjectLiteralExpression(declaration.initializer)
      ) {
        declarations.set(declaration.name.text, declaration);
      }
    }
  }
  const unsafe = new Set();
  const visit = (node) => {
    if (ts.isIdentifier(node) && declarations.has(node.text)) {
      const declaration = declarations.get(node.text);
      const { parent } = node;
      const isOptionsArgument =
        ts.isCallExpression(parent) &&
        parent.arguments[1] === node &&
        /^(?:it|test|describe|context)(?:\.(?:only|skip))?$/.test(
          resolveCallName(parent.expression, initializers) ?? '',
        );
      if (node !== declaration.name && !isOptionsArgument) {
        unsafe.add(node.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return new Map(
    [...declarations]
      .filter(([name]) => !unsafe.has(name))
      .map(([name, declaration]) => [name, declaration.initializer]),
  );
};

const resolveOptionsExpression = (node, initializers, seen = new Set()) => {
  if (!node) {
    return null;
  }
  if (ts.isObjectLiteralExpression(node)) {
    return node;
  }
  if (ts.isIdentifier(node) && !seen.has(node.text)) {
    return resolveOptionsExpression(
      initializers.get(node.text),
      initializers,
      new Set([...seen, node.text]),
    );
  }
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node)) {
    return resolveOptionsExpression(node.expression, initializers, seen);
  }
  return null;
};

const parseSpecSource = (source) => {
  const sourceFile = ts.createSourceFile('spec.cy.ts', source, ts.ScriptTarget.Latest, true);
  const initializers = collectVariableInitializers(sourceFile);
  const literalOptions = collectLiteralOptions(sourceFile, initializers);
  const tests = [];

  const visit = (
    node,
    inheritedTags = [],
    inheritedTagsResolved = true,
    enclosingSkipped = false,
  ) => {
    let childTags = inheritedTags;
    let childTagsResolved = inheritedTagsResolved;
    let childSkipped = enclosingSkipped;

    if (ts.isCallExpression(node)) {
      const expressionText = resolveCallName(node.expression, initializers);
      if (expressionText && /^(?:describe|context)(?:\.(?:only|skip))?$/.test(expressionText)) {
        if (expressionText.endsWith('.skip')) {
          childSkipped = true;
        }
        const suiteOptions = resolveOptionsExpression(node.arguments[1], literalOptions);
        if (node.arguments.length >= 3 && !suiteOptions) {
          childTagsResolved = false;
        }
        if (suiteOptions) {
          for (const property of suiteOptions.properties) {
            if (
              (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) &&
              property.name.getText(sourceFile) === 'tags'
            ) {
              const initializer = ts.isPropertyAssignment(property)
                ? property.initializer
                : property.name;
              const resolvedTags = resolveTagsExpression(initializer, initializers);
              childTagsResolved = childTagsResolved && resolvedTags !== null;
              childTags = unique([...childTags, ...(resolvedTags ?? [])]);
            }
          }
          if (suiteOptions.properties.some((property) => ts.isSpreadAssignment(property))) {
            childTagsResolved = false;
          }
        }
      }
      if (
        expressionText &&
        /^(?:it|test)(?:\.(?:only|skip))?$/.test(expressionText) &&
        !enclosingSkipped &&
        !expressionText.endsWith('.skip')
      ) {
        let tags = [];
        let tagsResolved = true;
        const options = resolveOptionsExpression(node.arguments[1], literalOptions);
        if (node.arguments.length >= 3 && !options) {
          tagsResolved = false;
        }
        if (options) {
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
          if (options.properties.some((property) => ts.isSpreadAssignment(property))) {
            tagsResolved = false;
          }
        }
        tests.push({
          tags: tagsResolved && inheritedTagsResolved ? unique([...inheritedTags, ...tags]) : null,
        });
      }
    }
    ts.forEachChild(node, (child) => visit(child, childTags, childTagsResolved, childSkipped));
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
    const source = readFile(path.join(root, spec));
    const tests = parseSpecSource(source);
    const executableTests = tests.filter(
      (test) => Array.isArray(test.tags) && !test.tags.some((tag) => skipTags.includes(tag)),
    );
    const intentionallyExcludedTests = tests.filter(
      (test) => Array.isArray(test.tags) && test.tags.some((tag) => skipTags.includes(tag)),
    );
    inventory[spec] = {
      path: spec,
      testCount: tests.length,
      executableTestCount: executableTests.length,
      tags: unique(tests.flatMap((test) => test.tags ?? [])),
      executableTags: unique(executableTests.flatMap((test) => test.tags)),
      executableTestTags: executableTests.map((test) => test.tags),
      intentionallyExcludedTestCount: intentionallyExcludedTests.length,
      unresolvedTagTestCount: tests.filter((test) => test.tags === null).length,
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

const sanitizeTagDir = (value) => {
  const sanitized =
    String(value)
      .replace(/^@/, '')
      .replace(/[^a-zA-Z0-9_.-]/g, '-')
      .replace(/^-+|-+$/g, '') || 'tag';
  if (sanitized.length <= MAX_TAG_DIR_LENGTH) {
    return sanitized;
  }
  const hash = createHash('sha256').update(sanitized).digest('hex').slice(0, 8);
  return `${sanitized.slice(0, MAX_TAG_DIR_LENGTH - 9)}-${hash}`;
};

const tagDirKey = 'tag_dir';
const runModeKey = 'run_mode';

const buildTagJobs = (selectedTags, autoTags = []) =>
  groupTagsForJobs(selectedTags, autoTags).map((tags) => ({
    tag: tags.join(' '),
    [tagDirKey]: sanitizeTagDir(tags.join('__')),
    specs: [],
    [runModeKey]: 'tag',
    // Tag count does not bound cluster setup, training, or model-serving duration.
    timeout: 360,
  }));

const buildNamedTagJobs = (tagGroups, prefix) =>
  tagGroups.map((tags, index) => ({
    tag: tags.join(' '),
    [tagDirKey]: `${sanitizeTagDir(prefix)}-${String(index + 1).padStart(2, '0')}`,
    specs: [],
    [runModeKey]: 'tag',
    // Tag count does not bound cluster setup, training, or model-serving duration.
    timeout: 360,
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
  const sourceFiles = unique([
    ...walkFiles(root, DEFAULT_CYPRESS_SOURCE_ROOT, (file) => /\.(ts|tsx|js)$/.test(file)),
    ...specs,
    ...Object.keys(dependencyIndex.consumers),
  ]).filter((file) => /\.(ts|tsx|js)$/.test(file) && fs.existsSync(path.join(root, file)));
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

const hasCompleteTagCoverage = (spec, inventory, selectedTags) => {
  const testTags = inventory[spec]?.executableTestTags ?? [];
  return testTags.length > 0 && testTags.every((tags) => tags.some((tag) => selectedTags.has(tag)));
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
    let remainingTests = inventory[spec]?.executableTestTags ?? [];

    while (remainingTests.length > 0) {
      const candidates = candidateTags.filter((tag) =>
        remainingTests.some((testTags) => testTags.includes(tag)),
      );
      if (candidates.length === 0) {
        uncoveredSpecs.push(spec);
        break;
      }

      const tagCoverage = candidates.map((tag) => ({
        tag,
        testCount: Object.values(inventory).reduce(
          (total, entry) =>
            total +
            (entry.executableTestTags ?? []).filter((testTags) => testTags.includes(tag)).length,
          0,
        ),
      }));
      const sortedTagCoverage = tagCoverage.toSorted(
        (first, second) =>
          first.testCount - second.testCount || first.tag.localeCompare(second.tag),
      );
      const selectedTag = sortedTagCoverage[0].tag;
      selectedTags.add(selectedTag);
      remainingTests = remainingTests.filter((testTags) => !testTags.includes(selectedTag));
    }
  }

  return {
    tags: [...selectedTags].toSorted(),
    uncoveredSpecs: uncoveredSpecs.toSorted(),
  };
};

const describeJobSelection = (job) => {
  let reason = 'Selected tag coverage (default regression, requested tags, or path-impact mapping)';
  if (job.tag_dir.startsWith('changedspec-')) {
    reason = 'Added, modified, or renamed E2E specs run explicitly';
  } else if (job.tag_dir.startsWith('full-coverage-')) {
    reason = 'Broad or deleted support-code impact requires canonical Smoke/Tier1 coverage';
  } else if (job.tag_dir.startsWith('impactedspec-')) {
    reason = 'Impacted specs have tests not fully covered by the selected tag jobs';
  } else if (job.tag_dir.startsWith('impacted-tag-')) {
    reason = 'Package CI tags cover a broad set of specs affected by changed support code';
  }
  return reason;
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
}) => {
  const errors = [];
  const changedSpecs = new Set();
  const deletedSpecs = new Set();
  const impactedSpecs = new Set();
  let fullCoverageRequired = false;
  const details = [];
  const e2eDiagnostics = dependencyIndex.e2eDiagnostics ?? dependencyIndex;
  const graphGaps = [
    ...(e2eDiagnostics.unresolvedCode ?? []),
    ...(e2eDiagnostics.dynamicImports ?? []),
  ];
  const changesSupport = changes.some((change) =>
    [change.path, change.previousPath].some(
      (file) => file && !isSpecFile(file) && isCypressSupportFile(file),
    ),
  );
  if (graphGaps.length > 0 && changesSupport) {
    errors.push(
      'Cannot safely select E2E support impact: the E2E dependency graph has unresolved or dynamic imports. ' +
        'Resolve these imports before running impacted specs.',
    );
    details.push(...graphGaps);
  }
  const ciTagSet = new Set(ciTags);
  const executableInventoryTags = unique(
    Object.values(inventory).flatMap((entry) => entry.executableTags ?? []),
  ).filter((tag) => ciTagSet.has(tag));
  const pathImpact = resolvePathImpact({
    changes,
    root,
    pathImpactMap,
    workspacePackages,
    availableTags: executableInventoryTags,
    frontendAreaTags,
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
      specs: dependencyIndex.specs ?? Object.keys(inventory),
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
    const intentionallyExcluded =
      entry.executableTestCount === 0 &&
      entry.testCount > 0 &&
      (entry.intentionallyExcludedTestCount ?? 0) === entry.testCount;
    if (entry.executableTestCount === 0 && !(intentionallyExcluded && nonCiSpecs[spec])) {
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

  const changedSpecList = [...changedSpecs].toSorted();
  const explicitChangedSpecs = changedSpecList.filter((spec) =>
    isCiRunnableSpec(spec, inventory, ciTags),
  );
  const explicitImpactedSpecs = [...impactedSpecs]
    .filter((spec) => !changedSpecs.has(spec))
    .toSorted();
  const selectedTagSet = new Set(effectiveSelectedTags);
  const uncoveredImpactedSpecs = explicitImpactedSpecs.filter(
    (spec) => !hasCompleteTagCoverage(spec, inventory, selectedTagSet),
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
      const fullCoverageTagSet = new Set([...fullCoverageTags, ...effectiveSelectedTags]);
      explicitImpactSpecs = Object.keys(inventory)
        .filter(
          (spec) =>
            isCiRunnableSpec(spec, inventory, ciTags) &&
            !changedSpecs.has(spec) &&
            !hasCompleteTagCoverage(spec, inventory, fullCoverageTagSet),
        )
        .toSorted();
      impactedTagJobs = buildNamedTagJobs(
        groupTagsForJobs(fullCoverageTags, fullCoverageTags),
        'full-coverage',
      );
      if (explicitImpactSpecs.length > 0) {
        details.push(
          `Canonical full-coverage tags do not cover ${explicitImpactSpecs.length} CI-runnable spec(s); scheduled them explicitly`,
        );
      }
    }
  } else if (uncoveredImpactedSpecs.length > MAX_EXPLICIT_IMPACTED_SPECS) {
    const impactTags = selectImpactTags(uncoveredImpactedSpecs, inventory, ciTags);
    if (impactTags.uncoveredSpecs.length > MAX_EXPLICIT_IMPACTED_SPECS) {
      impactMode = 'full-coverage-tags';
      details.push(
        `Broad support impact: ${uncoveredImpactedSpecs.length} specs need additional coverage; ` +
          `${impactTags.uncoveredSpecs.length} cannot be fully covered by package CI tags ` +
          `(explicit-spec limit: ${MAX_EXPLICIT_IMPACTED_SPECS}). Using canonical Smoke/Tier1 sets.`,
      );
      const fullCoverageTags = resolveAvailableFullCoverageTags(inventory);
      if (fullCoverageTags.length === 0) {
        errors.push('No canonical full-coverage tag sets contain executable tests');
      } else {
        const fullCoverageTagSet = new Set([...fullCoverageTags, ...effectiveSelectedTags]);
        explicitImpactSpecs = uncoveredImpactedSpecs
          .filter((spec) => !hasCompleteTagCoverage(spec, inventory, fullCoverageTagSet))
          .toSorted();
        impactedTagJobs = buildNamedTagJobs(
          groupTagsForJobs(fullCoverageTags, fullCoverageTags),
          'full-coverage',
        );
        if (explicitImpactSpecs.length > 0) {
          details.push(
            `Canonical full-coverage tags do not cover ${explicitImpactSpecs.length} impacted spec(s); scheduled them explicitly`,
          );
        }
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

  const plannedTestCountKey = 'planned_test_count';

  const matrix = [
    ...buildTagJobs(effectiveSelectedTags, effectiveAutoTags),
    ...createSpecJobs(explicitChangedSpecs, 'ChangedSpec'),
    ...impactedTagJobs,
    ...createSpecJobs(explicitImpactSpecs, 'ImpactedSpec'),
  ].map((job) => ({
    ...job,
    [plannedTestCountKey]: calculateJobTestCount(job),
    reason: describeJobSelection(job),
  }));

  const selectedSpecs = new Set([...changedSpecs, ...impactedSpecs]);
  for (const job of matrix) {
    for (const entry of Object.values(inventory)) {
      if (
        job.run_mode === 'spec'
          ? job.specs.includes(entry.path)
          : (entry.unresolvedTagTestCount ?? 0) > 0 ||
            entry.executableTags.some((tag) => job.tag.split(' ').includes(tag))
      ) {
        selectedSpecs.add(entry.path);
      }
    }
  }
  for (const spec of selectedSpecs) {
    if ((inventory[spec]?.unresolvedTagTestCount ?? 0) > 0) {
      errors.push(
        `Selected Cypress spec has unresolved test or suite tags: ${spec}. ` +
          'Use statically resolvable tag arrays and literal options so planned counts are reliable.',
      );
    }
  }

  if (matrix.length === 0) {
    errors.push('No Cypress E2E jobs were selected');
  }

  const jobs = matrix.map((job) => ({
    name: job.tag_dir,
    runMode: job.run_mode,
    tags: job.run_mode === 'tag' ? job.tag.split(' ') : [],
    specs: job.specs ?? [],
    plannedTestCount: job[plannedTestCountKey],
    reason: job.reason,
  }));

  const plannedTestCount = matrix.reduce((total, job) => total + job[plannedTestCountKey], 0);

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
      changedSpecs: changedSpecList,
      deletedSpecs: [...deletedSpecs].toSorted(),
      impactedSpecs: unique([...explicitImpactedSpecs, ...explicitImpactSpecs]).toSorted(),
      impactMode,
      selectedTags: effectiveSelectedTags,
      pathImpactTags: pathImpact.tags,
      derivedPathImpactTags: pathImpact.derivedTags,
      matchedMappings: pathImpact.matchedMappings,
      unmatchedImpactfulPaths: pathImpact.unmatchedImpactfulPaths,
      selectedSuites: effectiveSelectedTags,
      resolvedTags: tagResolution.resolved,
      plannedTestCount,
      jobs,
      details,
    },
  };
};

const renderSelectionMarkdown = (summary) =>
  [
    '# Cypress E2E CI selection for this PR',
    '',
    'This summary lists the Cypress E2E CI tags and specs selected for the PR under test, ' +
      'including the default regression checks when enabled.',
    '',
    '**This is a limited CI check, not a comprehensive test plan or full feature/release validation.**',
    '',
    `Selected ${(summary.jobs ?? []).length} Cypress E2E CI job(s), ${
      summary.plannedTestCount
    } expected test executions.`,
    'Counts are per-job executions and may overlap across jobs.',
    '',
    '## Why these Cypress E2E CI checks were selected',
    ...(summary.details ?? []).map((detail) => `- ${detail}`),
    '',
    '## Selected Cypress E2E CI jobs',
    ...(summary.jobs ?? []).flatMap((job) => [
      `- ${job.name}: ${job.plannedTestCount} expected test execution(s) — ${job.reason}`,
      ...(job.tags.length > 0 ? [`  - Tags: ${job.tags.join(' ')}`] : []),
      ...job.specs.map((spec) => `  - Spec: ${spec}`),
    ]),
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
    '## Selected Cypress E2E CI tags',
    ...(summary.selectedTags.length > 0
      ? summary.selectedTags.map((tag) => `- ${tag}`)
      : ['- None']),
    '',
    '## Tests matching the selected CI tags',
    ...(Object.keys(summary.resolvedTags).length > 0
      ? Object.entries(summary.resolvedTags).map(
          ([tag, value]) =>
            `- ${tag}: ${value.specs.length} spec(s), ${value.testCount} executable test(s)`,
        )
      : ['- None']),
    '',
    `Expected Cypress E2E CI test executions: ${summary.plannedTestCount}`,
    '',
    ...(summary.errors?.length > 0
      ? ['## Validation errors', ...summary.errors.map((error) => `- ${error}`), '']
      : []),
    '## Unmatched impactful paths',
    ...(summary.unmatchedImpactfulPaths.length > 0
      ? summary.unmatchedImpactfulPaths.map((path) => `- ${path}`)
      : ['- None']),
    '',
  ].join('\n');

const buildDependencyIndexForE2e = ({ root, specs }) => {
  const index = buildDependencyIndex({ root, specs, supportFile: DEFAULT_SUPPORT_FILE });
  // Only gaps reachable from E2E specs/support make E2E reverse impact unsafe.
  // Missing imports inside a separate mock project must not broaden live E2E runs.
  index.e2eDiagnostics = {
    unresolvedCode: [...index.unresolvedCode],
    dynamicImports: [...index.dynamicImports],
  };
  const mockProjects = new Map();
  for (const spec of discoverSpecs(root, 'mocked')) {
    const configFile = ts.findConfigFile(path.dirname(path.join(root, spec)), ts.sys.fileExists);
    const key = configFile ?? '';
    mockProjects.set(key, [...(mockProjects.get(key) ?? []), spec]);
  }
  for (const [configFile, mockSpecs] of mockProjects) {
    let compilerOptions = {};
    if (configFile) {
      const config = ts.readConfigFile(configFile, ts.sys.readFile);
      if (config.error) {
        throw new Error(`Cannot read Cypress impact tsconfig: ${configFile}`);
      }
      // TypeScript resolves inherited baseUrl/paths relative to their declaring
      // config; upstream mock imports such as ~/... must keep that context.
      compilerOptions = ts.parseJsonConfigFileContent(
        config.config,
        ts.sys,
        path.dirname(configFile),
        {},
        configFile,
      ).options;
    }
    const supportFile = configFile
      ? normalizePath(
          path.relative(root, path.join(path.dirname(configFile), 'cypress/support/e2e.ts')),
        )
      : DEFAULT_SUPPORT_FILE;
    const mockIndex = buildDependencyIndex({
      root,
      specs: mockSpecs,
      supportFile,
      compilerOptions,
    });
    index.specs = unique([...index.specs, ...mockIndex.specs]).toSorted();
    for (const [file, consumers] of Object.entries(mockIndex.consumers)) {
      index.consumers[file] = unique([...(index.consumers[file] ?? []), ...consumers]).toSorted();
    }
    index.unresolvedCode = unique([
      ...index.unresolvedCode,
      ...mockIndex.unresolvedCode,
    ]).toSorted();
    index.dynamicImports = unique([
      ...index.dynamicImports,
      ...mockIndex.dynamicImports,
    ]).toSorted();
  }
  return index;
};

module.exports = {
  DEFAULT_SKIP_TAGS,
  DEFAULT_TAG,
  buildDependencyIndexForE2e,
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
