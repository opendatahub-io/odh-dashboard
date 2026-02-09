import {
  MLFLOW_DEFAULT_PATH,
  MLFLOW_EXPERIMENTS_ROUTE,
  setWorkspaceQueryParam,
  WORKSPACE_QUERY_PARAM,
} from '#~/routes/pipelines/mlflowExperiments';
import { MlflowEntityType } from '#~/pages/pipelines/global/mlflowExperiments/context/MlflowEntityNamesContext';

export type BreadcrumbSegment = { label: string; path: string };
export type GetNameFn = (type: MlflowEntityType, id: string) => string | undefined;

const SEGMENT = {
  EXPERIMENTS: 'experiments',
  RUNS: 'runs',
  MODELS: 'models',
  PROMPTS: 'prompts',
  VERSIONS: 'versions',
  TRACES: 'traces',
  DATASETS: 'datasets',
  CHAT_SESSIONS: 'chat-sessions',
  EVALUATION_RUNS: 'evaluation-runs',
  ARTIFACT_PATH: 'artifactPath',
  METRIC: 'metric',
  COMPARE_RUNS: 'compare-runs',
  COMPARE_EXPERIMENTS: 'compare-experiments',
  COMPARE_MODEL_VERSIONS: 'compare-model-versions',
  OVERVIEW: 'overview',
  QUALITY: 'quality',
  TOOL_CALLS: 'tool-calls',
  JUDGES: 'judges',
};

type SegmentKey = (typeof SEGMENT)[keyof typeof SEGMENT];

const LABELS: Record<string, string> = {
  [SEGMENT.RUNS]: 'Runs',
  [SEGMENT.TRACES]: 'Traces',
  [SEGMENT.MODELS]: 'Models',
  [SEGMENT.PROMPTS]: 'Prompts',
  [SEGMENT.DATASETS]: 'Datasets',
  [SEGMENT.CHAT_SESSIONS]: 'Chat Sessions',
  [SEGMENT.EVALUATION_RUNS]: 'Evaluation Runs',
  [SEGMENT.COMPARE_RUNS]: 'Compare Runs',
  [SEGMENT.COMPARE_EXPERIMENTS]: 'Compare Experiments',
  [SEGMENT.COMPARE_MODEL_VERSIONS]: 'Compare Model Versions',
  [SEGMENT.EXPERIMENTS]: 'Experiments',
  [SEGMENT.VERSIONS]: 'Versions',
  [SEGMENT.ARTIFACT_PATH]: 'Artifacts',
  [SEGMENT.METRIC]: 'Metric',
  [SEGMENT.OVERVIEW]: 'Overview',
  [SEGMENT.QUALITY]: 'Quality',
  [SEGMENT.TOOL_CALLS]: 'Tool Calls',
  [SEGMENT.JUDGES]: 'Judges',
};

const RUN_TABS = new Set([
  'overview',
  'model-metrics',
  'system-metrics',
  'traces',
  'artifacts',
  'evaluations',
]);

const MODEL_TABS = new Set(['traces', 'artifacts']);

const getTabLabel = (tab: string): string =>
  tab in LABELS ? LABELS[tab].toLowerCase() : tab.replace(/-/g, ' ');

const SEGMENT_VALUES: readonly string[] = Object.values(SEGMENT);
const isSegmentKey = (v: string): v is SegmentKey => SEGMENT_VALUES.includes(v);

const isNumericId = (v: string): boolean => Number.isInteger(Number(v)) && !Number.isNaN(Number(v));

const toPath = (parts: string[], endIndex: number, workspace?: string): string => {
  const base = `${MLFLOW_EXPERIMENTS_ROUTE}/${parts.slice(0, endIndex).join('/')}`;
  return workspace ? setWorkspaceQueryParam(base, workspace) : base;
};

const pluralize = (word: string, count: number): string =>
  count === 1 ? word.replace(/s$/, '') : word;

const getEntityLabel = (type: MlflowEntityType, id: string, getName?: GetNameFn): string =>
  getName?.(type, id) ?? id;

const getExperimentLabel = (id: string, suffix: string, getName?: GetNameFn): string => {
  const name = getName?.('experiment', id);
  return name ? `${name}${suffix}` : `Experiment ${id}${suffix}`;
};

const parseQueryParam = (query: string | undefined, param: string): string[] => {
  if (!query) return [];
  const value = new URLSearchParams(query).get(param);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((e): e is string => typeof e === 'string') : [];
  } catch {
    return [];
  }
};

const splitPathQuery = (pathQuery: string): { path: string; query?: string } => {
  const [path, query] = pathQuery.split('?');
  return { path: path || pathQuery, query };
};

const getWorkspace = (query?: string): string | undefined =>
  query ? new URLSearchParams(query).get(WORKSPACE_QUERY_PARAM) || undefined : undefined;

const seg = (key: string, parts: string[], endIdx: number, ws?: string): BreadcrumbSegment => ({
  label: LABELS[key] || key,
  path: toPath(parts, endIdx, ws),
});

const buildFullPath = (parts: string[], query?: string, workspace?: string): string => {
  let fullPath = `${MLFLOW_EXPERIMENTS_ROUTE}/${parts.join('/')}${query ? `?${query}` : ''}`;
  if (workspace && !query?.includes(WORKSPACE_QUERY_PARAM)) {
    fullPath += `${query ? '&' : '?'}${WORKSPACE_QUERY_PARAM}=${workspace}`;
  }
  return fullPath;
};

const appendEntityWithTab = (
  crumbs: BreadcrumbSegment[],
  parts: string[],
  idx: number,
  entityType: MlflowEntityType,
  tabs: Set<string>,
  ws?: string,
  getName?: GetNameFn,
): number => {
  const id = parts[idx];
  const tabIdx = idx + 1;
  const tab = parts[tabIdx];
  if (tab === SEGMENT.ARTIFACT_PATH) {
    crumbs.push({
      label: getEntityLabel(entityType, id, getName),
      path: toPath(parts, idx + 1, ws),
    });
    crumbs.push(seg(SEGMENT.ARTIFACT_PATH, parts, tabIdx + 1, ws));
    return Math.min(tabIdx + 2, parts.length);
  }
  if (tab && tabs.has(tab)) {
    crumbs.push({
      label: `${getEntityLabel(entityType, id, getName)} ${getTabLabel(tab)}`,
      path: toPath(parts, tabIdx + 1, ws),
    });
    return tabIdx + 1;
  }

  crumbs.push({ label: getEntityLabel(entityType, id, getName), path: toPath(parts, idx + 1, ws) });
  if (tab) {
    crumbs.push({ label: tab, path: toPath(parts, tabIdx + 1, ws) });
    return tabIdx + 1;
  }
  return idx + 1;
};

const buildCompareRunsBreadcrumbs = (
  parts: string[],
  ws?: string,
  query?: string,
  getName?: GetNameFn,
): BreadcrumbSegment[] => {
  const experimentIds = parseQueryParam(query, SEGMENT.EXPERIMENTS);
  const runIds = parseQueryParam(query, SEGMENT.RUNS);
  const fullPath = buildFullPath(parts, query, ws);
  const crumbs: BreadcrumbSegment[] = [seg(SEGMENT.EXPERIMENTS, [SEGMENT.EXPERIMENTS], 1, ws)];

  if (experimentIds.length === 1) {
    const expId = experimentIds[0];
    crumbs.push({
      label: getExperimentLabel(expId, ` ${SEGMENT.RUNS}`, getName),
      path: toPath([SEGMENT.EXPERIMENTS, expId, SEGMENT.RUNS], 3, ws),
    });
    if (runIds.length > 0) {
      crumbs.push({
        label: `Comparing ${runIds.length} ${pluralize(
          LABELS[SEGMENT.RUNS],
          runIds.length,
        )} from 1 ${pluralize(LABELS[SEGMENT.EXPERIMENTS], 1)}`,
        path: fullPath,
      });
    }
  } else if (experimentIds.length > 1) {
    const expCount = experimentIds.length;
    const runCount = runIds.length;
    const expParam = encodeURIComponent(JSON.stringify(experimentIds));
    let comparePath = `${MLFLOW_EXPERIMENTS_ROUTE}/${SEGMENT.COMPARE_EXPERIMENTS}/s?${SEGMENT.EXPERIMENTS}=${expParam}`;
    if (ws) comparePath += `&${WORKSPACE_QUERY_PARAM}=${ws}`;

    crumbs.push({
      label: `Displaying ${LABELS[SEGMENT.RUNS]} from ${expCount} ${pluralize(
        LABELS[SEGMENT.EXPERIMENTS],
        expCount,
      )}`,
      path: comparePath,
    });
    crumbs.push({
      label: `Comparing ${runCount} ${pluralize(
        LABELS[SEGMENT.RUNS],
        runCount,
      )} from ${expCount} ${pluralize(LABELS[SEGMENT.EXPERIMENTS], expCount)}`,
      path: fullPath,
    });
  }
  return crumbs;
};

const buildCompareExperimentsBreadcrumbs = (
  parts: string[],
  ws?: string,
  query?: string,
): BreadcrumbSegment[] => {
  const expIds = parseQueryParam(query, SEGMENT.EXPERIMENTS);
  const label =
    expIds.length > 0
      ? `Displaying Runs from ${expIds.length} ${pluralize(
          LABELS[SEGMENT.EXPERIMENTS],
          expIds.length,
        )}`
      : '';
  return [
    seg(SEGMENT.EXPERIMENTS, [SEGMENT.EXPERIMENTS], 1, ws),
    { label, path: buildFullPath(parts, query, ws) },
  ];
};

const buildMetricBreadcrumbs = (parts: string[], idx: number, ws?: string): BreadcrumbSegment[] => [
  seg(SEGMENT.EXPERIMENTS, [SEGMENT.EXPERIMENTS], 1, ws),
  { label: parts.slice(idx + 1).join('/') || 'Metric', path: toPath(parts, parts.length, ws) },
];

const buildPromptsBreadcrumbs = (
  parts: string[],
  idx: number,
  ws?: string,
): BreadcrumbSegment[] => {
  const crumbs: BreadcrumbSegment[] = [seg(SEGMENT.PROMPTS, [SEGMENT.PROMPTS], 1, ws)];
  if (parts.length > idx + 1) {
    crumbs.push({ label: parts[idx + 1], path: toPath(parts, idx + 2, ws) });
  }
  return crumbs;
};

const buildModelsBreadcrumbs = (parts: string[], idx: number, ws?: string): BreadcrumbSegment[] => {
  const crumbs: BreadcrumbSegment[] = [seg(SEGMENT.MODELS, [SEGMENT.MODELS], 1, ws)];
  if (parts.length <= idx + 1) return crumbs;
  const modelName = parts[idx + 1];
  if (parts.length > idx + 3 && parts[idx + 2] === SEGMENT.VERSIONS) {
    crumbs.push({ label: modelName, path: toPath(parts, idx + 2, ws) });
    crumbs.push({ label: `Version ${parts[idx + 3]}`, path: toPath(parts, idx + 4, ws) });
    return crumbs;
  }
  if (parts.length > idx + 2) {
    const subpage = parts[idx + 2];
    if (MODEL_TABS.has(subpage)) {
      crumbs.push({
        label: `${modelName} ${getTabLabel(subpage)}`,
        path: toPath(parts, idx + 3, ws),
      });
      if (parts.length > idx + 3) {
        crumbs.push({ label: parts[idx + 3], path: toPath(parts, idx + 4, ws) });
      }
      return crumbs;
    }
    crumbs.push({ label: modelName, path: toPath(parts, idx + 2, ws) });
    crumbs.push({ label: subpage, path: toPath(parts, idx + 3, ws) });
    if (parts.length > idx + 3) {
      crumbs.push({ label: parts[idx + 3], path: toPath(parts, idx + 4, ws) });
    }
    return crumbs;
  }
  crumbs.push({ label: modelName, path: toPath(parts, idx + 2, ws) });
  return crumbs;
};

const buildDirectRunBreadcrumbs = (
  parts: string[],
  idx: number,
  ws?: string,
  getName?: GetNameFn,
): BreadcrumbSegment[] => {
  const crumbs: BreadcrumbSegment[] = [seg(SEGMENT.EXPERIMENTS, [SEGMENT.EXPERIMENTS], 1, ws)];
  if (parts.length > idx + 1) {
    appendEntityWithTab(crumbs, parts, idx + 1, 'run', RUN_TABS, ws, getName);
  }
  return crumbs;
};

const buildExperimentSubtreeBreadcrumbs = (
  parts: string[],
  expIdx: number,
  ws?: string,
  getName?: GetNameFn,
): BreadcrumbSegment[] => {
  if (expIdx === parts.length - 1) return [];
  const crumbs: BreadcrumbSegment[] = [seg(SEGMENT.EXPERIMENTS, parts, expIdx + 1, ws)];
  let i = expIdx + 1;
  while (i < parts.length) {
    const cur = parts[i];
    const next = parts[i + 1];
    const prev = parts[i - 1];

    if (isNumericId(cur)) {
      if (next && isSegmentKey(next)) {
        if (next === SEGMENT.OVERVIEW) {
          const subTab = parts[i + 2];
          if (subTab === SEGMENT.QUALITY || subTab === SEGMENT.TOOL_CALLS) {
            crumbs.push({
              label: getExperimentLabel(cur, ` ${LABELS[subTab].toLowerCase()}`, getName),
              path: toPath(parts, i + 3, ws),
            });
            i += 3;
            continue;
          }
        }
        crumbs.push({
          label: getExperimentLabel(cur, ` ${LABELS[next].toLowerCase()}`, getName),
          path: toPath(parts, i + 2, ws),
        });
        i += 2;
        if (i < parts.length) {
          if (next === SEGMENT.RUNS) {
            i = appendEntityWithTab(crumbs, parts, i, 'run', RUN_TABS, ws, getName);
          } else if (next === SEGMENT.MODELS) {
            i = appendEntityWithTab(crumbs, parts, i, 'loggedModel', MODEL_TABS, ws, getName);
          } else if (next === SEGMENT.CHAT_SESSIONS || next === SEGMENT.PROMPTS) {
            const type = next === SEGMENT.CHAT_SESSIONS ? 'session' : 'prompt';
            crumbs.push({
              label: getEntityLabel(type, parts[i], getName),
              path: toPath(parts, i + 1, ws),
            });
            i += 1;
          }
        }
        continue;
      }

      crumbs.push({ label: getExperimentLabel(cur, '', getName), path: toPath(parts, i + 1, ws) });
      i += 1;
      continue;
    }
    if (isSegmentKey(cur) && prev && !isNumericId(prev)) {
      crumbs.push(seg(cur, parts, i + 1, ws));

      if (i + 1 < parts.length) {
        if (cur === SEGMENT.MODELS) {
          i = appendEntityWithTab(crumbs, parts, i + 1, 'loggedModel', MODEL_TABS, ws, getName);
          continue;
        }
        if (cur === SEGMENT.CHAT_SESSIONS || cur === SEGMENT.PROMPTS) {
          const type = cur === SEGMENT.CHAT_SESSIONS ? 'session' : 'prompt';
          crumbs.push({
            label: getEntityLabel(type, parts[i + 1], getName),
            path: toPath(parts, i + 2, ws),
          });
          i += 2;
          continue;
        }
        if (cur === SEGMENT.RUNS) {
          i = appendEntityWithTab(crumbs, parts, i + 1, 'run', RUN_TABS, ws, getName);
          continue;
        }
      }
      i += 1;
      continue;
    }

    crumbs.push({ label: cur, path: toPath(parts, i + 1, ws) });
    i += 1;
  }

  return crumbs;
};

export const buildBreadcrumbsFromMlflowPathQuery = (
  pathQuery: string,
  getName?: GetNameFn,
): BreadcrumbSegment[] => {
  const { path, query } = splitPathQuery(pathQuery);
  const ws = getWorkspace(query);
  if (path === MLFLOW_DEFAULT_PATH) {
    return [];
  }
  const parts = path.split('/').filter(Boolean);
  const find = (s: string) => parts.indexOf(s);
  if (find(SEGMENT.COMPARE_RUNS) !== -1) {
    return buildCompareRunsBreadcrumbs(parts, ws, query, getName);
  }
  if (find(SEGMENT.COMPARE_EXPERIMENTS) !== -1) {
    return buildCompareExperimentsBreadcrumbs(parts, ws, query);
  }
  const metricIdx = find(SEGMENT.METRIC);
  if (metricIdx !== -1) {
    return buildMetricBreadcrumbs(parts, metricIdx, ws);
  }
  const expIdx = find(SEGMENT.EXPERIMENTS);
  const promptsIdx = find(SEGMENT.PROMPTS);
  if (promptsIdx !== -1 && (expIdx === -1 || promptsIdx < expIdx)) {
    return promptsIdx === parts.length - 1 ? [] : buildPromptsBreadcrumbs(parts, promptsIdx, ws);
  }
  const modelsIdx = find(SEGMENT.MODELS);
  if (modelsIdx !== -1 && (expIdx === -1 || modelsIdx < expIdx)) {
    return modelsIdx === parts.length - 1 ? [] : buildModelsBreadcrumbs(parts, modelsIdx, ws);
  }
  const runsIdx = find(SEGMENT.RUNS);
  if (runsIdx !== -1 && (expIdx === -1 || runsIdx < expIdx)) {
    return buildDirectRunBreadcrumbs(parts, runsIdx, ws, getName);
  }
  if (expIdx === -1 || expIdx === parts.length - 1) {
    return [];
  }
  return buildExperimentSubtreeBreadcrumbs(parts, expIdx, ws, getName);
};
