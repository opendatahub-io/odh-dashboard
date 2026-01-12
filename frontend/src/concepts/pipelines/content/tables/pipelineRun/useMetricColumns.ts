import { useGetArtifactsByRuns } from '#~/concepts/pipelines/apiHooks/mlmd/useGetArtifactsByRuns';
import { ArtifactType, PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { getArtifactProperties } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/utils';
import { ArtifactProperty } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/types';
import { RunWithMetrics } from '#~/concepts/pipelines/content/tables/pipelineRun/types';
import { useMlmdContextsByType } from '#~/concepts/pipelines/apiHooks/mlmd/useMlmdContextsByType';
import { MlmdContextTypes } from '#~/concepts/pipelines/apiHooks/mlmd/types';

/**
 * Hook to fetch metrics data for pipeline runs.
 * Column visibility management is handled separately by useManageColumns.
 */
export const useMetricsData = (
  runs: PipelineRunKF[],
): {
  runs: RunWithMetrics[];
  runArtifactsLoaded: boolean;
  contextsError: Error | undefined;
  runArtifactsError: Error | undefined;
  metricsNames: Set<string>;
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

  return {
    runs: runsWithMetrics,
    runArtifactsLoaded,
    runArtifactsError,
    contextsError,
    metricsNames,
  };
};
