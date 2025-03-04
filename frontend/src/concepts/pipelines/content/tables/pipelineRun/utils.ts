import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { usePipelineRunArtifactModelData } from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/usePipelineRunArtifactModelData';

export const ALL_RUNS_METRICS_COLUMNS_STORAGE_KEY = 'all-runs-metrics-columns';

export const getMetricsColumnsLocalStorageKey = (experimentId?: string): string =>
  experimentId ? `metrics-columns-${experimentId}` : ALL_RUNS_METRICS_COLUMNS_STORAGE_KEY;

export const useIsPipelineRunRegistered = (run: PipelineRunKF | null): boolean => {
  const artifactModelData = usePipelineRunArtifactModelData(run);
  return Boolean(artifactModelData?.length);
};
