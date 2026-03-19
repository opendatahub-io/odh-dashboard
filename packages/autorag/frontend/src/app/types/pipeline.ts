/**
 * Subset of KFP v2beta1 types needed for AutoRAG pipeline visualization.
 * Duplicated from frontend/src/concepts/pipelines/kfTypes.ts to keep
 * the autorag package self-contained.
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum RuntimeStateKF {
  RUNTIME_STATE_UNSPECIFIED = 'RUNTIME_STATE_UNSPECIFIED',
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
  CANCELING = 'CANCELING',
  CANCELED = 'CANCELED',
  CACHED = 'CACHED',
  PAUSED = 'PAUSED',
}

export enum ExecutionStateKF {
  NEW = 'New',
  RUNNING = 'Running',
  COMPLETE = 'Complete',
  FAILED = 'Failed',
  CACHED = 'Cached',
  SKIPPED = 'Skipped',
  PENDING = 'Pending',
  CANCELING = 'Canceling',
}

export const runtimeStateLabels: Record<RuntimeStateKF, string> = {
  [RuntimeStateKF.RUNTIME_STATE_UNSPECIFIED]: 'Unspecified',
  [RuntimeStateKF.PENDING]: 'Pending',
  [RuntimeStateKF.RUNNING]: 'Running',
  [RuntimeStateKF.SUCCEEDED]: 'Succeeded',
  [RuntimeStateKF.SKIPPED]: 'Skipped',
  [RuntimeStateKF.FAILED]: 'Failed',
  [RuntimeStateKF.CANCELING]: 'Canceling',
  [RuntimeStateKF.CANCELED]: 'Canceled',
  [RuntimeStateKF.CACHED]: 'Cached',
  [RuntimeStateKF.PAUSED]: 'Paused',
};

// ─── Pipeline Spec types ────────────────────────────────────────────────────

export type InputOutputArtifactType = {
  schemaTitle: string;
  schemaVersion: string;
};

export type InputOutputDefinitionArtifacts = Record<
  string,
  { artifactType: InputOutputArtifactType }
>;

export type InputOutputDefinition = {
  artifacts?: InputOutputDefinitionArtifacts;
  parameters?: Record<string, unknown>;
};

export type TaskKF = {
  cachingOptions?: { enableCache: boolean };
  taskInfo: { name: string };
  componentRef: { name: string };
  dependentTasks?: string[];
  inputs?: {
    artifacts?: Record<
      string,
      {
        taskOutputArtifact?: { outputArtifactKey: string; producerTask: string };
        componentInputArtifact?: string;
      }
    >;
    parameters?: Record<string, unknown>;
  };
  iteratorPolicy?: { parallelismLimit: number };
  parameterIterator?: unknown;
};

export type DAG = {
  tasks: Record<string, TaskKF>;
  outputs?: unknown;
};

export type PipelineComponentKF = {
  dag?: DAG;
  executorLabel?: string;
  inputDefinitions?: InputOutputDefinition;
  outputDefinitions?: InputOutputDefinition;
};

export type PipelineComponentsKF = Record<string, PipelineComponentKF | undefined>;

export type PipelineExecutorKF = {
  container?: {
    image: string;
    command?: string[];
    args?: string[];
  };
  [key: string]: unknown;
};

export type PipelineExecutorsKF = Record<string, PipelineExecutorKF | undefined>;

export type PipelineSpec = {
  components: PipelineComponentsKF;
  deploymentSpec: { executors: PipelineExecutorsKF };
  pipelineInfo: { name: string; description?: string };
  root: {
    dag: DAG;
    inputDefinitions?: InputOutputDefinition;
    outputDefinitions?: InputOutputDefinition;
  };
  schemaVersion: string;
  sdkVersion: string;
};

export type PlatformSpec = {
  platforms: {
    kubernetes?: {
      deploymentSpec?: { executors?: PipelineExecutorsKF };
    };
  };
};

export type PipelineSpecVariable = {
  pipeline_spec?: PipelineSpec;
  platform_spec?: PlatformSpec;
} & Partial<PipelineSpec>;

// ─── Run types ──────────────────────────────────────────────────────────────

export type TaskDetailKF = {
  run_id: string;
  task_id: string;
  display_name?: string;
  create_time: string;
  start_time: string;
  end_time: string;
  execution_id?: string;
  state?: RuntimeStateKF;
  state_history?: { update_time: string; state: string }[];
  child_tasks?: { pod_name: string; task_id?: string }[];
  parent_task_id?: string;
};

export type RunDetailsKF = {
  pipeline_context_id?: string;
  pipeline_run_context_id?: string;
  task_details: TaskDetailKF[];
};

export type PipelineVersionReferenceKF = {
  pipeline_id: string;
  pipeline_version_id?: string;
};

export type PipelineRunKF = {
  experiment_id: string;
  run_id: string;
  display_name: string;
  description?: string;
  storage_state: string;
  pipeline_version_reference?: PipelineVersionReferenceKF;
  pipeline_spec?: PipelineSpecVariable;
  runtime_config?: { parameters: Record<string, unknown> };
  service_account: string;
  created_at: string;
  scheduled_at: string;
  finished_at: string;
  state: RuntimeStateKF | string;
  run_details: RunDetailsKF;
  state_history?: { update_time: string; state: string }[];
};

export type PipelineVersionKF = {
  pipeline_id: string;
  pipeline_version_id: string;
  display_name: string;
  name: string;
  created_at: string;
  pipeline_spec: PipelineSpecVariable;
};
