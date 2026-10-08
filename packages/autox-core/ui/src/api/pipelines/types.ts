import type { PipelineSpecVariable, RuntimeStateKF } from './kfTypes';

/** Pipeline reference embedded in a run (API schema). */
export type PipelineVersionReference = {
  pipeline_id: string;
  pipeline_version_id: string;
};

/**
 * Runtime parameters a pipeline run was submitted with.
 *
 * Generic over `TParams` because AutoML's BFF returns a strongly-typed
 * `ConfigureSchema` shape here while AutoRAG's is a loosely-validated bag of
 * unknown values — instantiate with a product's own parameters type where
 * that distinction matters (e.g. `PipelineRunRuntimeConfig<ConfigureSchema>`),
 * or leave the default for callers that only need the untyped shape.
 */
export type PipelineRunRuntimeConfig<TParams = Record<string, unknown>> = {
  parameters?: TParams;
  pipeline_root?: string;
};

export type PipelineRunErrorDetail = {
  '@type'?: string;
  type_url?: string;
  value?: string;
  [key: string]: unknown;
};

export type PipelineRunError = {
  code: number;
  message: string;
  details?: PipelineRunErrorDetail[];
};

export type PipelineSpec = PipelineSpecVariable;

export type PipelineRunTaskDetail = {
  run_id?: string;
  task_id: string;
  display_name?: string;
  create_time?: string;
  start_time?: string;
  end_time?: string;
  state?: string;
  execution_id?: string;
  child_tasks?: { pod_name?: string; task_id?: string }[];
  error?: PipelineRunError;
};

export type PipelineRunDetails = {
  task_details?: PipelineRunTaskDetail[];
};

export type PipelineRunStateHistoryEntry = {
  update_time: string;
  state?: string;
};

/** See `PipelineRunRuntimeConfig`'s doc comment for why this is generic over `TParams`. */
export type PipelineRun<TParams = Record<string, unknown>> = {
  run_id: string;
  display_name: string;
  created_at: string;
  state: '' | `${RuntimeStateKF}`;
  experiment_id?: string;
  storage_state?: string;
  description?: string;
  pipeline_version_id?: string;
  pipeline_spec?: PipelineSpec;
  pipeline_version_reference?: PipelineVersionReference;
  runtime_config?: PipelineRunRuntimeConfig<TParams>;
  service_account?: string;
  scheduled_at?: string;
  finished_at?: string;
  error?: PipelineRunError;
  state_history?: PipelineRunStateHistoryEntry[];
  run_details?: PipelineRunDetails;
};

/** Response shape from BFF pipeline-runs API. Exported for hooks/tables that need pagination. */
export type PipelineRunsData<TParams = Record<string, unknown>> = {
  runs: PipelineRun<TParams>[];
  total_size: number;
  next_page_token: string;
};

export type GetPipelineRunsFromBFFParams = {
  namespace: string;
  pipelineVersionId?: string;
  pageSize?: number;
  page?: number;
};
