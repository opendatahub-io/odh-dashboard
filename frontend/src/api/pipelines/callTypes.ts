import {
  GetPipeline,
  ListPipelineRuns,
  ListPipelines,
  ListPipelineTemplates,
  UploadPipeline,
} from '~/concepts/pipelines/types';
import { K8sAPIOptions } from '~/k8sTypes';

// TODO: Determine if there is a better typing than `any` -- the caller makes the proper type
// eslint-disable-next-line
type KubeflowSpecificAPICall = (opts: K8sAPIOptions, ...args: any[]) => Promise<unknown>;
type KubeflowAPICall<ActualCall extends KubeflowSpecificAPICall> = (hostPath: string) => ActualCall;

export type GetPipelineAPI = KubeflowAPICall<GetPipeline>;
export type ListPipelinesAPI = KubeflowAPICall<ListPipelines>;
export type ListPipelineRunsAPI = KubeflowAPICall<ListPipelineRuns>;
export type ListPipelineTemplatesAPI = KubeflowAPICall<ListPipelineTemplates>;
export type UploadPipelineAPI = KubeflowAPICall<UploadPipeline>;
