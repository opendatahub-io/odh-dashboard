import { useMemo } from 'react';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import { PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { usePipelineTaskTopology } from '~/concepts/pipelines/topology';
import { useGetEventsByExecutionIds } from '~/concepts/pipelines/apiHooks/mlmd/useGetEventsByExecutionId';
import useExecutionsForPipelineRun from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/useExecutionsForPipelineRun';
import { Artifact } from '~/third_party/mlmd';
import { usePipelineRunArtifacts } from './usePipelineRunArtifacts';
import { getArtifactModelData } from './utils';
import { PipelineRunArtifactModelData } from './types';

// This hook is used to get the model artifacts for all nodes in the pipeline run
export const usePipelineRunArtifactModelData = (
  run: PipelineRunKF | null,
): PipelineRunArtifactModelData[] | undefined => {
  const [version] = usePipelineVersionById(
    run?.pipeline_version_reference?.pipeline_id,
    run?.pipeline_version_reference?.pipeline_version_id,
  );

  const pipelineSpec = version?.pipeline_spec ?? run?.pipeline_spec;
  const [executions] = useExecutionsForPipelineRun(run);
  const executionIds = useMemo(
    () => executions.map((execution) => execution.getId()),
    [executions],
  );
  const [events] = useGetEventsByExecutionIds(executionIds);
  const [artifacts] = usePipelineRunArtifacts(run);

  const nodes = usePipelineTaskTopology(
    pipelineSpec,
    run?.run_details,
    executions,
    events,
    artifacts,
  );

  return useMemo(
    () =>
      nodes.flatMap((node) => {
        const nodeArtifacts = node.data.pipelineTask?.outputs?.artifacts;
        return nodeArtifacts
          ? nodeArtifacts
              .map(({ value }: { value: Artifact }) => getArtifactModelData(value))
              .filter(Boolean)
          : [];
      }),
    [nodes],
  );
};
