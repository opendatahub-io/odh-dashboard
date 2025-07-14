import {
  GetPipeline,
  DeletePipeline,
  ListPipelineRuns,
  ListPipelineRecurringRuns,
  ListPipelines,
  UploadPipeline,
  UpdatePipelineRecurringRun,
  GetPipelineRun,
  UpdatePipelineRun,
  ListExperiments,
  ListArtifacts,
  CreateExperiment,
  GetExperiment,
  CreatePipelineRun,
  CreatePipelineRecurringRun,
  GetPipelineRecurringRun,
  DeletePipelineRecurringRun,
  DeletePipelineRun,
  UploadPipelineVersion,
  GetPipelineVersion,
  DeletePipelineVersion,
  ListPipelineVersions,
  CreatePipelineAndVersion,
  CreatePipelineVersion,
  UpdateExperiment,
  DeleteExperiment,
  GetArtifact,
  GetPipelineByName,
} from '#~/concepts/pipelines/types';
import { K8sAPIOptions } from '#~/k8sTypes';

// TODO: Determine if there is a better typing than `any` -- the caller makes the proper type
// eslint-disable-next-line
type KubeflowSpecificAPICall = (opts: K8sAPIOptions, ...args: any[]) => Promise<unknown>;
type KubeflowAPICall<ActualCall extends KubeflowSpecificAPICall> = (hostPath: string) => ActualCall;

export type CreatePipelineVersionAPI = KubeflowAPICall<CreatePipelineVersion>;
export type CreatePipelineAndVersionAPI = KubeflowAPICall<CreatePipelineAndVersion>;
export type CreateExperimentAPI = KubeflowAPICall<CreateExperiment>;
export type CreatePipelineRunAPI = KubeflowAPICall<CreatePipelineRun>;
export type CreatePipelineRecurringRunAPI = KubeflowAPICall<CreatePipelineRecurringRun>;
export type GetExperimentAPI = KubeflowAPICall<GetExperiment>;
export type GetPipelineAPI = KubeflowAPICall<GetPipeline>;
export type GetPipelineByNameAPI = KubeflowAPICall<GetPipelineByName>;
export type GetArtifactAPI = KubeflowAPICall<GetArtifact>;
export type GetPipelineRunAPI = KubeflowAPICall<GetPipelineRun>;
export type GetPipelineRecurringRunAPI = KubeflowAPICall<GetPipelineRecurringRun>;
export type GetPipelineVersionAPI = KubeflowAPICall<GetPipelineVersion>;
export type DeletePipelineAPI = KubeflowAPICall<DeletePipeline>;
export type DeletePipelineRunAPI = KubeflowAPICall<DeletePipelineRun>;
export type DeletePipelineRecurringRunAPI = KubeflowAPICall<DeletePipelineRecurringRun>;
export type DeletePipelineVersionAPI = KubeflowAPICall<DeletePipelineVersion>;
export type DeleteExperimentAPI = KubeflowAPICall<DeleteExperiment>;
export type ListExperimentsAPI = KubeflowAPICall<ListExperiments>;
export type ListArtifactsAPI = KubeflowAPICall<ListArtifacts>;
export type ListPipelinesAPI = KubeflowAPICall<ListPipelines>;
export type ListPipelinesRunAPI = KubeflowAPICall<ListPipelineRuns>;
export type ListPipelineRecurringRunsAPI = KubeflowAPICall<ListPipelineRecurringRuns>;
export type ListPipelineVersionsAPI = KubeflowAPICall<ListPipelineVersions>;
export type UpdatePipelineRunAPI = KubeflowAPICall<UpdatePipelineRun>;
export type UpdatePipelineRecurringRunAPI = KubeflowAPICall<UpdatePipelineRecurringRun>;
export type UpdateExperimentAPI = KubeflowAPICall<UpdateExperiment>;
export type UploadPipelineAPI = KubeflowAPICall<UploadPipeline>;
export type UploadPipelineVersionAPI = KubeflowAPICall<UploadPipelineVersion>;
