import { Artifact, Execution } from '#~/third_party/mlmd';
import { getArtifactModelData } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/utils';
import {
  PluginOutputKF,
  PluginStateKF,
  PipelineRecurringRunKF,
  PipelineRunKF,
} from '#~/concepts/pipelines/kfTypes';
import { isPipelineRun } from '#~/concepts/pipelines/content/utils';
import { MlflowNestedRun } from './types';

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

export const getMlflowPluginState = (
  run: PipelineRunKF | PipelineRecurringRunKF,
): PluginStateKF | undefined => getMlflowPluginOutput(run)?.state;

export const isMlflowPluginSucceeded = (run: PipelineRunKF | PipelineRecurringRunKF): boolean =>
  getMlflowPluginState(run) === PluginStateKF.PLUGIN_SUCCEEDED;

export const isMlflowPluginFailed = (run: PipelineRunKF | PipelineRecurringRunKF): boolean =>
  getMlflowPluginState(run) === PluginStateKF.PLUGIN_FAILED;

export const isMlflowPluginPending = (run: PipelineRunKF | PipelineRecurringRunKF): boolean => {
  const state = getMlflowPluginState(run);
  return state === PluginStateKF.PLUGIN_RUNNING || state === PluginStateKF.PLUGIN_STATE_UNSPECIFIED;
};

export const getMlflowPluginFailureMessage = (
  run: PipelineRunKF | PipelineRecurringRunKF,
): string => {
  const message = getMlflowPluginOutput(run)?.state_message?.trim();
  return message || 'MLflow plugin failed for this run.';
};

export const getMlflowExperimentNameFromRun = (
  run: PipelineRunKF | PipelineRecurringRunKF,
): string | undefined => {
  // Only trust plugins_output names when the plugin succeeded — failed runs may have
  // partial/stale entries that should not drive links or labels.
  const outputName = isMlflowPluginSucceeded(run)
    ? getMlflowPluginOutput(run)?.entries.experiment_name?.value
    : undefined;
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
  // Only read plugins_output when the plugin succeeded; otherwise fall back to plugins_input.
  // Partial IDs left behind by PLUGIN_FAILED must not drive Compare / experiment links.
  if (isMlflowPluginSucceeded(run)) {
    const outputId = getMlflowPluginOutput(run)?.entries.experiment_id?.value;
    if (outputId != null) {
      return String(outputId);
    }
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
  // Guard on PLUGIN_SUCCEEDED so a failed plugin with a partial root_run_id cannot
  // route Compare Runs into a broken MLflow tracking run (RHOAIENG-65491).
  if (!isMlflowPluginSucceeded(run)) {
    return undefined;
  }
  const outputId = getMlflowPluginOutput(run)?.entries.root_run_id?.value;
  if (outputId != null) {
    return String(outputId);
  }
  return undefined;
};

export const extractMlflowNestedRuns = (
  executions: Execution[],
  rootMlflowRunId?: string,
): MlflowNestedRun[] =>
  executions.reduce<MlflowNestedRun[]>((acc, execution) => {
    const props = execution.getCustomPropertiesMap();
    const mlflowRunId = props.get('plugins.mlflow.run_id')?.getStringValue();
    const taskName = props.get('task_name')?.getStringValue();
    if (mlflowRunId && taskName && mlflowRunId !== rootMlflowRunId) {
      acc.push({ taskName, mlflowRunId });
    }
    return acc;
  }, []);
