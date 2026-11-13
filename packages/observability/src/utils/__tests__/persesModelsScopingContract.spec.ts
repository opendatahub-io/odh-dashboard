import * as fs from 'fs';
import * as path from 'path';
import { load } from 'js-yaml';

/**
 * Models PersesDashboard product pins (content contract for observability owners).
 * Kept here — not in dashboard-operator — so PromQL/datasource drift is owned by
 * this package rather than failing operator CI / requiring operator approvers.
 *
 * Disposition vs #10594: this branch already owns both halves of the scoped Models
 * story — frontend namespace expansion (NamespaceUrlSync / transform) and Models
 * DS PromQL (`vllm:*` on `data-science-prometheus-datasource`) plus the admin twin.
 * #10594 overlaps those surfaces; merge this PR and close or rebase #10594 onto it
 * rather than landing both. Tenancy GPU/CPU/quota join keys may remain on
 * `kserve_vllm:*` until #10578 (explicitly deferred by #10594).
 */

const MANIFEST_ROOT = path.resolve(__dirname, '../../../../../manifests/observability');

const MODEL_FILES = [
  'rhoai/perses-dashboard-model.yaml',
  'rhoai/perses-dashboard-model-admin.yaml',
  'odh/perses-dashboard-model.yaml',
  'odh/perses-dashboard-model-admin.yaml',
] as const;

const DS = 'data-science-prometheus-datasource';
const TENANCY = 'cluster-prometheus-tenancy-datasource';
const CLUSTER = 'cluster-prometheus-datasource';

type YamlMap = Record<string, unknown>;

const asMap = (value: unknown): YamlMap | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as YamlMap) : undefined;

const loadDashboard = (rel: string): YamlMap => {
  const raw = fs.readFileSync(path.join(MANIFEST_ROOT, rel), 'utf8');
  const doc = asMap(load(raw));
  if (!doc) {
    throw new Error(`failed to parse ${rel}`);
  }
  return doc;
};

const getVariables = (doc: YamlMap): YamlMap[] => {
  const spec = asMap(doc.spec);
  const config = asMap(spec?.config);
  const variables = config?.variables;
  return Array.isArray(variables) ? variables.map((v) => asMap(v) ?? {}) : [];
};

const findVariable = (variables: YamlMap[], name: string): YamlMap | undefined =>
  variables.find((v) => asMap(v.spec)?.name === name);

const datasourceName = (node: unknown): string | undefined => {
  const name = asMap(asMap(node)?.datasource)?.name;
  return typeof name === 'string' ? name : undefined;
};

const collectTimeSeriesQueries = (doc: YamlMap): { datasource?: string; query?: string }[] => {
  const panels = asMap(asMap(asMap(doc.spec)?.config)?.panels) ?? {};
  const out: { datasource?: string; query?: string }[] = [];
  for (const panel of Object.values(panels)) {
    // Perses panel queries are siblings of `plugin` under panel.spec (not nested in Table.spec).
    const queryList = asMap(asMap(panel)?.spec)?.queries;
    if (!Array.isArray(queryList)) {
      continue;
    }
    for (const entry of queryList) {
      const pluginMap = asMap(asMap(asMap(entry)?.spec)?.plugin);
      if (pluginMap?.kind !== 'PrometheusTimeSeriesQuery') {
        continue;
      }
      const qspec = asMap(pluginMap.spec);
      out.push({
        datasource: datasourceName(qspec),
        query: typeof qspec?.query === 'string' ? qspec.query : undefined,
      });
    }
  }
  return out;
};

describe('Models PersesDashboard scoping contract', () => {
  it.each(MODEL_FILES)('%s pins DS + tenancy correctly', (rel) => {
    const doc = loadDashboard(rel);

    expect(doc.kind).toBe('PersesDashboard');

    const variables = getVariables(doc);
    const nsVar = findVariable(variables, 'namespace');
    expect(nsVar?.kind).toBe('TextVariable');
    expect(asMap(nsVar?.spec)?.value).toBe('');
    expect(asMap(nsVar?.spec)).not.toHaveProperty('customAllValue');

    const modelVar = findVariable(variables, 'model_name');
    expect(modelVar?.kind).toBe('ListVariable');
    const modelPlugin = asMap(asMap(modelVar?.spec)?.plugin);
    const modelSpec = asMap(modelPlugin?.spec);
    expect(datasourceName(modelSpec)).toBe(DS);
    const matchers = modelSpec?.matchers;
    expect(Array.isArray(matchers) && matchers.length > 0).toBe(true);
    for (const matcher of matchers as string[]) {
      expect(matcher).not.toMatch(/namespace=/);
      expect(matcher).toMatch(/^vllm:/);
      expect(matcher).not.toMatch(/kserve_vllm:/);
    }

    const queries = collectTimeSeriesQueries(doc);
    expect(queries.length).toBeGreaterThan(0);

    const datasources = new Set(queries.map((q) => q.datasource));
    expect(datasources.has(DS)).toBe(true);
    expect(datasources.has(TENANCY)).toBe(true);
    expect(datasources.has(CLUSTER)).toBe(false);

    for (const { datasource, query } of queries) {
      expect(query).toBeTruthy();
      expect(datasource).toBeTruthy();
      expect(datasource).not.toBe(CLUSTER);
      expect(query).not.toMatch(/(exported_)?namespace\s*=~?\s*"\$\{?namespace/);

      if (datasource === DS) {
        // DS lane owns raw vllm:* (odh-observability ARCHITECTURE.md / #10594).
        expect(query).not.toMatch(/kserve_vllm:/);
        expect(query).toMatch(/vllm:/);
      }
      // Tenancy joins may still use kserve_vllm:* until #10578 — do not pin here.
    }
  });

  it.each(['rhoai', 'odh'] as const)('%s admin Models stays a twin of non-admin', (dist) => {
    const normalize = (raw: string): string =>
      raw
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
        .map((line) =>
          line === 'name: dashboard-1-model' || line === 'name: dashboard-1-model-admin'
            ? 'name: dashboard-1-model'
            : line,
        )
        .join('\n');

    const model = fs.readFileSync(
      path.join(MANIFEST_ROOT, dist, 'perses-dashboard-model.yaml'),
      'utf8',
    );
    const admin = fs.readFileSync(
      path.join(MANIFEST_ROOT, dist, 'perses-dashboard-model-admin.yaml'),
      'utf8',
    );
    expect(normalize(admin)).toEqual(normalize(model));
  });
});
