import { K8sAPIOptions } from '~/k8sTypes';
import { ListPipelineRunsResourceKF, ListPipelinesResponseKF } from './kfTypes';

export type ListPipelines = (
  opts: K8sAPIOptions,
  limit?: number,
) => Promise<ListPipelinesResponseKF>;
export type ListPipelineRuns = (
  opts: K8sAPIOptions,
  pipelineId: string,
) => Promise<ListPipelineRunsResourceKF>;

export type PipelineAPIs = {
  listPipelines: ListPipelines;
  listPipelineRuns: ListPipelineRuns;
};
