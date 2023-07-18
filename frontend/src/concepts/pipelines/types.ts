import { K8sAPIOptions } from '~/k8sTypes';
import {
  ListPipelineRunsResourceKF,
  ListPipelineRunJobsResourceKF,
  ListPipelinesResponseKF,
  ListPipelineTemplateResourceKF,
  PipelineKF,
  PipelineRunResourceKF,
  ListExperimentsResponseKF,
  ExperimentKF,
  PipelineRunJobKF,
  CreatePipelineRunKFData,
  CreatePipelineRunJobKFData,
} from './kfTypes';

export type CreateExperiment = (
  opts: K8sAPIOptions,
  name: string,
  description: string,
) => Promise<ExperimentKF>;
export type CreatePipelineRun = (
  opts: K8sAPIOptions,
  data: CreatePipelineRunKFData,
) => Promise<PipelineRunResourceKF>;
export type CreatePipelineRunJob = (
  opts: K8sAPIOptions,
  data: CreatePipelineRunJobKFData,
) => Promise<PipelineRunJobKF>;
export type GetExperiment = (opts: K8sAPIOptions, experimentId: string) => Promise<ExperimentKF>;
export type GetPipeline = (opts: K8sAPIOptions, pipelineId: string) => Promise<PipelineKF>;
export type GetPipelineRun = (
  opts: K8sAPIOptions,
  pipelineRunId: string,
) => Promise<PipelineRunResourceKF>;
export type GetPipelineRunJob = (
  opts: K8sAPIOptions,
  pipelineRunJobId: string,
) => Promise<PipelineRunJobKF>;
export type DeletePipeline = (opts: K8sAPIOptions, pipelineId: string) => Promise<void>;
export type DeletePipelineRun = (opts: K8sAPIOptions, runId: string) => Promise<void>;
export type DeletePipelineRunJob = (opts: K8sAPIOptions, jobId: string) => Promise<void>;
export type ListExperiments = (opts) => Promise<ListExperimentsResponseKF>;
export type ListPipelines = (
  opts: K8sAPIOptions,
  limit?: number,
) => Promise<ListPipelinesResponseKF>;
export type ListPipelineRuns = (opts: K8sAPIOptions) => Promise<ListPipelineRunsResourceKF>;
export type ListPipelineRunJobs = (opts: K8sAPIOptions) => Promise<ListPipelineRunJobsResourceKF>;
export type ListPipelineRunsByPipeline = (
  opts: K8sAPIOptions,
  pipelineId: string,
  limit?: number,
) => Promise<ListPipelineRunsResourceKF>;
export type ListPipelineTemplates = (
  opts: K8sAPIOptions,
  pipelineId: string,
) => Promise<ListPipelineTemplateResourceKF>;
export type StopPipelineRun = (opts: K8sAPIOptions, runId: string) => Promise<void>;
export type UpdatePipelineRunJob = (
  opts: K8sAPIOptions,
  jobId: string,
  enabled: boolean,
) => Promise<void>;
export type UploadPipeline = (
  opts: K8sAPIOptions,
  name: string,
  description: string,
  fileContents: string,
) => Promise<PipelineKF>;

export type PipelineAPIs = {
  createExperiment: CreateExperiment;
  createPipelineRun: CreatePipelineRun;
  createPipelineRunJob: CreatePipelineRunJob;
  getExperiment: GetExperiment;
  getPipeline: GetPipeline;
  getPipelineRun: GetPipelineRun;
  getPipelineRunJob: GetPipelineRunJob;
  deletePipeline: DeletePipeline;
  deletePipelineRun: DeletePipelineRun;
  deletePipelineRunJob: DeletePipelineRunJob;
  listExperiments: ListExperiments;
  listPipelines: ListPipelines;
  listPipelineRuns: ListPipelineRuns;
  listPipelineRunJobs: ListPipelineRunJobs;
  listPipelineRunsByPipeline: ListPipelineRunsByPipeline;
  listPipelineTemplate: ListPipelineTemplates;
  stopPipelineRun: StopPipelineRun;
  updatePipelineRunJob: UpdatePipelineRunJob;
  uploadPipeline: UploadPipeline;
};
