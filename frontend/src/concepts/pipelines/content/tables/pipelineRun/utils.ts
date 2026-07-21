import { Artifact } from '#~/third_party/mlmd';
import { getArtifactModelData } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/utils';
import {
  PluginOutputKF,
  PipelineRecurringRunKF,
  PipelineRunKF,
} from '#~/concepts/pipelines/kfTypes';
import { isPipelineRun } from '#~/concepts/pipelines/content/utils';

export const ALL_RUNS_METRICS_COLUMNS_STORAGE_KEY = 'all-runs-metrics-columns';

export const getMlflowPluginOutput = (
  run: PipelineRunKF | PipelineRecurringRunKF,
): PluginOutputKF | undefined => {
  if (!isPipelineRun(run)) {
    return undefined;
  }
  const output = run.plugins_output;
  if (!output) {
    return undefined;
  }
  // ODH/RHOAI returns "MLflow"; upstream KFP returns "mlflow" — prefer lowercase when both are present
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return output.mlflow || output.MLflow;
};

export const getMlflowExperimentNameFromRun = (
  run: PipelineRunKF | PipelineRecurringRunKF,
): string | undefined => {
  const outputName = getMlflowPluginOutput(run)?.entries.experiment_name?.value;
  const name = outputName ?? run.plugins_input?.mlflow?.experiment_name;
  return typeof name === 'string' ? name.trim() || undefined : undefined;
};

export const filterByMlflowExperiment = <T extends PipelineRunKF | PipelineRecurringRunKF>(
  runs: T[],
  filter: string | undefined,
): T[] => {
  const normalized = filter?.trim().toLowerCase();
  if (!normalized) {
    return runs;
  }
  return runs.filter((run) => {
    const name = getMlflowExperimentNameFromRun(run);
    return !!name && name.toLowerCase() === normalized;
  });
};

export const getMetricsColumnsLocalStorageKey = (experimentId?: string): string =>
  experimentId ? `metrics-columns-${experimentId}` : ALL_RUNS_METRICS_COLUMNS_STORAGE_KEY;

export const isPipelineRunRegistered = (artifact: Artifact[]): boolean => {
  const artifactModelData = artifact.map((a) => getArtifactModelData(a));
  return artifactModelData.some((data) => data.registeredModelName);
};

export const getMlflowExperimentId = (run: PipelineRunKF): string | undefined => {
  const outputEntry = getMlflowPluginOutput(run)?.entries;
  const outputId = outputEntry?.experiment_id?.value;
  if (outputId != null) {
    return String(outputId);
  }
  const inputId = run.plugins_input?.mlflow?.experiment_id;
  if (inputId != null) {
    return String(inputId);
  }
  return undefined;
};

// root_run_id is only populated in plugins_output after the backend creates the MLflow run.
// Unlike experiment_id, there is no plugins_input equivalent to fall back to.
export const getMlflowRunId = (run: PipelineRunKF): string | undefined => {
  const outputEntry = getMlflowPluginOutput(run)?.entries;
  const outputId = outputEntry?.root_run_id?.value;
  if (outputId != null) {
    return String(outputId);
  }
  return undefined;
};
