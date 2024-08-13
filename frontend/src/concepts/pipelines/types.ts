import { K8sAPIOptions } from '~/k8sTypes';
import {
  ListPipelineRunsResourceKF,
  ListPipelineRecurringRunsResourceKF,
  ListPipelinesResponseKF,
  ListExperimentsResponseKF,
  ExperimentKFv2,
  CreatePipelineRunKFData,
  CreatePipelineRecurringRunKFData,
  PipelinesFilterPredicate,
  ListPipelineVersionsKF,
  PipelineKFv2,
  PipelineVersionKFv2,
  PipelineCoreResourceKFv2,
  PipelineRunKFv2,
  PipelineRecurringRunKFv2,
  CreatePipelineAndVersionKFData,
  CreatePipelineVersionKFData,
  CreateExperimentKFData,
  GoogleRpcStatusKF,
} from './kfTypes';

export type PipelinesFilter = {
  predicates?: PipelinesFilterPredicate[];
};

export type ArtifactStorage = {
  artifact_id: string;
  storage_provider: string;
  storage_path: string;
  uri: string;
  download_url?: string;
  namespace: string;
  artifact_type: string;
  artifact_size: string;
  created_at: string;
  last_updated_at: string;
  error?: GoogleRpcStatusKF;
};

export type ListArtifactResponse = {
  artifacts: ArtifactStorage[];
  next_page_token: string;
};

export type ListArtifactParams = {
  max_result_size?: number;
  order_by_field?: string;
  order_by?: 'asc' | 'desc';
  next_page_token?: string;
  namespace: string;
};

export type PipelineParams = {
  pageToken?: string;
  pageSize?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  filter?: PipelinesFilter;
};
export type PipelineRunParams = PipelineParams & {
  experimentId?: string;
  pipelineVersionId?: string;
};

export type PipelineOptions = Omit<PipelineParams, 'pageToken'> & {
  page?: number;
};
export type PipelineRunOptions = Omit<PipelineRunParams, 'pageToken'> & { page?: number };

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
export type CreatePipelineRecurringRun = (
  opts: K8sAPIOptions,
  data: CreatePipelineRecurringRunKFData,
) => Promise<PipelineRecurringRunKFv2>;
export type GetExperiment = (opts: K8sAPIOptions, experimentId: string) => Promise<ExperimentKFv2>;
export type GetArtifact = (
  opts: K8sAPIOptions,
  artifactId: number,
  view?: string,
) => Promise<ArtifactStorage>;
export type GetPipeline = (opts: K8sAPIOptions, pipelineId: string) => Promise<PipelineKFv2>;
export type GetPipelineRun = (
  opts: K8sAPIOptions,
  pipelineRunId: string,
) => Promise<PipelineRunKFv2>;
export type GetPipelineRecurringRun = (
  opts: K8sAPIOptions,
  pipelineRecurringRunId: string,
) => Promise<PipelineRecurringRunKFv2>;
export type GetPipelineVersion = (
  opts: K8sAPIOptions,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
) => Promise<PipelineVersionKFv2>;
export type DeletePipeline = (opts: K8sAPIOptions, pipelineId: string) => Promise<void>;
export type DeletePipelineRun = (opts: K8sAPIOptions, runId: string) => Promise<void>;
export type DeletePipelineRecurringRun = (
  opts: K8sAPIOptions,
  recurringRunId: string,
) => Promise<void>;
export type DeletePipelineVersion = (
  opts: K8sAPIOptions,
  pipelineId: string,
  pipelineVersionId: string,
) => Promise<void>;
export type DeleteExperiment = (opts: K8sAPIOptions, experimentId: string) => Promise<void>;
export type ListExperiments = (
  opts: K8sAPIOptions,
  params?: PipelineParams,
) => Promise<ListExperimentsResponseKF>;
export type ListArtifacts = (
  opts: K8sAPIOptions,
  params?: ListArtifactParams,
) => Promise<ListArtifactResponse>;
export type ListPipelines = (
  opts: K8sAPIOptions,
  params?: PipelineParams,
) => Promise<ListPipelinesResponseKF>;
export type ListPipelineRuns = (
  opts: K8sAPIOptions,
  params?: PipelineRunParams,
) => Promise<ListPipelineRunsResourceKF>;
export type ListPipelineRecurringRuns = (
  opts: K8sAPIOptions,
  params?: PipelineRunParams,
) => Promise<ListPipelineRecurringRunsResourceKF>;
export type ListPipelineVersions = (
  opts: K8sAPIOptions,
  pipelineId: string,
  params?: PipelineParams,
) => Promise<ListPipelineVersionsKF>;
export type UpdatePipelineRun = (opts: K8sAPIOptions, runId: string) => Promise<void>;
export type UpdatePipelineRecurringRun = (
  opts: K8sAPIOptions,
  recurringRunId: string,
  enabled: boolean,
) => Promise<void>;
export type UpdateExperiment = (opts: K8sAPIOptions, experimentId: string) => Promise<void>;
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
  createPipelineRecurringRun: CreatePipelineRecurringRun;
  getExperiment: GetExperiment;
  getPipeline: GetPipeline;
  getArtifact: GetArtifact;
  getPipelineRun: GetPipelineRun;
  getPipelineRecurringRun: GetPipelineRecurringRun;
  getPipelineVersion: GetPipelineVersion;
  deletePipeline: DeletePipeline;
  deletePipelineRun: DeletePipelineRun;
  deletePipelineRecurringRun: DeletePipelineRecurringRun;
  deletePipelineVersion: DeletePipelineVersion;
  deleteExperiment: DeleteExperiment;
  listExperiments: ListExperiments;
  listPipelines: ListPipelines;
  listArtifacts: ListArtifacts;
  listPipelineRuns: ListPipelineRuns;
  listPipelineActiveRuns: ListPipelineRuns;
  listPipelineArchivedRuns: ListPipelineRuns;
  listPipelineRecurringRuns: ListPipelineRecurringRuns;
  listPipelineVersions: ListPipelineVersions;
  archivePipelineRun: UpdatePipelineRun;
  retryPipelineRun: UpdatePipelineRun;
  unarchivePipelineRun: UpdatePipelineRun;
  archiveExperiment: UpdateExperiment;
  unarchiveExperiment: UpdateExperiment;
  stopPipelineRun: UpdatePipelineRun;
  updatePipelineRecurringRun: UpdatePipelineRecurringRun;
  uploadPipeline: UploadPipeline;
  uploadPipelineVersion: UploadPipelineVersion;
};
