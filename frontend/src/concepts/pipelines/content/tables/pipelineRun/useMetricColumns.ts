import React from 'react';
import { useGetArtifactsByRuns } from '#~/concepts/pipelines/apiHooks/mlmd/useGetArtifactsByRuns';
import { ArtifactType, PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { getArtifactProperties } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/utils';
import { ArtifactProperty } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/types';
import { RunWithMetrics } from '#~/concepts/pipelines/content/tables/pipelineRun/types';
import { useMlmdContextsByType } from '#~/concepts/pipelines/apiHooks/mlmd/useMlmdContextsByType';
import { MlmdContextTypes } from '#~/concepts/pipelines/apiHooks/mlmd/types';
import { useColumnSelection } from '#~/components/table';
import { getMetricsColumnsLocalStorageKey } from './utils';

export const useMetricColumnNames = (
  metricsNames: Set<string>,
  experimentId?: string,
): { selectedColumns: string[]; updateSelectedColumns: (columnNames: string[]) => void } => {
  const metricsColumnsLocalStorageKey = getMetricsColumnsLocalStorageKey(experimentId);
  const availableMetrics = React.useMemo(() => [...metricsNames], [metricsNames]);
  const [firstDefaultMetricColumn, secondDefaultMetricColumn] = availableMetrics;

  // Defaults include at least 1 and no more than 2 metrics.
  const defaultMetricsColumnNames = React.useMemo(
    () => [
      ...(firstDefaultMetricColumn ? [firstDefaultMetricColumn] : []),
      ...(secondDefaultMetricColumn ? [secondDefaultMetricColumn] : []),
    ],
    [firstDefaultMetricColumn, secondDefaultMetricColumn],
  );

  const { selectedColumns, updateSelectedColumns } = useColumnSelection({
    availableColumns: availableMetrics,
    localStorageKey: metricsColumnsLocalStorageKey,
    defaultSelectedColumns: defaultMetricsColumnNames,
  });

  return { selectedColumns, updateSelectedColumns };
};

export const useMetricColumns = (
  runs: PipelineRunKF[],
  experimentId?: string,
): {
  runs: RunWithMetrics[];
  metricsColumnNames: string[];
  runArtifactsLoaded: boolean;
  contextsError: Error | undefined;
  runArtifactsError: Error | undefined;
  metricsNames: Set<string>;
  updateMetricsColumnNames: (columnNames: string[]) => void;
} => {
  const [contexts, , contextsError] = useMlmdContextsByType(MlmdContextTypes.RUN);
  const [runArtifacts, runArtifactsLoaded, runArtifactsError] = useGetArtifactsByRuns(
    runs,
    contexts,
  );
  const metricsNames = new Set<string>();

  const runsWithMetrics: RunWithMetrics[] = runs.map((run) => ({
    ...run,
    metrics: runArtifacts.reduce((acc: ArtifactProperty[], runArtifactsMap) => {
      const artifacts = Object.entries(runArtifactsMap).find(
        ([runId]) => run.run_id === runId,
      )?.[1];

      artifacts?.forEach((artifact) => {
        if (artifact.getType() === ArtifactType.METRICS) {
          const artifactProperties = getArtifactProperties(artifact);

          artifactProperties.map((artifactProp) => metricsNames.add(artifactProp.name));
          acc.push(...artifactProperties);
        }
      });

      return acc;
    }, []),
  }));

  const { selectedColumns: metricsColumnNames, updateSelectedColumns: updateMetricsColumnNames } =
    useMetricColumnNames(metricsNames, experimentId);

  return {
    runs: runsWithMetrics,
    metricsColumnNames,
    runArtifactsLoaded,
    runArtifactsError,
    contextsError,
    metricsNames,
    updateMetricsColumnNames,
  };
};
