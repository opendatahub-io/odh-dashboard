const path = require('path');

const MODEL_SERVING_REMOTE_ENTRY = '/_mf/modelServing/remoteEntry.js';

// Keep the complete graph: defaults hide orphaned/concatenated modules and reasons.
const STATS_OPTIONS = {
  all: false,
  hash: true,
  version: true,
  builtAt: true,
  assets: true,
  entrypoints: true,
  chunks: true,
  chunkRelations: true,
  modules: true,
  nestedModules: true,
  orphanModules: true,
  dependentModules: true,
  runtimeModules: true,
  reasons: true,
  ids: true,
  children: true,
  errors: true,
  warnings: true,
  modulesSpace: Infinity,
  nestedModulesSpace: Infinity,
  reasonsSpace: Infinity,
  groupModulesByPath: false,
  groupModulesByType: false,
  groupModulesByExtension: false,
  groupModulesByAttributes: false,
  groupModulesByCacheStatus: false,
  groupModulesByLayer: false,
  groupAssetsByPath: false,
  groupAssetsByExtension: false,
  groupAssetsByInfo: false,
  groupAssetsByEmitStatus: false,
};

const slash = (value) => value.replace(/\\/g, '/');

const getOwner = (resource) => {
  // Also recognize workspace packages resolved through a node_modules symlink.
  // The innermost package owns the module, including dependencies nested under
  // the legacy frontend or a workspace with resolve.symlinks disabled.
  const installed = resource.match(/(?:^|\/)node_modules\/(@[^/]+\/[^/]+|[^/]+)/g);
  if (installed) return installed.at(-1).replace(/^.*node_modules\//, '');
  if (/^frontend\//.test(resource)) return '@odh-dashboard/internal';
  const workspace = resource.match(/^(packages|distributions)\/([^/]+)\//);
  if (workspace) return `${workspace[1]}/${workspace[2]}`;
  return resource ? '(repository/other)' : '(bundler runtime)';
};

const forbiddenOwner = (owner) =>
  ['@odh-dashboard/internal', '@odh-dashboard/kserve', 'packages/kserve'].includes(owner);

const assertComplete = (value) => {
  for (const key of ['filteredModules', 'filteredChildren', 'filteredReasons', 'filteredAssets']) {
    if (value[key] > 0) throw new Error(`Incomplete production stats: ${key}=${value[key]}`);
  }
};

/** Audit only modules assigned to emitted chunks, including nested concatenated modules. */
const auditRuntime = (stats, { repoRoot, context, metadata = {}, verifiedExternals = [] }) => {
  const root = slash(path.resolve(repoRoot));
  const buildContext = slash(path.resolve(context));
  const display = (value) => slash(value).split(`${root}/`).join('');
  const modules = new Map();
  const chunks = new Map();
  const roots = new Set();

  const collect = (compilation, scope) => {
    assertComplete(compilation);
    if (!Array.isArray(compilation.errors)) {
      throw new Error('Production stats must include compilation errors');
    }
    if (compilation.errors.length || compilation.errorsCount > 0) {
      throw new Error('Cannot audit a failed production compilation');
    }
    if (!Array.isArray(compilation.modules) || !Array.isArray(compilation.chunks)) {
      throw new Error('Production stats must include modules and chunks');
    }
    for (const chunk of compilation.chunks) {
      if (chunk.id == null || !Array.isArray(chunk.files) || typeof chunk.initial !== 'boolean') {
        throw new Error('Production stats must include chunk IDs and files');
      }
      chunks.set(`${scope}:${chunk.id}`, {
        id: `${scope}:${chunk.id}`,
        initial: chunk.initial === true,
        files: chunk.files,
        parents: (chunk.parents ?? []).map((id) => `${scope}:${id}`),
      });
    }

    const visit = (items, parent, inheritedChunks = []) => {
      for (const item of items) {
        assertComplete(item);
        if (!item.identifier || !Array.isArray(item.chunks)) {
          throw new Error('Incomplete production stats: module identifier or chunks missing');
        }
        const id = `${scope}:${item.identifier}`;
        const ownChunks = item.chunks.map((chunk) => `${scope}:${chunk}`);
        const assignedChunks = ownChunks.length ? ownChunks : inheritedChunks;
        if (
          !parent &&
          ownChunks.length &&
          / \+ \d+ modules?$/.test(item.name ?? '') &&
          !item.modules?.length
        ) {
          throw new Error('Incomplete production stats: concatenated module contents missing');
        }
        for (const chunk of assignedChunks) {
          if (!chunks.has(chunk)) throw new Error(`Unknown chunk in production stats: ${chunk}`);
        }
        let resource = '';
        if (item.nameForCondition) {
          const absolute = slash(item.nameForCondition).split('?')[0];
          resource = slash(path.relative(root, path.resolve(buildContext, absolute)));
        }
        const record = modules.get(id) ?? {
          id,
          name: display(resource || item.name || item.identifier),
          resource,
          owner: getOwner(resource),
          moduleType: item.moduleType,
          external: item.moduleType === 'remote-module' || item.identifier.startsWith('external '),
          container: Boolean(item.modules?.length),
          chunks: new Set(),
          importers: new Set(),
          references: new Set(),
        };
        assignedChunks.forEach((chunk) => record.chunks.add(chunk));
        if (parent) record.importers.add(parent);
        for (const reason of item.reasons ?? []) {
          if (reason.active === false) continue;
          if (reason.type === 'entry' || reason.type === 'container entry') roots.add(id);
          const importer = reason.resolvedModuleIdentifier || reason.moduleIdentifier;
          if (importer) record.importers.add(`${scope}:${importer}`);
          if (reason.userRequest) record.references.add(reason.userRequest);
        }
        modules.set(id, record);
        if (item.modules) visit(item.modules, id, assignedChunks);
      }
    };
    visit(compilation.modules);
    (compilation.children ?? []).forEach((child, index) => collect(child, `${scope}.${index}`));
  };
  collect(stats, 'main');

  if (!modules.size || !chunks.size || !roots.size) {
    throw new Error('Production stats contain no auditable entry/module/chunk graph');
  }

  // Resolve one shortest active importer path from an entry to every reachable module.
  const dependents = new Map();
  for (const record of modules.values()) {
    for (const importer of record.importers) {
      if (!dependents.has(importer)) dependents.set(importer, []);
      dependents.get(importer).push(record.id);
    }
  }
  const paths = new Map([...roots].map((id) => [id, [id]]));
  const queue = [...roots];
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index];
    for (const next of dependents.get(id) ?? []) {
      if (!paths.has(next)) {
        paths.set(next, [...paths.get(id), next]);
        queue.push(next);
      }
    }
  }

  const runtimeModules = [];
  const violations = [];
  const boundaryEdges = new Map();
  let excludedModules = 0;
  for (const record of modules.values()) {
    if (record.container) continue;
    const assigned = [...record.chunks].map((id) => chunks.get(id)).filter((c) => c.files.length);
    if (!assigned.length) {
      excludedModules++;
      continue;
    }
    const module = {
      identifier: display(record.id),
      name: record.name,
      resource: record.resource || null,
      owner: record.owner,
      moduleType: record.moduleType,
      chunks: assigned.map((chunk) => chunk.id).toSorted(),
      initial: assigned.some((chunk) => chunk.initial),
    };
    runtimeModules.push(module);
    const referenceText = [record.id, ...record.references].join('\n');
    // Synthetic federation modules have no resource. Match their requested
    // package, rather than a forbidden ancestor of an allowed fallback package.
    const forbiddenReference =
      !record.resource &&
      /(?:^|[\s"'(])@odh-dashboard\/(internal|kserve)(?:[/@\s"']|$)/.test(referenceText);
    const external = record.external && !verifiedExternals.includes(record.id);
    if (forbiddenOwner(record.owner) || forbiddenReference || external) {
      const importerPath = (paths.get(record.id) ?? []).map((id) => modules.get(id).name);
      violations.push({
        ...module,
        reason: external ? 'unverified-external-runtime' : 'forbidden-runtime',
        importerPath: importerPath.filter(
          (name, index) => index === 0 || name !== importerPath[index - 1],
        ),
      });
    }
  }
  // Concatenation containers can own the incoming dependency reasons even when
  // their constituent source modules have none. Include those boundary edges too.
  for (const record of modules.values()) {
    if (!record.chunks.size || !forbiddenOwner(record.owner)) continue;
    for (const importer of record.importers) {
      const from = modules.get(importer);
      if (from && !forbiddenOwner(from.owner) && from.chunks.size) {
        const edge = { importer: from.name, module: record.name, owner: record.owner };
        boundaryEdges.set(`${edge.importer}\n${edge.module}`, edge);
      }
    }
  }
  if (!runtimeModules.length)
    throw new Error('Production stats contain no emitted runtime modules');
  const owners = {};
  for (const module of runtimeModules) {
    owners[module.owner] = (owners[module.owner] ?? 0) + 1;
  }
  return {
    schemaVersion: 1,
    ...metadata,
    buildHash: stats.hash,
    rspackVersion: stats.rspackVersion,
    boundaryPassed: violations.length === 0,
    summary: {
      runtimeModules: runtimeModules.length,
      excludedModules,
      initialChunks: [...chunks.values()].filter((chunk) => chunk.initial).length,
      lazyChunks: [...chunks.values()].filter((chunk) => !chunk.initial).length,
      violations: violations.length,
    },
    owners: Object.fromEntries(Object.entries(owners).toSorted(([a], [b]) => a.localeCompare(b))),
    chunks: [...chunks.values()],
    boundaryEdges: [...boundaryEdges.values()].toSorted(
      (a, b) => a.importer.localeCompare(b.importer) || a.module.localeCompare(b.module),
    ),
    runtimeModules: runtimeModules.toSorted((a, b) => a.identifier.localeCompare(b.identifier)),
    violations: violations.toSorted((a, b) => a.identifier.localeCompare(b.identifier)),
  };
};

/** Include the two production builds shipped together in the RHAII image. */
const auditProductionBuilds = (hostStats, remoteStats, options) => {
  if (!remoteStats?.assets?.some((asset) => asset.name === 'remoteEntry.js')) {
    throw new Error('Model Serving production statistics must include remoteEntry.js');
  }
  // Only this exact binding is backed by the remote compilation below. Unknown
  // URLs, remotes, and externals in the remote itself continue to fail closed.
  const externalIdentifiers = [`external script "modelServing@${MODEL_SERVING_REMOTE_ENTRY}"`];
  const inputs = [
    { name: 'host', stats: hostStats, context: 'distributions/rhaii' },
    { name: 'model-serving', stats: remoteStats, context: 'packages/model-serving/frontend' },
  ];
  const builds = inputs.map(({ name, stats, context }, index) => {
    const report = auditRuntime(stats, {
      ...options,
      context: path.join(options.repoRoot, context),
      verifiedExternals: index === 0 ? externalIdentifiers.map((id) => `main:${id}`) : [],
    });
    return {
      name,
      scope: `main.${index}`,
      buildConfig: `${context}/config/rspack.prod.js`,
      buildHash: report.buildHash,
      rspackVersion: report.rspackVersion,
      summary: report.summary,
      statsPath: `${name}/stats.json`,
      assetsPath: `${name}/assets/`,
    };
  });
  return auditRuntime(
    {
      errors: [],
      modules: [],
      chunks: [],
      children: [hostStats, remoteStats],
    },
    {
      ...options,
      context: options.repoRoot,
      verifiedExternals: externalIdentifiers.map((id) => `main.0:${id}`),
      metadata: { ...options.metadata, builds, modelServingRemote: MODEL_SERVING_REMOTE_ENTRY },
    },
  );
};

const renderReport = (report) => {
  const lines = [
    '# RHAII Production Runtime Audit',
    '',
    `Boundary: **${report.boundaryPassed ? 'PASS' : 'FAIL'}**`,
    '',
    `Source revision: ${report.sourceRevision ?? 'unknown'}; working tree dirty: ${
      report.workingTreeDirty ?? 'unknown'
    }.`,
  ];
  if (report.builds) {
    lines.push(
      '',
      '| Production build | Build hash | Rspack | Runtime modules | Violations |',
      '| --- | --- | --- | ---: | ---: |',
    );
    for (const build of report.builds) {
      lines.push(
        `| ${build.name} | ${build.buildHash} | ${build.rspackVersion} | ${build.summary.runtimeModules} | ${build.summary.violations} |`,
      );
    }
    lines.push('', `Audited same-origin Model Serving remote: \`${report.modelServingRemote}\`.`);
  } else {
    lines.push(`Build hash: ${report.buildHash}; Rspack: ${report.rspackVersion}.`);
  }
  lines.push(
    '',
    `${report.summary.runtimeModules} runtime modules; ${report.summary.initialChunks} initial chunks; ${report.summary.lazyChunks} lazy chunks; ${report.summary.violations} violations.`,
    `${report.summary.excludedModules} modules without emitted chunk membership excluded.`,
    '',
    '## Forbidden Runtime Owners',
    '',
    '| Owner | Modules | Initial | Lazy only |',
    '| --- | ---: | ---: | ---: |',
  );
  for (const owner of [...new Set(report.violations.map((module) => module.owner))].toSorted()) {
    const matches = report.violations.filter((module) => module.owner === owner);
    const initial = matches.filter((module) => module.initial).length;
    lines.push(`| ${owner} | ${matches.length} | ${initial} | ${matches.length - initial} |`);
  }
  lines.push(
    '',
    '## Imports Crossing The Boundary',
    '',
    '| Importer | Forbidden module |',
    '| --- | --- |',
  );
  for (const edge of report.boundaryEdges) {
    lines.push(`| \`${edge.importer}\` | \`${edge.module}\` |`);
  }
  lines.push('', '## Importer Path Examples', '');
  const exampleGroups = [
    report.violations.filter((module) => module.reason === 'unverified-external-runtime'),
    report.violations.filter(
      (module) => module.reason === 'forbidden-runtime' && !forbiddenOwner(module.owner),
    ),
    report.boundaryEdges
      .map((edge) => report.violations.find((module) => module.name === edge.module))
      .filter(Boolean),
  ].filter((group) => group.length);
  const examples = new Map();
  const exampleLimit = 10;
  for (const [index, group] of exampleGroups.entries()) {
    // Leave one slot for every later category, even when earlier groups exceed the cap.
    const groupLimit = exampleLimit - (exampleGroups.length - index - 1);
    for (const violation of group) {
      if (examples.size >= groupLimit) break;
      examples.set(violation.identifier, violation);
    }
  }
  // Also explain emitted violations for which no boundary edge was recorded.
  for (const violation of report.violations) {
    if (examples.size >= exampleLimit) break;
    examples.set(violation.identifier, violation);
  }
  for (const violation of examples.values()) {
    lines.push(
      `- \`${violation.name}\``,
      `  - ${
        violation.importerPath.length
          ? violation.importerPath.map((name) => `\`${name}\``).join(' → ')
          : 'No active entry path recorded; chunk membership still proves emission.'
      }`,
    );
  }
  lines.push(
    '',
    'The JSON report contains the complete module/chunk inventory and all violations.',
    '',
    'This build audit does not prove which chunks a browser requests or inspect code fetched from arbitrary URLs. Production browser/network validation and AKS lifecycle qualification remain required.',
    '',
  );
  return lines.join('\n');
};

module.exports = {
  STATS_OPTIONS,
  auditRuntime,
  auditProductionBuilds,
  renderReport,
  MODEL_SERVING_REMOTE_ENTRY,
};
