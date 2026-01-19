import {
  MLFLOW_DEFAULT_PATH,
  MLFLOW_EXPERIMENTS_ROUTE,
} from '#~/routes/pipelines/mlflowExperiments.ts';

export type BreadcrumbSegment = {
  label: string;
  path: string;
};

const ROUTE_SEGMENTS = {
  COMPARE_RUNS: 'compare-runs',
  COMPARE_EXPERIMENTS: 'compare-experiments',
  COMPARE_MODEL_VERSIONS: 'compare-model-versions',
  METRIC: 'metric',
  EXPERIMENTS: 'experiments',
  PROMPTS: 'prompts',
  MODELS: 'models',
  RUNS: 'runs',
  VERSIONS: 'versions',
  ARTIFACT_PATH: 'artifactPath',
  CHAT_SESSIONS: 'chat-sessions',
  EVALUATION_RUNS: 'evaluation-runs',
  TRACES: 'traces',
  DATASETS: 'datasets',
  SEARCH: 's',
} as const;

const TAB_LABELS: Record<string, string> = {
  [ROUTE_SEGMENTS.RUNS]: 'Runs',
  [ROUTE_SEGMENTS.TRACES]: 'Traces',
  [ROUTE_SEGMENTS.MODELS]: 'Models',
  [ROUTE_SEGMENTS.EVALUATION_RUNS]: 'Evaluation Runs',
  [ROUTE_SEGMENTS.DATASETS]: 'Datasets',
  [ROUTE_SEGMENTS.CHAT_SESSIONS]: 'Chat Sessions',
  [ROUTE_SEGMENTS.PROMPTS]: 'Prompts',
  [ROUTE_SEGMENTS.SEARCH]: 'Search',
};

const seg = (label: string, path: string): BreadcrumbSegment => ({ label, path });

const splitPathQuery = (pathQuery: string): { path: string; query?: string } => {
  const [path, query] = pathQuery.split('?');
  return { path: path || pathQuery, query };
};

const isIntString = (value: string): boolean => {
  const n = Number(value);
  return Number.isInteger(Number(value)) && !Number.isNaN(n);
};

const buildPath = (pathParts: string[], endExclusive: number): string =>
  `${MLFLOW_EXPERIMENTS_ROUTE}/${pathParts.slice(0, endExclusive).join('/')}`;

const parseCompareRunsExperimentId = (queryString?: string): string | null => {
  if (!queryString) {
    return null;
  }
  const params = new URLSearchParams(queryString);
  const experimentsParam = params.get(ROUTE_SEGMENTS.EXPERIMENTS);
  if (!experimentsParam) {
    return null;
  }
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
  pathParts: string[],
  queryString?: string,
): BreadcrumbSegment[] => {
  const compareIdx = pathParts.findIndex((p) => p === ROUTE_SEGMENTS.COMPARE_RUNS);
  const workspacePrefix = pathParts.slice(0, compareIdx).join('/');
  const experimentId = parseCompareRunsExperimentId(queryString);
  const segments: BreadcrumbSegment[] = [
    seg(
      'Experiments',
      `${MLFLOW_EXPERIMENTS_ROUTE}/${workspacePrefix}/${ROUTE_SEGMENTS.EXPERIMENTS}`,
    ),
  ];

  if (experimentId) {
    segments.push(
      seg(
        `Experiment ${experimentId} runs`,
        `${MLFLOW_EXPERIMENTS_ROUTE}/${workspacePrefix}/${ROUTE_SEGMENTS.EXPERIMENTS}/${experimentId}/${ROUTE_SEGMENTS.RUNS}`,
      ),
    );
  }

  segments.push(
    seg(
      'Compare Runs',
      `${MLFLOW_EXPERIMENTS_ROUTE}/${pathParts.join('/')}${queryString ? `?${queryString}` : ''}`,
    ),
  );

  return segments;
};

const buildCompareExperimentsBreadcrumbs = (
  pathParts: string[],
  compareIdx: number,
): BreadcrumbSegment[] => {
  const workspacePrefix = pathParts.slice(0, compareIdx).join('/');
  return [
    seg(
      'Experiments',
      `${MLFLOW_EXPERIMENTS_ROUTE}/${workspacePrefix}/${ROUTE_SEGMENTS.EXPERIMENTS}`,
    ),
    seg('Compare Experiments', `${MLFLOW_EXPERIMENTS_ROUTE}/${pathParts.join('/')}`),
  ];
};

const buildCompareModelVersionsBreadcrumbs = (
  pathParts: string[],
  compareIdx: number,
): BreadcrumbSegment[] => {
  const workspacePrefix = pathParts.slice(0, compareIdx).join('/');
  return [
    seg('Models', `${MLFLOW_EXPERIMENTS_ROUTE}/${workspacePrefix}/${ROUTE_SEGMENTS.MODELS}`),
    seg('Compare Versions', `${MLFLOW_EXPERIMENTS_ROUTE}/${pathParts.join('/')}`),
  ];
};

const buildMetricBreadcrumbs = (pathParts: string[], metricIdx: number): BreadcrumbSegment[] => {
  const workspacePrefix = pathParts.slice(0, metricIdx).join('/');
  const metricLabel = pathParts.slice(metricIdx + 1).join('/') || 'Metric';

  return [
    seg(
      'Experiments',
      `${MLFLOW_EXPERIMENTS_ROUTE}/${workspacePrefix}/${ROUTE_SEGMENTS.EXPERIMENTS}`,
    ),
    seg(metricLabel, `${MLFLOW_EXPERIMENTS_ROUTE}/${pathParts.join('/')}`),
  ];
};

const buildPromptsBreadcrumbs = (pathParts: string[], promptsIdx: number): BreadcrumbSegment[] => {
  const workspacePrefix = pathParts.slice(0, promptsIdx).join('/');

  const segments: BreadcrumbSegment[] = [
    seg('Prompts', `${MLFLOW_EXPERIMENTS_ROUTE}/${workspacePrefix}/${ROUTE_SEGMENTS.PROMPTS}`),
  ];

  if (pathParts.length > promptsIdx + 1) {
    const promptName = pathParts[promptsIdx + 1];
    segments.push(
      seg(
        promptName,
        `${MLFLOW_EXPERIMENTS_ROUTE}/${pathParts.slice(0, promptsIdx + 2).join('/')}`,
      ),
    );
  }

  return segments;
};

const buildModelsBreadcrumbs = (pathParts: string[], modelsIdx: number): BreadcrumbSegment[] => {
  const workspacePrefix = pathParts.slice(0, modelsIdx).join('/');

  const segments: BreadcrumbSegment[] = [
    seg('Models', `${MLFLOW_EXPERIMENTS_ROUTE}/${workspacePrefix}/${ROUTE_SEGMENTS.MODELS}`),
  ];

  if (pathParts.length <= modelsIdx + 1) return segments;

  const modelName = pathParts[modelsIdx + 1];
  segments.push(
    seg(modelName, `${MLFLOW_EXPERIMENTS_ROUTE}/${pathParts.slice(0, modelsIdx + 2).join('/')}`),
  );

  if (pathParts.length > modelsIdx + 3 && pathParts[modelsIdx + 2] === ROUTE_SEGMENTS.VERSIONS) {
    const version = pathParts[modelsIdx + 3];
    segments.push(
      seg(
        `Version ${version}`,
        `${MLFLOW_EXPERIMENTS_ROUTE}/${pathParts.slice(0, modelsIdx + 4).join('/')}`,
      ),
    );
    return segments;
  }

  if (pathParts.length > modelsIdx + 2) {
    const subpage = pathParts[modelsIdx + 2];
    segments.push(
      seg(subpage, `${MLFLOW_EXPERIMENTS_ROUTE}/${pathParts.slice(0, modelsIdx + 3).join('/')}`),
    );

    if (pathParts.length > modelsIdx + 3) {
      const subpageName = pathParts[modelsIdx + 3];
      segments.push(
        seg(
          subpageName,
          `${MLFLOW_EXPERIMENTS_ROUTE}/${pathParts.slice(0, modelsIdx + 4).join('/')}`,
        ),
      );
    }
  }

  return segments;
};

const buildDirectRunBreadcrumbs = (pathParts: string[], runsIdx: number): BreadcrumbSegment[] => {
  const workspacePrefix = pathParts.slice(0, runsIdx).join('/');

  const segments: BreadcrumbSegment[] = [
    seg(
      'Experiments',
      `${MLFLOW_EXPERIMENTS_ROUTE}/${workspacePrefix}/${ROUTE_SEGMENTS.EXPERIMENTS}`,
    ),
  ];

  if (pathParts.length > runsIdx + 1) {
    const runUuid = pathParts[runsIdx + 1];
    segments.push(
      seg(runUuid, `${MLFLOW_EXPERIMENTS_ROUTE}/${pathParts.slice(0, runsIdx + 2).join('/')}`),
    );
  }

  return segments;
};

const appendRunDetails = (
  segments: BreadcrumbSegment[],
  pathParts: string[],
  runUuidIdx: number,
): number => {
  const runUuid = pathParts[runUuidIdx];
  segments.push(seg(runUuid, buildPath(pathParts, runUuidIdx + 1)));
  const subIdx = runUuidIdx + 1;
  if (pathParts.length <= subIdx) return subIdx;
  const subPart = pathParts[subIdx];
  if (subPart === ROUTE_SEGMENTS.ARTIFACT_PATH) {
    segments.push(seg('Artifacts', buildPath(pathParts, subIdx + 1)));
    return Math.min(subIdx + 2, pathParts.length);
  }
  segments.push(seg(subPart, buildPath(pathParts, subIdx + 1)));
  return subIdx + 1;
};

const appendModelDetails = (
  segments: BreadcrumbSegment[],
  pathParts: string[],
  loggedModelIdIdx: number,
): number => {
  const loggedModelId = pathParts[loggedModelIdIdx];
  segments.push(seg(loggedModelId, buildPath(pathParts, loggedModelIdIdx + 1)));
  const tabNameIdx = loggedModelIdIdx + 1;
  if (pathParts.length > tabNameIdx) {
    const tabName = pathParts[tabNameIdx];
    segments.push(seg(tabName, buildPath(pathParts, tabNameIdx + 1)));
    return tabNameIdx + 1;
  }
  return loggedModelIdIdx + 1;
};

const appendSingleId = (
  segments: BreadcrumbSegment[],
  pathParts: string[],
  idIdx: number,
): number => {
  segments.push(seg(pathParts[idIdx], buildPath(pathParts, idIdx + 1)));
  return idIdx + 1;
};

const buildExperimentsSubtreeBreadcrumbs = (
  pathParts: string[],
  experimentsIdx: number,
): BreadcrumbSegment[] => {
  if (experimentsIdx === pathParts.length - 1) return [];
  const segments: BreadcrumbSegment[] = [
    seg('Experiments', buildPath(pathParts, experimentsIdx + 1)),
  ];
  let i = experimentsIdx + 1;
  while (i < pathParts.length) {
    const part = pathParts[i];

    if (isIntString(part)) {
      const experimentId = part;
      const tab = pathParts[i + 1];
      if (tab && TAB_LABELS[tab]) {
        segments.push(
          seg(
            `Experiment ${experimentId} ${TAB_LABELS[tab].toLowerCase()}`,
            buildPath(pathParts, i + 2),
          ),
        );
        i += 2;
        if (tab === ROUTE_SEGMENTS.RUNS && i < pathParts.length) {
          i = appendRunDetails(segments, pathParts, i);
          continue;
        }

        if (tab === ROUTE_SEGMENTS.MODELS && i < pathParts.length) {
          i = appendModelDetails(segments, pathParts, i);
          continue;
        }
        if (
          (tab === ROUTE_SEGMENTS.CHAT_SESSIONS || tab === ROUTE_SEGMENTS.PROMPTS) &&
          i < pathParts.length
        ) {
          i = appendSingleId(segments, pathParts, i);
          continue;
        }
        continue;
      }
      segments.push(seg(`Experiment ${experimentId}`, buildPath(pathParts, i + 1)));
      i += 1;
      continue;
    }
    if (TAB_LABELS[part] && !isIntString(pathParts[i - 1] ?? '')) {
      segments.push(seg(TAB_LABELS[part], buildPath(pathParts, i + 1)));
      if (part === ROUTE_SEGMENTS.MODELS && i + 1 < pathParts.length) {
        i = appendModelDetails(segments, pathParts, i + 1);
        continue;
      }
      if (
        (part === ROUTE_SEGMENTS.CHAT_SESSIONS || part === ROUTE_SEGMENTS.PROMPTS) &&
        i + 1 < pathParts.length
      ) {
        i = appendSingleId(segments, pathParts, i + 1);
        continue;
      }
      i += 1;
      continue;
    }
    if (part === ROUTE_SEGMENTS.RUNS && !isIntString(pathParts[i - 1] ?? '')) {
      segments.push(seg('Runs', buildPath(pathParts, i + 1)));
      if (i + 1 < pathParts.length) {
        i = appendRunDetails(segments, pathParts, i + 1);
        continue;
      }
      i += 1;
      continue;
    }
    segments.push(seg(part, buildPath(pathParts, i + 1)));
    i += 1;
  }
  return segments;
};

export const buildBreadcrumbsFromMlflowPathQuery = (pathQuery: string): BreadcrumbSegment[] => {
  const { path, query } = splitPathQuery(pathQuery);
  if (path === MLFLOW_DEFAULT_PATH) {
    return [];
  }
  const pathParts = path.split('/').filter(Boolean);

  const compareRunsIdx = pathParts.findIndex((p) => p === ROUTE_SEGMENTS.COMPARE_RUNS);
  if (compareRunsIdx !== -1) {
    return buildCompareRunsBreadcrumbs(pathParts, query);
  }

  const compareExperimentsIdx = pathParts.findIndex(
    (p) => p === ROUTE_SEGMENTS.COMPARE_EXPERIMENTS,
  );
  if (compareExperimentsIdx !== -1) {
    return buildCompareExperimentsBreadcrumbs(pathParts, compareExperimentsIdx);
  }
  const compareModelVersionsIdx = pathParts.findIndex(
    (p) => p === ROUTE_SEGMENTS.COMPARE_MODEL_VERSIONS,
  );
  if (compareModelVersionsIdx !== -1) {
    return buildCompareModelVersionsBreadcrumbs(pathParts, compareModelVersionsIdx);
  }

  const metricIdx = pathParts.findIndex((p) => p === ROUTE_SEGMENTS.METRIC);
  if (metricIdx !== -1) {
    return buildMetricBreadcrumbs(pathParts, metricIdx);
  }

  const experimentsIdx = pathParts.findIndex((p) => p === ROUTE_SEGMENTS.EXPERIMENTS);

  const promptsIdx = pathParts.findIndex((p) => p === ROUTE_SEGMENTS.PROMPTS);
  if (promptsIdx !== -1 && (experimentsIdx === -1 || promptsIdx < experimentsIdx)) {
    if (promptsIdx === pathParts.length - 1) {
      return [];
    }
    return buildPromptsBreadcrumbs(pathParts, promptsIdx);
  }

  const modelsIdx = pathParts.findIndex((p) => p === ROUTE_SEGMENTS.MODELS);
  if (modelsIdx !== -1 && (experimentsIdx === -1 || modelsIdx < experimentsIdx)) {
    if (modelsIdx === pathParts.length - 1) {
      return [];
    }
    return buildModelsBreadcrumbs(pathParts, modelsIdx);
  }

  const runsIdx = pathParts.findIndex((p) => p === ROUTE_SEGMENTS.RUNS);
  if (runsIdx !== -1 && (experimentsIdx === -1 || runsIdx < experimentsIdx)) {
    return buildDirectRunBreadcrumbs(pathParts, runsIdx);
  }

  if (experimentsIdx === -1 || experimentsIdx === pathParts.length - 1) {
    return [];
  }

  return buildExperimentsSubtreeBreadcrumbs(pathParts, experimentsIdx);
};
