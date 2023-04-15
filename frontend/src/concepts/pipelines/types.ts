import { K8sAPIOptions } from '~/k8sTypes';
import {
  ListPipelineRunsResourceKF,
  ListPipelinesResponseKF,
  ListPipelineTemplateResourceKF,
  PipelineKF,
} from './kfTypes';

export type GetPipeline = (opts: K8sAPIOptions, pipelineId: string) => Promise<PipelineKF>;
export type ListPipelines = (
  opts: K8sAPIOptions,
  limit?: number,
) => Promise<ListPipelinesResponseKF>;
export type ListPipelineRuns = (
  opts: K8sAPIOptions,
  pipelineId: string,
) => Promise<ListPipelineRunsResourceKF>;
export type ListPipelineTemplates = (
  opts: K8sAPIOptions,
  pipelineId: string,
) => Promise<ListPipelineTemplateResourceKF>;
export type UploadPipeline = (
  opts: K8sAPIOptions,
  name: string,
  description: string,
  fileContents: string,
) => Promise<ListPipelineRunsResourceKF>;

export type PipelineAPIs = {
  getPipeline: GetPipeline;
  listPipelines: ListPipelines;
  listPipelineRuns: ListPipelineRuns;
  listPipelineTemplate: ListPipelineTemplates;
  uploadPipeline: UploadPipeline;
};
