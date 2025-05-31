import { Artifact } from '#~/third_party/mlmd';
import { getArtifactModelData } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/utils';

export const ALL_RUNS_METRICS_COLUMNS_STORAGE_KEY = 'all-runs-metrics-columns';

export const getMetricsColumnsLocalStorageKey = (experimentId?: string): string =>
  experimentId ? `metrics-columns-${experimentId}` : ALL_RUNS_METRICS_COLUMNS_STORAGE_KEY;

export const isPipelineRunRegistered = (artifact: Artifact[]): boolean => {
  const artifactModelData = artifact.map((a) => getArtifactModelData(a));
  return artifactModelData.some((data) => data.registeredModelName);
};
