import { K8sAPIOptions } from '~/k8sTypes';
import {
  ListPipelineRunsResourceKF,
  ListPipelineRunJobsResourceKF,
  ListPipelinesResponseKF,
  ListExperimentsResponseKF,
  ExperimentKFv2,
  CreatePipelineRunKFData,
  CreatePipelineRunJobKFData,
  PipelinesFilterPredicate,
  ListPipelineVersionsKF,
  PipelineKFv2,
  PipelineVersionKFv2,
  PipelineCoreResourceKFv2,
  PipelineRunKFv2,
  PipelineRunJobKFv2,
  CreatePipelineAndVersionKFData,
  CreatePipelineVersionKFData,
  CreateExperimentKFData,
} from './kfTypes';

export type PipelinesFilter = {
  predicates?: PipelinesFilterPredicate[];
};

export type PipelineParams = {
  pageToken?: string;
  pageSize?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  filter?: PipelinesFilter;
};
export type PipelineParamsWithExperiments = PipelineParams & { experiment_id?: string };

export type PipelineOptions = Omit<PipelineParams, 'pageToken'> & { page?: number };
export type PipelineOptionsWithExperiments = PipelineOptions & {
  experiment_id?: string;
};

export type PipelineListPaged<T extends PipelineCoreResourceKFv2> = {
  totalSize: number;
  nextPageToken?: string;
  items: T[];
};

export type CreatePipelineVersion = (
  opts: K8sAPIOptions,
  pipelineId: string,
  data: CreatePipelineVersionKFData,
) => Promise<PipelineVersionKFv2>;
export type CreatePipelineAndVersion = (
  opts: K8sAPIOptions,
  data: CreatePipelineAndVersionKFData,
) => Promise<PipelineKFv2>;
export type CreateExperiment = (
  opts: K8sAPIOptions,
  data: CreateExperimentKFData,
) => Promise<ExperimentKFv2>;
export type CreatePipelineRun = (
  opts: K8sAPIOptions,
  data: CreatePipelineRunKFData,
) => Promise<PipelineRunKFv2>;
export type CreatePipelineRunJob = (
  opts: K8sAPIOptions,
  data: CreatePipelineRunJobKFData,
) => Promise<PipelineRunJobKFv2>;
export type GetExperiment = (opts: K8sAPIOptions, experimentId: string) => Promise<ExperimentKFv2>;
export type GetPipeline = (opts: K8sAPIOptions, pipelineId: string) => Promise<PipelineKFv2>;
export type GetPipelineRun = (
  opts: K8sAPIOptions,
  pipelineRunId: string,
) => Promise<PipelineRunKFv2>;
export type GetPipelineRunJob = (
  opts: K8sAPIOptions,
  pipelineRunJobId: string,
) => Promise<PipelineRunJobKFv2>;
export type GetPipelineVersion = (
  opts: K8sAPIOptions,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
) => Promise<PipelineVersionKFv2>;
export type DeletePipeline = (opts: K8sAPIOptions, pipelineId: string) => Promise<void>;
export type DeletePipelineRun = (opts: K8sAPIOptions, runId: string) => Promise<void>;
export type DeletePipelineRunJob = (opts: K8sAPIOptions, jobId: string) => Promise<void>;
export type DeletePipelineVersion = (
  opts: K8sAPIOptions,
  pipelineId: string,
  pipelineVersionId: string,
) => Promise<void>;
export type ListExperiments = (
  opts: K8sAPIOptions,
  params?: PipelineParams,
) => Promise<ListExperimentsResponseKF>;
export type ListPipelines = (
  opts: K8sAPIOptions,
  params?: PipelineParams,
) => Promise<ListPipelinesResponseKF>;
export type ListPipelineRuns = (
  opts: K8sAPIOptions,
  params?: PipelineParamsWithExperiments,
) => Promise<ListPipelineRunsResourceKF>;
export type ListPipelineRunJobs = (
  opts: K8sAPIOptions,
  params?: PipelineParams,
) => Promise<ListPipelineRunJobsResourceKF>;
export type ListPipelineVersions = (
  opts: K8sAPIOptions,
  pipelineId: string,
  params?: PipelineParams,
) => Promise<ListPipelineVersionsKF>;
export type UpdatePipelineRun = (opts: K8sAPIOptions, runId: string) => Promise<void>;
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
) => Promise<PipelineKFv2>;
export type UploadPipelineVersion = (
  opts: K8sAPIOptions,
  name: string,
  description: string,
  fileContents: string,
  pipelineId: string,
) => Promise<PipelineVersionKFv2>;

export type PipelineAPIs = {
  createPipelineVersion: CreatePipelineVersion;
  createPipelineAndVersion: CreatePipelineAndVersion;
  createExperiment: CreateExperiment;
  createPipelineRun: CreatePipelineRun;
  createPipelineRunJob: CreatePipelineRunJob;
  getExperiment: GetExperiment;
  getPipeline: GetPipeline;
  getPipelineRun: GetPipelineRun;
  getPipelineRunJob: GetPipelineRunJob;
  getPipelineVersion: GetPipelineVersion;
  deletePipeline: DeletePipeline;
  deletePipelineRun: DeletePipelineRun;
  deletePipelineRunJob: DeletePipelineRunJob;
  deletePipelineVersion: DeletePipelineVersion;
  listExperiments: ListExperiments;
  listPipelines: ListPipelines;
  listPipelineRuns: ListPipelineRuns;
  listPipelineActiveRuns: ListPipelineRuns;
  listPipelineArchivedRuns: ListPipelineRuns;
  listPipelineRunJobs: ListPipelineRunJobs;
  listPipelineVersions: ListPipelineVersions;
  archivePipelineRun: UpdatePipelineRun;
  unarchivePipelineRun: UpdatePipelineRun;
  stopPipelineRun: UpdatePipelineRun;
  updatePipelineRunJob: UpdatePipelineRunJob;
  uploadPipeline: UploadPipeline;
  uploadPipelineVersion: UploadPipelineVersion;
};
