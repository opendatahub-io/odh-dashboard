import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { EitherNotBoth, ExactlyOne } from '@odh-dashboard/foundation';

/* Types pulled from https://www.kubeflow.org/docs/components/pipelines/v1/reference/api/kubeflow-pipeline-api-spec */
// TODO: Determine what is optional and what is not

/**
 * ISO Format: "{YYYY}-{MM}-{DD}T{HH}:{MM}:{SS}Z"
 */
export type DateTimeKF = string;

export enum PipelinesFilterOp {
  // Operators on scalar values. Only applies to one of |int_value|,
  // |long_value|, |string_value| or |timestamp_value|.
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_THAN_EQUALS = 'GREATER_THAN_EQUALS',
  LESS_THAN = 'LESS_THAN',
  LESS_THAN_EQUALS = 'LESS_THAN_EQUALS',

  // Checks if the value is a member of a given array, which should be one of
  // |int_values|, |long_values| or |string_values|.
  IN = 'IN',

  // Checks if the value contains |string_value| as a substring match. Only
  // applies to |string_value|.
  IS_SUBSTRING = 'IS_SUBSTRING',
}

export type PipelinesFilterPredicate = {
  operation: PipelinesFilterOp;
  key: string;
} & ExactlyOne<{
  int_value: number;
  long_value: number;
  string_value: string;
  timestamp_value: string;
  int_values: { values: number[] };
  long_values: { values: string[] };
  string_values: { values: string[] };
}>;

export type PipelineKFCallCommon<UniqueProps> = {
  total_size?: number;
  next_page_token?: string;
  // Note: if Kubeflow backend determines no results, it doesn't even give you your structure, you get an empty object
} & Partial<UniqueProps>;

export enum ArtifactType {
  ARTIFACT = 'system.Artifact',
  DATASET = 'system.Dataset',
  MODEL = 'system.Model',
  METRICS = 'system.Metrics',
  CLASSIFICATION_METRICS = 'system.ClassificationMetrics',
  SLICED_CLASSIFICATION_METRICS = 'system.SlicedClassificationMetrics',
  HTML = 'system.HTML',
  MARKDOWN = 'system.Markdown',
}

export enum ExecutionType {
  CONTAINER_EXECUTION = 'system.ContainerExecution',
  DAG_EXECUTION = 'system.DAGExecution',
}

export enum ExecutionStatus {
  UNKNOWN = 'Unknown',
  NEW = 'New',
  RUNNING = 'Running',
  COMPLETE = 'Complete',
  FAILED = 'Failed',
  CACHED = 'Cached',
  CANCELED = 'Canceled',
}

export enum RunMetricFormatKF {
  UNSPECIFIED = 'UNSPECIFIED',
  RAW = 'RAW',
  PERCENTAGE = 'PERCENTAGE',
}

export enum RecurringRunMode {
  MODE_UNSPECIFIED = 'MODE_UNSPECIFIED',
  ENABLE = 'ENABLE',
  DISABLE = 'DISABLE',
}

export enum RecurringRunStatus {
  STATUS_UNSPECIFIED = 'STATUS_UNSPECIFIED',
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

export enum StorageStateKF {
  STORAGE_STATE_UNSPECIFIED = 'STORAGE_STATE_UNSPECIFIED',
  AVAILABLE = 'AVAILABLE',
  ARCHIVED = 'ARCHIVED',
}

// https://github.com/kubeflow/pipelines/blob/0b1553eb05ea44fdf720efdc91ef71cc5ac557ea/api/v2alpha1/pipeline_spec.proto#L416
export enum InputDefinitionParameterType {
  DOUBLE = 'NUMBER_DOUBLE',
  INTEGER = 'NUMBER_INTEGER',
  BOOLEAN = 'BOOLEAN',
  STRING = 'STRING',
  LIST = 'LIST',
  STRUCT = 'STRUCT',
}

export type InputOutputArtifactType = {
  schemaTitle: ArtifactType;
  schemaVersion: string;
};

export type InputOutputDefinition = {
  artifacts?: InputOutputDefinitionArtifacts;
  parameters?: ParametersKF;
};

export type InputOutputDefinitionArtifacts = Record<
  string,
  {
    artifactType: InputOutputArtifactType;
  }
>;

type GroupNodeComponent = {
  dag: DAG;
};

type SingleNodeComponent = {
  /** @see PipelineExecutorsKF */
  executorLabel: string;
};

export type PipelineComponentKF = EitherNotBoth<GroupNodeComponent, SingleNodeComponent> & {
  inputDefinitions?: InputOutputDefinition;
  outputDefinitions?: InputOutputDefinition;
};

/**
 * Component definitions, mapped by the name of the component.
 * @see TaskKF.componentRef.name
 */
export type PipelineComponentsKF = Record<string, PipelineComponentKF | undefined>;

/**
 * High-level concept of a part of the pipeline.
 *
 * These are the items that will convert into nodes that at run have statuses.
 * Artifacts nodes do not have statuses and are not tasks, but they are bi-products of what tasks do.
 */
export type TaskKF = {
  cachingOptions?: {
    enableCache: boolean;
  };
  triggerPolicy?: {
    strategy: TriggerStrategy;
  };
  taskInfo: {
    /** Node name */
    name: string;
  };
  componentRef: {
    /** @see PipelineComponentsKF */
    name: string;
  };
  /**
   * References the name of the task id to run after
   * aka 'runAfter' from topology
   * @see DAG.tasks
   */
  dependentTasks?: string[];
  inputs?: {
    artifacts?: Record<
      string,
      EitherNotBoth<
        {
          taskOutputArtifact?: {
            /** Artifact node name */
            outputArtifactKey: string;
            /**
             * The task string for runAfter
             * @see DAG.tasks
             */
            producerTask: string;
          };
        },
        {
          componentInputArtifact: string;
        }
      >
    >;
    parameters?: Record<
      string,
      {
        /** @see PipelineSpec.root.inputDefinitions.parameters */
        componentInputParameter?: string;
        runtimeValue?: {
          constant: string;
        };
      }
    >;
  };
};

export type DAG = {
  tasks: Record<string, TaskKF>;
  outputs?: {
    artifacts?: Record<
      string,
      {
        artifactSelectors?: [
          {
            outputArtifactKey: string;
            producerSubtask: string;
          },
        ];
      }
    >;
  };
  // TODO: determine if there are more properties
};

export enum TriggerStrategy {
  TRIGGER_STRATEGY_UNSPECIFIED = 'TRIGGER_STRATEGY_UNSPECIFIED',
  ALL_UPSTREAM_TASKS_SUCCEEDED = 'ALL_UPSTREAM_TASKS_SUCCEEDED',
  ALL_UPSTREAM_TASKS_COMPLETED = 'ALL_UPSTREAM_TASKS_COMPLETED',
}

// https://github.com/kubeflow/pipelines/blob/cc971c962596afab4d5d544c466836ea3ee2656d/api/v2alpha1/pipeline_spec.proto#L197
export type ParameterKF = {
  parameterType: InputDefinitionParameterType;
  defaultValue?: RuntimeConfigParamValue;
  isOptional?: boolean;
  description?: string;
};

export type ParametersKF = Record<string, ParameterKF>;

export type PipelineExecutorKF = {
  container: {
    args?: string[];
    command?: string[];
    image: string;
  };
  pvcMount?: {
    mountPath: string;
    constant?: string;
    taskOutputParameter?: {
      outputParameterKey: string;
      producerTask: string;
    };
  }[];
};

export type PipelineExecutorsKF = Record<
  /**
   * Relationship with executorLabel under PipelineComponentKF
   * @see SingleNodeComponent
   */
  string,
  PipelineExecutorKF | undefined
>;

/**
 * IR Templates
 *
 * To read the flow:
 *  - root.dag.<task-name>; aka (task)
 *  - (task).componentRef.name => components.<component-name>; aka (component)
 *      - (component)s can be a looped dag, aka drilling
 *  - (component).executorLabel => deploymentSpec.executors.<executor-name>
 */
export type PipelineSpec = {
  /** Internal details about each node */
  components: PipelineComponentsKF;
  /** Infrastructure & execution information */
  deploymentSpec: {
    /** Details about the functionality of the execution; aka "steps" */
    executors: PipelineExecutorsKF;
  };
  pipelineInfo: {
    name: string;
  };
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
      deploymentSpec?: {
        executors?: PipelineExecutorsKF;
      };
    };
  };
};

export type PipelineSpecVolume = {
  pipeline_spec: PipelineSpec;
  platform_spec: PlatformSpec;
};

export type PipelineSpecVariable = EitherNotBoth<PipelineSpec, PipelineSpecVolume>;

export type PipelineVersionKF = PipelineCoreResourceKF & {
  pipeline_id: string;
  pipeline_version_id: string;
  pipeline_spec: PipelineSpecVariable;
  code_source_url?: string;
  package_url?: UrlKF;
  error?: GoogleRpcStatusKF;
};

export type ArgoWorkflowPipelineVersion = Omit<PipelineVersionKF, 'pipeline_spec'> & {
  pipeline_spec: K8sResourceCommon;
};

export type UrlKF = {
  pipeline_url: string;
};

export type RuntimeConfigParamValue =
  | string
  | number
  | boolean
  | object
  | Array<object>
  | undefined;
export type RuntimeConfigParameters = Record<string, RuntimeConfigParamValue>;

export type PipelineSpecRuntimeConfig = {
  parameters: RuntimeConfigParameters;
  pipeline_root?: string;
};

export type RunMetricKF = {
  /** It must between 1 and 63 characters long and must conform to the following regular expression: [a-z]([-a-z0-9]*[a-z0-9])? */
  name: string;
  node_id: string;
  number_value: number;
  format: RunMetricFormatKF;
};

export type PipelineSpecKF = {
  pipeline_id?: string;
  pipeline_name?: string;
  workflow_manifest?: string;
  pipeline_manifests?: string;
  parameters?: ParametersKF;
  runtime_config: PipelineSpecRuntimeConfig;
};

export type CronScheduleKF = {
  start_time?: DateTimeKF;
  end_time?: DateTimeKF;
  cron: string;
};

export type PeriodicScheduleKF = {
  start_time?: DateTimeKF;
  end_time?: DateTimeKF;
  interval_second: string;
};

export type TriggerKF = {
  cron_schedule?: CronScheduleKF;
  periodic_schedule?: PeriodicScheduleKF;
};

export type PipelineCoreResourceKF = {
  display_name: string;
  name?: string;
  description?: string;
  created_at: string;
};

export type GoogleRpcStatusKF = {
  code: number;
  message: string;
  details: {
    type_url: string;
    value: string;
  }[];
};

export type PipelineKF = PipelineCoreResourceKF & {
  pipeline_id: string;
  error?: GoogleRpcStatusKF;
};

export type PipelineVersionReferenceKF = {
  pipeline_id: string;
  pipeline_version_id?: string;
};

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
  CANCELED = 'Canceled',
  FAILED = 'Failed',
  CACHED = 'Cached',
  SKIPPED = 'Skipped',
  PENDING = 'Pending',
  CANCELING = 'Canceling',
}

export enum ArtifactStateKF {
  PENDING = 'Pending',
  LIVE = 'Live',
  MARKED_FOR_DELETION = 'Marked for deletion',
  DELETED = 'Deleted',
}

export const runtimeStateLabels = {
  [RuntimeStateKF.RUNTIME_STATE_UNSPECIFIED]: 'Unspecified',
  [RuntimeStateKF.PENDING]: 'Pending',
  [RuntimeStateKF.RUNNING]: 'Running',
  [RuntimeStateKF.SUCCEEDED]: 'Complete',
  [RuntimeStateKF.SKIPPED]: 'Skipped',
  [RuntimeStateKF.FAILED]: 'Failed',
  [RuntimeStateKF.CANCELING]: 'Canceling',
  [RuntimeStateKF.CANCELED]: 'Canceled',
  [RuntimeStateKF.CACHED]: 'Cached',
  [RuntimeStateKF.PAUSED]: 'Paused',
};

/**
 * @deprecated Prefer {@link PipelineTaskKF} from `GetRun(view=FULL)` or `ListTasks`.
 * Upstream KFP removed `RunDetails.task_details` (reserved field). Kept temporarily
 * for transition until all consumers migrate to `PipelineRunKF.tasks`.
 */
export type TaskDetailKF = {
  run_id: string;
  task_id: string;
  create_time: DateTimeKF;
  start_time: DateTimeKF;
  end_time: DateTimeKF;
  display_name?: string;
  execution_id?: string;
  executor_detail?: PipelineTaskExecutorDetailKF;
  state?: RuntimeStateKF;
  error?: GoogleRpcStatusKF;
  inputs?: ArtifactListKF;
  outputs?: ArtifactListKF;
  parent_task_id?: string;
  state_history?: RuntimeStatusKF[];
  child_tasks?: PipelineTaskDetailChildTask[];
};

type PipelineTaskDetailChildTask = {
  task_id?: string;
  pod_name: string;
};

type ArtifactListKF = {
  artifact_ids: string[];
};

type PipelineTaskExecutorDetailKF = {
  main_job: string;
  pre_caching_check_job: string;
  failed_main_jobs: string[];
  failed_pre_caching_check_jobs: string[];
};

export type RuntimeStatusKF = {
  update_time: DateTimeKF;
  state: RuntimeStateKF;
  error?: GoogleRpcStatusKF;
};

/**
 * @deprecated Prefer {@link PipelineRunKF.tasks}. Upstream reserved/removed
 * `task_details`; only context IDs remain on RunDetails.
 */
export type RunDetailsKF = {
  pipeline_context_id?: string;
  pipeline_run_context_id?: string;
  /** @deprecated Use `PipelineRunKF.tasks` instead. */
  task_details?: TaskDetailKF[];
};

/** View mode for GetRun / ListRuns task hydration. */
export enum RunViewModeKF {
  DEFAULT = 'DEFAULT',
  FULL = 'FULL',
}

/** Runtime state of a PipelineTask (KFP v2beta1 task APIs). */
export enum TaskStateKF {
  RUNTIME_STATE_UNSPECIFIED = 'RUNTIME_STATE_UNSPECIFIED',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
  CACHED = 'CACHED',
}

/** Structural role of a PipelineTask in the run DAG. */
export enum TaskTypeKF {
  TASK_TYPE_UNSPECIFIED = 'TASK_TYPE_UNSPECIFIED',
  ROOT = 'ROOT',
  RUNTIME = 'RUNTIME',
  CONDITION_BRANCH = 'CONDITION_BRANCH',
  CONDITION = 'CONDITION',
  LOOP = 'LOOP',
  EXIT_HANDLER = 'EXIT_HANDLER',
  IMPORTER = 'IMPORTER',
  DAG = 'DAG',
}

/** Pod role attached to a PipelineTask. */
export enum TaskPodTypeKF {
  UNSPECIFIED = 'UNSPECIFIED',
  DRIVER = 'DRIVER',
  EXECUTOR = 'EXECUTOR',
}

/**
 * Artifact type for the v2beta1 Artifact resource.
 * Distinct from {@link ArtifactType} (MLMD system.* strings).
 */
export enum PipelineArtifactTypeKF {
  TYPE_UNSPECIFIED = 'TYPE_UNSPECIFIED',
  ARTIFACT = 'Artifact',
  MODEL = 'Model',
  DATASET = 'Dataset',
  HTML = 'HTML',
  MARKDOWN = 'Markdown',
  METRIC = 'Metric',
  CLASSIFICATION_METRIC = 'ClassificationMetric',
  SLICED_CLASSIFICATION_METRIC = 'SlicedClassificationMetric',
}

/** I/O relationship between artifacts/parameters and tasks. */
export enum IOTypeKF {
  UNSPECIFIED = 'UNSPECIFIED',
  COMPONENT_DEFAULT_INPUT = 'COMPONENT_DEFAULT_INPUT',
  TASK_OUTPUT_INPUT = 'TASK_OUTPUT_INPUT',
  COMPONENT_INPUT = 'COMPONENT_INPUT',
  RUNTIME_VALUE_INPUT = 'RUNTIME_VALUE_INPUT',
  COLLECTED_INPUTS = 'COLLECTED_INPUTS',
  ITERATOR_INPUT = 'ITERATOR_INPUT',
  ITERATOR_INPUT_RAW = 'ITERATOR_INPUT_RAW',
  ITERATOR_OUTPUT = 'ITERATOR_OUTPUT',
  OUTPUT = 'OUTPUT',
  ONE_OF_OUTPUT = 'ONE_OF_OUTPUT',
  TASK_FINAL_STATUS_OUTPUT = 'TASK_FINAL_STATUS_OUTPUT',
}

/** Producer of an IO parameter/artifact (upstream task + optional loop iteration). */
export type IOProducerKF = {
  task_name: string;
  iteration?: number;
};

/** Driver/executor pod info for a PipelineTask. */
export type TaskPodKF = {
  name: string;
  uid: string;
  type: TaskPodTypeKF;
};

/** Type-specific attributes (loop iteration, importer options). */
export type TaskTypeAttributesKF = {
  iteration_index?: number;
  iteration_count?: number;
  download_to_workspace?: boolean;
};

/** Dependent child task reference. */
export type PipelineTaskChildKF = {
  task_id: string;
  name: string;
};

/** Parameter I/O entry on a PipelineTask. */
export type IOParameterKF = {
  value?: unknown;
  type: IOTypeKF;
  parameter_key: string;
  producer?: IOProducerKF;
};

/** Artifact I/O entry on a PipelineTask. */
export type IOArtifactKF = {
  artifacts: ArtifactKF[];
  type: IOTypeKF;
  artifact_key: string;
  producer?: IOProducerKF;
};

/** Inputs or outputs bundle for a PipelineTask. */
export type TaskInputOutputsKF = {
  parameters?: IOParameterKF[];
  artifacts?: IOArtifactKF[];
};

export type TaskStatusMetadataKF = {
  message?: string;
  custom_properties?: Record<string, unknown>;
};

export type TaskStatusKF = {
  update_time: DateTimeKF;
  state: TaskStateKF;
  error?: GoogleRpcStatusKF;
};

/**
 * KFP v2beta1 PipelineTask — replaces MLMD Execution for run topology.
 * Populated via `GetRun(view=FULL)`, `ListTasks`, or `GetTask`.
 */
export type PipelineTaskKF = {
  name: string;
  display_name?: string;
  task_id: string;
  run_id: string;
  pods?: TaskPodKF[];
  cache_fingerprint?: string;
  create_time?: DateTimeKF;
  end_time?: DateTimeKF;
  state?: TaskStateKF;
  status_metadata?: TaskStatusMetadataKF;
  state_history?: TaskStatusKF[];
  type?: TaskTypeKF;
  type_attributes?: TaskTypeAttributesKF;
  parent_task_id?: string;
  child_tasks?: PipelineTaskChildKF[];
  inputs?: TaskInputOutputsKF;
  outputs?: TaskInputOutputsKF;
  scope_path?: string;
};

/**
 * KFP v2beta1 Artifact resource (metadata), distinct from {@link ArtifactStorage}
 * used for download/render URLs.
 */
export type ArtifactKF = {
  artifact_id: string;
  name: string;
  description?: string;
  type: PipelineArtifactTypeKF;
  uri?: string;
  metadata?: Record<string, unknown>;
  number_value?: number;
  created_at?: DateTimeKF;
  namespace?: string;
};

/**
 * Link between an Artifact and a PipelineTask (replaces MLMD Event).
 */
export type ArtifactTaskKF = {
  id?: string;
  artifact_id: string;
  run_id: string;
  task_id: string;
  type: IOTypeKF;
  producer?: IOProducerKF;
  key?: string;
};

export type ListTasksResponseKF = PipelineKFCallCommon<{
  tasks: PipelineTaskKF[];
}>;

export type ListArtifactsResponseKF = PipelineKFCallCommon<{
  artifacts: ArtifactKF[];
}>;

export type ListArtifactTasksResponseKF = PipelineKFCallCommon<{
  artifact_tasks: ArtifactTaskKF[];
}>;

export enum MetadataValueRenderTypeKF {
  UNSPECIFIED = 'UNSPECIFIED',
  URL = 'URL',
}

export type MetadataValueKF = {
  value: unknown;
  render_type?: MetadataValueRenderTypeKF;
};

export enum PluginStateKF {
  PLUGIN_STATE_UNSPECIFIED = 'PLUGIN_STATE_UNSPECIFIED',
  PLUGIN_RUNNING = 'PLUGIN_RUNNING',
  PLUGIN_SUCCEEDED = 'PLUGIN_SUCCEEDED',
  PLUGIN_FAILED = 'PLUGIN_FAILED',
}

export type PluginOutputKF = {
  entries: Record<string, MetadataValueKF>;
  state: PluginStateKF;
  state_message?: string;
};

export type PipelineRunKF = PipelineCoreResourceKF & {
  experiment_id: string;
  run_id: string;
  storage_state: StorageStateKF;
  // run might not have a parent pipeline/version
  pipeline_version_reference?: PipelineVersionReferenceKF;
  // in lue of pipeline_version_reference, the pipeline spec is included
  pipeline_spec?: PipelineSpecVariable;
  runtime_config?: PipelineSpecRuntimeConfig;
  service_account: string;
  scheduled_at: string;
  finished_at: string;
  state: RuntimeStateKF;
  error?: GoogleRpcStatusKF;
  run_details: RunDetailsKF;
  /**
   * Populated when GetRun / ListRuns is called with `view=FULL`.
   * Canonical replacement for the removed `run_details.task_details`.
   */
  tasks?: PipelineTaskKF[];
  recurring_run_id?: string;
  state_history: object[];
  plugins_input?: Record<string, Record<string, unknown>>;
  plugins_output?: Record<string, PluginOutputKF>;
};

export type PipelineVersionReference = {
  pipeline_id: string;
  pipeline_version_id?: string;
};

export type PipelineRecurringRunKF = PipelineCoreResourceKF & {
  pipeline_spec?: PipelineSpecKF;
  service_account?: string;
  max_concurrency: string;
  trigger: TriggerKF;
  mode: RecurringRunMode;
  created_at: DateTimeKF;
  updated_at: DateTimeKF;
  status: RecurringRunStatus;
  error?: GoogleRpcStatusKF;
  no_catchup?: boolean;
  recurring_run_id: string;
  pipeline_version_reference: PipelineVersionReference;
  runtime_config?: PipelineSpecRuntimeConfig;
  namespace: string;
  experiment_id: string;
  plugins_input?: Record<string, Record<string, unknown>>;
};

export type ExperimentKF = {
  experiment_id: string;
  display_name: string;
  description: string;
  created_at: string;
  namespace?: string;
  storage_state: StorageStateKF;
  last_run_created_at: string;
};

export type ListExperimentsResponseKF = PipelineKFCallCommon<{
  experiments: ExperimentKF[];
}>;
export type ListPipelinesResponseKF = PipelineKFCallCommon<{
  pipelines: PipelineKF[];
}>;
export type ListPipelineRunsResourceKF = PipelineKFCallCommon<{
  runs: PipelineRunKF[];
}>;
export type ListPipelineRecurringRunsResourceKF = PipelineKFCallCommon<{
  recurringRuns: PipelineRecurringRunKF[];
}>;
export type ListPipelineVersionsKF = PipelineKFCallCommon<{
  pipeline_versions: PipelineVersionKF[];
}>;

export type CreatePipelineAndVersionKFData = {
  pipeline: Omit<PipelineKF, 'pipeline_id' | 'error' | 'created_at'>;
  pipeline_version: Omit<
    PipelineVersionKF,
    'pipeline_id' | 'pipeline_version_id' | 'error' | 'created_at' | 'pipeline_spec'
  >;
};

export type CreatePipelineVersionKFData = Omit<
  PipelineVersionKF,
  'pipeline_version_id' | 'error' | 'created_at' | 'pipeline_spec'
>;

export type CreateExperimentKFData = Omit<
  ExperimentKF,
  'experiment_id' | 'created_at' | 'namespace' | 'storage_state' | 'last_run_created_at'
>;
export type CreatePipelineRunKFData = Omit<
  PipelineRunKF,
  | 'run_id'
  | 'recurring_run_id'
  | 'created_at'
  | 'finished_at'
  | 'scheduled_at'
  | 'pipeline_spec'
  | 'storage_state'
  | 'error'
  | 'state'
  | 'state_history'
  | 'run_details'
  | 'plugins_output'
>;

export type CreatePipelineRecurringRunKFData = Omit<
  PipelineRecurringRunKF,
  | 'recurring_run_id'
  | 'status'
  | 'created_at'
  | 'updated_at'
  | 'scheduled_at'
  | 'pipeline_spec'
  | 'storage_state'
  | 'error'
  | 'namespace'
>;
