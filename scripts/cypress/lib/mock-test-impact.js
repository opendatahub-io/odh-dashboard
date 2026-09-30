const fs = require('fs');
const path = require('path');

const SUPPORT_FILE = 'packages/cypress/cypress/support/e2e.ts';
const CODE_FILE_PATTERN = /\.[cm]?[jt]sx?$/;

const normalizePath = (value) => value.split(path.sep).join('/').replace(/^\.\//, '');

const isDocumentationOnly = (file) => {
  const normalized = normalizePath(file);
  return (
    /(^|\/)docs\//i.test(normalized) ||
    /^[^/]+\.(md|mdx|adoc|rst)$/i.test(normalized) ||
    /(^|\/)(README|CONTRIBUTING|AGENTS|CLAUDE)\.(md|mdx|adoc|rst)$/i.test(normalized) ||
    /^\.github\/(ISSUE_TEMPLATE\/.*|PULL_REQUEST_TEMPLATE\.md)$/i.test(normalized)
  );
};

const isSelectorInfrastructure = (file) => {
  const normalized = normalizePath(file);
  return (
    normalized === '.github/workflows/test.yml' ||
    normalized === 'package.json' ||
    normalized === 'pnpm-lock.yaml' ||
    normalized === 'pnpm-workspace.yaml' ||
    normalized === 'scripts/generate-cypress-test-matrix.js' ||
    normalized.startsWith('scripts/cypress/') ||
    normalized === 'packages/cypress/cypress.config.ts' ||
    /(^|\/)tsconfig[^/]*\.json$/.test(normalized) ||
    /(^|\/)rspack[^/]*\.[cm]?js$/.test(normalized)
  );
};

const isCypressTestInput = (file) => {
  const normalized = normalizePath(file);
  return (
    normalized.startsWith('packages/cypress/') ||
    normalized.includes('/cypress/') ||
    normalized.includes('/__tests__/cypress/') ||
    normalized.includes('/__mocks__/')
  );
};

const findGroupNames = (groups, specs) => {
  const selectedSpecs = new Set(specs.map(normalizePath));
  return groups
    .filter((group) => group.files.some((file) => selectedSpecs.has(normalizePath(file))))
    .map((group) => group.name)
    .toSorted();
};

const fullPlan = (groups, changes, reason, details = []) => ({
  mode: 'select',
  scope: 'full',
  changedFiles: changes.map((change) => change.path),
  selectedGroups: groups.map((group) => group.name).toSorted(),
  excludedGroups: [],
  reason,
  details,
  safety: 'CI runs the complete Cypress mock matrix.',
});

const planMockTestImpact = ({ groups, changes, dependencyIndex }) => {
  if (changes.length === 0) {
    return fullPlan(groups, changes, 'No usable Git changes were found.');
  }

  if (changes.every((change) => isDocumentationOnly(change.path))) {
    return {
      mode: 'select',
      scope: 'none',
      changedFiles: changes.map((change) => change.path),
      selectedGroups: [],
      excludedGroups: groups.map((group) => group.name).toSorted(),
      reason: 'Every changed file is validated non-runtime documentation.',
      details: [],
      safety: 'CI skips Cypress mock tests for this documentation-only change.',
    };
  }

  if (changes.some((change) => change.status !== 'M' && change.status !== 'A')) {
    return fullPlan(
      groups,
      changes,
      'Deleted, copied, or renamed files require a base-revision dependency graph.',
    );
  }

  const runtimeChanges = changes.filter((change) => !isDocumentationOnly(change.path));
  const infrastructure = runtimeChanges.find((change) => isSelectorInfrastructure(change.path));
  if (infrastructure) {
    return fullPlan(
      groups,
      changes,
      `Test selection or build infrastructure changed: ${infrastructure.path}`,
    );
  }

  const nonTestInput = runtimeChanges.find((change) => !isCypressTestInput(change.path));
  if (nonTestInput) {
    return fullPlan(
      groups,
      changes,
      `Application or build input is outside the proven Cypress dependency graph: ${nonTestInput.path}`,
    );
  }

  if (dependencyIndex.unresolvedCode.length > 0 || dependencyIndex.dynamicImports.length > 0) {
    return fullPlan(
      groups,
      changes,
      'The Cypress dependency graph contains unresolved code edges.',
      [...dependencyIndex.unresolvedCode, ...dependencyIndex.dynamicImports],
    );
  }

  const specs = new Set();
  const details = [];
  for (const change of runtimeChanges) {
    const changedPath = normalizePath(change.path);
    if (changedPath.endsWith('.cy.ts')) {
      if (!dependencyIndex.specs.includes(changedPath)) {
        return fullPlan(groups, changes, `Changed Cypress spec was not discovered: ${changedPath}`);
      }
      specs.add(changedPath);
      details.push(`${changedPath}: changed spec`);
      continue;
    }

    if (!CODE_FILE_PATTERN.test(changedPath)) {
      return fullPlan(
        groups,
        changes,
        `Non-code Cypress input may be loaded without an import edge: ${changedPath}`,
      );
    }

    const consumers = dependencyIndex.consumers[changedPath] ?? [];
    if (consumers.length === 0) {
      return fullPlan(groups, changes, `No Cypress consumer was found for: ${changedPath}`);
    }
    for (const spec of consumers) {
      specs.add(spec);
    }
    details.push(`${changedPath}: ${consumers.length} importing spec(s)`);
  }

  const selectedGroups = findGroupNames(groups, [...specs]);
  if (selectedGroups.length === 0) {
    return fullPlan(groups, changes, 'Impacted specs did not map to the generated CI groups.');
  }

  const selected = new Set(selectedGroups);
  return {
    mode: 'select',
    scope: selectedGroups.length === groups.length ? 'full' : 'partial',
    changedFiles: changes.map((change) => change.path),
    selectedGroups,
    excludedGroups: groups
      .map((group) => group.name)
      .filter((name) => !selected.has(name))
      .toSorted(),
    reason: `Static Cypress imports reach ${specs.size} spec(s) in ${selectedGroups.length} group(s).`,
    details,
    safety: 'CI runs only the statically reached Cypress mock groups.',
  };
};

const buildDependencyIndex = ({ root, specs, supportFile = SUPPORT_FILE }) => {
  // TypeScript's resolver understands workspace exports and package symlinks.
  // Load it lazily so pure planner tests do not need an installed workspace.
  // eslint-disable-next-line global-require
  const ts = require('typescript');
  const canonicalRoot = fs.realpathSync(root);
  const graph = new Map();
  const unresolvedCode = [];
  const dynamicImports = [];
  const options = {
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    allowJs: true,
    resolveJsonModule: true,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  };
  const cache = ts.createModuleResolutionCache(canonicalRoot, (value) => value, options);

  const visit = (relativeFile) => {
    const normalized = normalizePath(relativeFile);
    if (graph.has(normalized)) {
      return;
    }
    graph.set(normalized, []);
    const absoluteFile = path.join(canonicalRoot, normalized);
    if (!fs.existsSync(absoluteFile) || !CODE_FILE_PATTERN.test(absoluteFile)) {
      return;
    }

    const source = ts.createSourceFile(
      absoluteFile,
      fs.readFileSync(absoluteFile, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const imports = [];
    const walk = (node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        imports.push(node.moduleSpecifier.text);
      }
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
      ) {
        if (node.arguments.length && ts.isStringLiteralLike(node.arguments[0])) {
          imports.push(node.arguments[0].text);
        } else {
          dynamicImports.push(`${normalized}: ${node.getText(source).slice(0, 160)}`);
        }
      }
      ts.forEachChild(node, walk);
    };
    walk(source);

    for (const importName of new Set(imports)) {
      const resolved = ts.resolveModuleName(
        importName,
        absoluteFile,
        options,
        ts.sys,
        cache,
      ).resolvedModule;
      if (!resolved) {
        if (
          /^(\.|#|~|@odh-dashboard\/)/.test(importName) &&
          !/\.(css|scss|sass|less|svg|png|jpe?g|gif|webp)$/.test(importName)
        ) {
          unresolvedCode.push(`${normalized}: ${importName}`);
        }
        continue;
      }

      const resolvedPath = fs.realpathSync(resolved.resolvedFileName);
      if (
        !resolvedPath.startsWith(`${canonicalRoot}${path.sep}`) ||
        resolvedPath.includes('/node_modules/')
      ) {
        continue;
      }
      const target = normalizePath(path.relative(canonicalRoot, resolvedPath));
      graph.get(normalized).push(target);
      visit(target);
    }
  };

  const normalizedSpecs = specs.map(normalizePath).toSorted();
  for (const entry of [...normalizedSpecs, supportFile]) {
    visit(entry);
  }

  const closure = (seed) => {
    const seen = new Set();
    const queue = [normalizePath(seed)];
    while (queue.length > 0) {
      const next = queue.pop();
      if (seen.has(next)) {
        continue;
      }
      seen.add(next);
      queue.push(...(graph.get(next) ?? []));
    }
    return seen;
  };

  const supportDependencies = closure(supportFile);
  const consumers = {};
  for (const spec of normalizedSpecs) {
    const dependencies = closure(spec);
    for (const dependency of new Set([...supportDependencies, ...dependencies])) {
      consumers[dependency] ??= [];
      consumers[dependency].push(spec);
    }
  }

  return {
    specs: normalizedSpecs,
    consumers,
    unresolvedCode: [...new Set(unresolvedCode)].toSorted(),
    dynamicImports: [...new Set(dynamicImports)].toSorted(),
  };
};

module.exports = {
  buildDependencyIndex,
  isDocumentationOnly,
  isCypressTestInput,
  isSelectorInfrastructure,
  normalizePath,
  planMockTestImpact,
};
