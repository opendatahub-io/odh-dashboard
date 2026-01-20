import {
  MLFLOW_DEFAULT_PATH,
  MLFLOW_EXPERIMENTS_ROUTE,
} from '#~/routes/pipelines/mlflowExperiments';
import { MlflowEntityType } from '#~/pages/pipelines/global/mlflowExperiments/context/MlflowEntityNamesContext';

export type BreadcrumbSegment = {
  label: string;
  path: string;
};

const SEGMENTS = {
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
};

type SegmentKey = (typeof SEGMENTS)[keyof typeof SEGMENTS];

const TAB_LABELS: Record<SegmentKey, string> = {
  [SEGMENTS.RUNS]: 'Runs',
  [SEGMENTS.TRACES]: 'Traces',
  [SEGMENTS.MODELS]: 'Models',
  [SEGMENTS.PROMPTS]: 'Prompts',
  [SEGMENTS.DATASETS]: 'Datasets',
  [SEGMENTS.CHAT_SESSIONS]: 'Chat Sessions',
  [SEGMENTS.EVALUATION_RUNS]: 'Evaluation Runs',
  [SEGMENTS.COMPARE_RUNS]: 'Compare Runs',
  [SEGMENTS.COMPARE_EXPERIMENTS]: 'Compare Experiments',
  [SEGMENTS.COMPARE_MODEL_VERSIONS]: 'Compare Model Versions',
  [SEGMENTS.EXPERIMENTS]: 'Experiments',
  [SEGMENTS.VERSIONS]: 'Versions',
  [SEGMENTS.ARTIFACT_PATH]: 'Artifacts',
  [SEGMENTS.METRIC]: 'Metric',
};

export type GetNameFn = (type: MlflowEntityType, id: string) => string | undefined;

const isSegmentKey = (value: string): value is SegmentKey =>
  Object.values(SEGMENTS).includes(value);

const getLabel = (type: MlflowEntityType, id: string, getName?: GetNameFn): string =>
  getName?.(type, id) ?? id;

const getExperimentLabel = (id: string, suffix: string, getName?: GetNameFn): string => {
  const name = getName?.('experiment', id);
  return name ? `${name}${suffix}` : `Experiment ${id}${suffix}`;
};

const toPath = (parts: string[], endIndex: number): string =>
  `${MLFLOW_EXPERIMENTS_ROUTE}/${parts.slice(0, endIndex).join('/')}`;

const createSegment = (
  key: SegmentKey,
  prefixOrPartsOrFullPath: string | string[],
  endIndex?: number,
): BreadcrumbSegment => {
  let path: string;
  if (Array.isArray(prefixOrPartsOrFullPath)) {
    path = endIndex ? toPath(prefixOrPartsOrFullPath, endIndex) : '';
  } else if (prefixOrPartsOrFullPath.startsWith(MLFLOW_EXPERIMENTS_ROUTE)) {
    path = prefixOrPartsOrFullPath;
  } else {
    path = `${MLFLOW_EXPERIMENTS_ROUTE}/${prefixOrPartsOrFullPath}/${key}`;
  }
  return { label: TAB_LABELS[key], path };
};

const splitPathQuery = (pathQuery: string): { path: string; query?: string } => {
  const [path, query] = pathQuery.split('?');
  return { path: path || pathQuery, query };
};

const isNumericId = (value: string): boolean => {
  const num = Number(value);
  return Number.isInteger(num) && !Number.isNaN(num);
};

const findSegment = (parts: string[], segment: string): number =>
  parts.findIndex((p) => p === segment);

const getWorkspacePrefix = (parts: string[], segmentIndex: number): string =>
  parts.slice(0, segmentIndex).join('/');

const parseExperimentIdFromQuery = (queryString?: string): string | null => {
  if (!queryString) return null;

  const params = new URLSearchParams(queryString);
  const experimentsParam = params.get(SEGMENTS.EXPERIMENTS);
  if (!experimentsParam) return null;

  try {
    const experiments = JSON.parse(experimentsParam);
    if (Array.isArray(experiments) && experiments.length > 0) {
      return String(experiments[0]);
    }
  } catch {
    // ignore
  }
  return null;
};

const buildCompareRunsBreadcrumbs = (
  parts: string[],
  query?: string,
  getName?: GetNameFn,
): BreadcrumbSegment[] => {
  const idx = findSegment(parts, SEGMENTS.COMPARE_RUNS);
  const prefix = getWorkspacePrefix(parts, idx);
  const experimentId = parseExperimentIdFromQuery(query);
  const breadcrumbs: BreadcrumbSegment[] = [createSegment(SEGMENTS.EXPERIMENTS, prefix)];

  if (experimentId) {
    breadcrumbs.push({
      label: getExperimentLabel(experimentId, ` ${SEGMENTS.RUNS}`, getName),
      path: `${MLFLOW_EXPERIMENTS_ROUTE}/${prefix}/${SEGMENTS.EXPERIMENTS}/${experimentId}/${SEGMENTS.RUNS}`,
    });
  }

  const fullPath = `${MLFLOW_EXPERIMENTS_ROUTE}/${parts.join('/')}${query ? `?${query}` : ''}`;
  breadcrumbs.push(createSegment(SEGMENTS.COMPARE_RUNS, fullPath));
  return breadcrumbs;
};

const buildCompareExperimentsBreadcrumbs = (parts: string[], idx: number): BreadcrumbSegment[] => {
  const prefix = getWorkspacePrefix(parts, idx);
  const fullPath = `${MLFLOW_EXPERIMENTS_ROUTE}/${parts.join('/')}`;
  return [
    createSegment(SEGMENTS.EXPERIMENTS, prefix),
    createSegment(SEGMENTS.COMPARE_EXPERIMENTS, fullPath),
  ];
};

const buildCompareModelVersionsBreadcrumbs = (
  parts: string[],
  idx: number,
): BreadcrumbSegment[] => {
  const prefix = getWorkspacePrefix(parts, idx);
  const fullPath = `${MLFLOW_EXPERIMENTS_ROUTE}/${parts.join('/')}`;
  return [
    createSegment(SEGMENTS.MODELS, prefix),
    createSegment(SEGMENTS.COMPARE_MODEL_VERSIONS, fullPath),
  ];
};

const buildMetricBreadcrumbs = (parts: string[], idx: number): BreadcrumbSegment[] => {
  const prefix = getWorkspacePrefix(parts, idx);
  const metricName = parts.slice(idx + 1).join('/') || 'Metric';
  return [
    createSegment(SEGMENTS.EXPERIMENTS, prefix),
    { label: metricName, path: `${MLFLOW_EXPERIMENTS_ROUTE}/${parts.join('/')}` },
  ];
};

const buildPromptsBreadcrumbs = (parts: string[], idx: number): BreadcrumbSegment[] => {
  const prefix = getWorkspacePrefix(parts, idx);
  const breadcrumbs: BreadcrumbSegment[] = [createSegment(SEGMENTS.PROMPTS, prefix)];
  if (parts.length > idx + 1) {
    const promptName = parts[idx + 1];
    breadcrumbs.push({ label: promptName, path: toPath(parts, idx + 2) });
  }
  return breadcrumbs;
};

const buildModelsBreadcrumbs = (parts: string[], idx: number): BreadcrumbSegment[] => {
  const prefix = getWorkspacePrefix(parts, idx);
  const breadcrumbs: BreadcrumbSegment[] = [createSegment(SEGMENTS.MODELS, prefix)];
  if (parts.length <= idx + 1) {
    return breadcrumbs;
  }
  const modelName = parts[idx + 1];
  breadcrumbs.push({ label: modelName, path: toPath(parts, idx + 2) });

  if (parts.length > idx + 3 && parts[idx + 2] === SEGMENTS.VERSIONS) {
    const version = parts[idx + 3];
    breadcrumbs.push({ label: `Version ${version}`, path: toPath(parts, idx + 4) });
    return breadcrumbs;
  }

  if (parts.length > idx + 2) {
    const subpage = parts[idx + 2];
    breadcrumbs.push({ label: subpage, path: toPath(parts, idx + 3) });
    if (parts.length > idx + 3) {
      const subpageName = parts[idx + 3];
      breadcrumbs.push({ label: subpageName, path: toPath(parts, idx + 4) });
    }
  }

  return breadcrumbs;
};

const buildDirectRunBreadcrumbs = (
  parts: string[],
  idx: number,
  getName?: GetNameFn,
): BreadcrumbSegment[] => {
  const prefix = getWorkspacePrefix(parts, idx);
  const breadcrumbs: BreadcrumbSegment[] = [createSegment(SEGMENTS.EXPERIMENTS, prefix)];
  if (parts.length > idx + 1) {
    const runId = parts[idx + 1];
    breadcrumbs.push({ label: getLabel('run', runId, getName), path: toPath(parts, idx + 2) });
  }

  return breadcrumbs;
};

const appendRun = (
  breadcrumbs: BreadcrumbSegment[],
  parts: string[],
  runIdx: number,
  getName?: GetNameFn,
): number => {
  const runId = parts[runIdx];
  breadcrumbs.push({ label: getLabel('run', runId, getName), path: toPath(parts, runIdx + 1) });
  const nextIdx = runIdx + 1;
  if (parts.length <= nextIdx) return nextIdx;
  const nextPart = parts[nextIdx];
  if (nextPart === SEGMENTS.ARTIFACT_PATH) {
    breadcrumbs.push(createSegment(SEGMENTS.ARTIFACT_PATH, parts, nextIdx + 1));
    return Math.min(nextIdx + 2, parts.length);
  }
  breadcrumbs.push({ label: nextPart, path: toPath(parts, nextIdx + 1) });

  return nextIdx + 1;
};

const appendLoggedModel = (
  breadcrumbs: BreadcrumbSegment[],
  parts: string[],
  modelIdx: number,
  getName?: GetNameFn,
): number => {
  const modelId = parts[modelIdx];
  breadcrumbs.push({
    label: getLabel('loggedModel', modelId, getName),
    path: toPath(parts, modelIdx + 1),
  });
  const tabIdx = modelIdx + 1;
  if (parts.length > tabIdx) {
    const tabName = parts[tabIdx];
    breadcrumbs.push({ label: tabName, path: toPath(parts, tabIdx + 1) });
    return tabIdx + 1;
  }

  return modelIdx + 1;
};

const appendSessionOrPrompt = (
  breadcrumbs: BreadcrumbSegment[],
  parts: string[],
  idIdx: number,
  type: 'session' | 'prompt',
  getName?: GetNameFn,
): number => {
  const id = parts[idIdx];
  const label = getLabel(type, id, getName);
  breadcrumbs.push({ label, path: toPath(parts, idIdx + 1) });
  return idIdx + 1;
};

const buildExperimentSubtreeBreadcrumbs = (
  parts: string[],
  experimentsIdx: number,
  getName?: GetNameFn,
): BreadcrumbSegment[] => {
  if (experimentsIdx === parts.length - 1) return [];
  const breadcrumbs: BreadcrumbSegment[] = [
    createSegment(SEGMENTS.EXPERIMENTS, parts, experimentsIdx + 1),
  ];
  let i = experimentsIdx + 1;
  while (i < parts.length) {
    const current = parts[i];
    const next = parts[i + 1];
    const prev = parts[i - 1];

    if (isNumericId(current)) {
      const experimentId = current;
      if (next && isSegmentKey(next)) {
        const tabLabel = TAB_LABELS[next].toLowerCase();
        breadcrumbs.push({
          label: getExperimentLabel(experimentId, ` ${tabLabel}`, getName),
          path: toPath(parts, i + 2),
        });
        i += 2;
        if (i < parts.length) {
          if (next === SEGMENTS.RUNS) {
            i = appendRun(breadcrumbs, parts, i, getName);
          } else if (next === SEGMENTS.MODELS) {
            i = appendLoggedModel(breadcrumbs, parts, i, getName);
          } else if (next === SEGMENTS.CHAT_SESSIONS) {
            i = appendSessionOrPrompt(breadcrumbs, parts, i, 'session', getName);
          } else if (next === SEGMENTS.PROMPTS) {
            i = appendSessionOrPrompt(breadcrumbs, parts, i, 'prompt', getName);
          }
        }
        continue;
      }
      breadcrumbs.push({
        label: getExperimentLabel(experimentId, '', getName),
        path: toPath(parts, i + 1),
      });
      i += 1;
      continue;
    }

    if (isSegmentKey(current) && prev && !isNumericId(prev)) {
      breadcrumbs.push(createSegment(current, parts, i + 1));

      if (i + 1 < parts.length) {
        if (current === SEGMENTS.MODELS) {
          i = appendLoggedModel(breadcrumbs, parts, i + 1, getName);
          continue;
        }
        if (current === SEGMENTS.CHAT_SESSIONS) {
          i = appendSessionOrPrompt(breadcrumbs, parts, i + 1, 'session', getName);
          continue;
        }
        if (current === SEGMENTS.PROMPTS) {
          i = appendSessionOrPrompt(breadcrumbs, parts, i + 1, 'prompt', getName);
          continue;
        }
      }
      i += 1;
      continue;
    }

    if (current === SEGMENTS.RUNS && prev && !isNumericId(prev)) {
      breadcrumbs.push(createSegment(SEGMENTS.RUNS, parts, i + 1));
      if (i + 1 < parts.length) {
        i = appendRun(breadcrumbs, parts, i + 1, getName);
        continue;
      }
      i += 1;
      continue;
    }

    breadcrumbs.push({ label: current, path: toPath(parts, i + 1) });
    i += 1;
  }

  return breadcrumbs;
};

export const buildBreadcrumbsFromMlflowPathQuery = (
  pathQuery: string,
  getName?: GetNameFn,
): BreadcrumbSegment[] => {
  const { path, query } = splitPathQuery(pathQuery);

  // No breadcrumbs for base path
  if (path === MLFLOW_DEFAULT_PATH) {
    return [];
  }

  const parts = path.split('/').filter(Boolean);

  const compareRunsIdx = findSegment(parts, SEGMENTS.COMPARE_RUNS);
  if (compareRunsIdx !== -1) {
    return buildCompareRunsBreadcrumbs(parts, query, getName);
  }
  const compareExperimentsIdx = findSegment(parts, SEGMENTS.COMPARE_EXPERIMENTS);
  if (compareExperimentsIdx !== -1) {
    return buildCompareExperimentsBreadcrumbs(parts, compareExperimentsIdx);
  }
  const compareModelVersionsIdx = findSegment(parts, SEGMENTS.COMPARE_MODEL_VERSIONS);
  if (compareModelVersionsIdx !== -1) {
    return buildCompareModelVersionsBreadcrumbs(parts, compareModelVersionsIdx);
  }

  const metricIdx = findSegment(parts, SEGMENTS.METRIC);
  if (metricIdx !== -1) {
    return buildMetricBreadcrumbs(parts, metricIdx);
  }

  const experimentsIdx = findSegment(parts, SEGMENTS.EXPERIMENTS);
  const promptsIdx = findSegment(parts, SEGMENTS.PROMPTS);
  if (promptsIdx !== -1 && (experimentsIdx === -1 || promptsIdx < experimentsIdx)) {
    return promptsIdx === parts.length - 1 ? [] : buildPromptsBreadcrumbs(parts, promptsIdx);
  }

  const modelsIdx = findSegment(parts, SEGMENTS.MODELS);
  if (modelsIdx !== -1 && (experimentsIdx === -1 || modelsIdx < experimentsIdx)) {
    return modelsIdx === parts.length - 1 ? [] : buildModelsBreadcrumbs(parts, modelsIdx);
  }

  const runsIdx = findSegment(parts, SEGMENTS.RUNS);
  if (runsIdx !== -1 && (experimentsIdx === -1 || runsIdx < experimentsIdx)) {
    return buildDirectRunBreadcrumbs(parts, runsIdx, getName);
  }

  if (experimentsIdx === -1 || experimentsIdx === parts.length - 1) {
    return [];
  }

  return buildExperimentSubtreeBreadcrumbs(parts, experimentsIdx, getName);
};
