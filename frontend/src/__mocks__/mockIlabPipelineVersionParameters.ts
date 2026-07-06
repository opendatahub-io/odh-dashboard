import { InputDefinitionParameterType } from '#~/concepts/pipelines/kfTypes';
import { KnownFineTuningPipelineParameters } from '#~/pages/pipelines/global/modelCustomization/const';

export const mockIlabPipelineVersionParameters = {
  [KnownFineTuningPipelineParameters.EVAL_GPU_IDENTIFIER]: {
    defaultValue: 'nvidia.com/gpu',
    description:
      'General evaluation parameter. The GPU type used for training pods, e.g. nvidia.com/gpu',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.EVAL_JUDGE_SECRET]: {
    defaultValue: 'judge-secret',
    description:
      'General evaluation parameter: The name of the k8s secret key holding access credentials to the judge server.',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.K8S_STORAGE_CLASS_NAME]: {
    defaultValue: 'standard',
    description:
      'A Kubernetes StorageClass name for persistent volumes. Selected StorageClass must support RWX PersistentVolumes.',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.SDG_BASE_MODEL]: {
    description:
      'SDG parameter. LLM model used to generate the synthetic dataset. E.g. "s3://\u003cBUCKET\u003e/\u003cPATH_TO_MODEL\u003e"',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.SDG_PIPELINE]: {
    defaultValue: '/usr/share/instructlab/sdg/pipelines/agentic',
    description:
      "SDG parameter. Data generation pipeline to use. Available: 'simple', 'full', or a valid path to a directory of pipeline workflow YAML files. Note that 'full' requires a larger teacher model, Mixtral-8x7b.",
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.SDG_REPO_BRANCH]: {
    description:
      'SDG parameter. Points to a branch within the taxonomy git repository. If set, has priority over sdg_repo_pr',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.SDG_REPO_SECRET]: {
    defaultValue: 'taxonomy-repo-secret',
    description:
      'SDG parameter. The name of the k8s secret holding access credentials to the sdg_repo_url.',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.SDG_REPO_URL]: {
    description:
      'SDG parameter. Points to a taxonomy git repository. E.g. "https://github.com/instructlab/taxonomy.git"',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.SDG_TEACHER_SECRET]: {
    defaultValue: 'teacher-secret',
    description:
      'SDG parameter. The name of the k8s secret key holding access credentials to the teacher server.',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.TRAIN_CPU_PER_WORKER]: {
    defaultValue: '2',
    description: 'Training parameter. Number of CPUs per each node/worker to use for training.',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.TRAIN_GPU_IDENTIFIER]: {
    defaultValue: 'nvidia.com/gpu',
    description: 'Training parameter. The GPU type used for training pods, e.g. nvidia.com/gpu',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.TRAIN_GPU_PER_WORKER]: {
    defaultValue: 2,
    description: 'Training parameter. Number of GPUs per each node/worker to use for training.',
    isOptional: true,
    parameterType: InputDefinitionParameterType.INTEGER,
  },
  [KnownFineTuningPipelineParameters.TRAIN_MEMORY_PER_WORKER]: {
    defaultValue: '2Gi',
    description: 'Training parameter. Memory per GPU per each node/worker to use for training.',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.TRAIN_NODE_SELECTORS]: {
    description: 'Training parameter. A JSON containing node selectors applied to training pods.',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRUCT,
  },
  [KnownFineTuningPipelineParameters.TRAIN_TOLERATIONS]: {
    description: 'Training parameter. List of tolerations applied to training pods.',
    isOptional: true,
    parameterType: InputDefinitionParameterType.LIST,
  },
  [KnownFineTuningPipelineParameters.SDG_SCALE_FACTOR]: {
    defaultValue: 30,
    description: 'SDG parameter. The total number of instructions to be generated.',
    isOptional: false,
    parameterType: InputDefinitionParameterType.INTEGER,
  },
  [KnownFineTuningPipelineParameters.TRAIN_NUM_WORKERS]: {
    defaultValue: 2,
    description: 'Training parameter. Number of nodes/workers to train on.',
    isOptional: false,
    parameterType: InputDefinitionParameterType.INTEGER,
  },
  [KnownFineTuningPipelineParameters.TRAIN_LEARNING_RATE_PHASE_1]: {
    defaultValue: 0.00002,
    description:
      "Training parameter for in Phase 1. How fast we optimize the weights during gradient descent. Higher values may lead to unstable learning performance. It's generally recommended to have a low learning rate with a high effective batch size.",
    isOptional: false,
    parameterType: InputDefinitionParameterType.DOUBLE,
  },
  [KnownFineTuningPipelineParameters.TRAIN_LEARNING_RATE_PHASE_2]: {
    defaultValue: 0.000006,
    description:
      "Training parameter for in Phase 2. How fast we optimize the weights during gradient descent. Higher values may lead to unstable learning performance. It's generally recommended to have a low learning rate with a high effective batch size.",
    isOptional: false,
    parameterType: InputDefinitionParameterType.DOUBLE,
  },
  [KnownFineTuningPipelineParameters.FINAL_EVAL_MAX_WORKERS]: {
    defaultValue: 'auto',
    description:
      "Final model evaluation parameter for MT Bench Branch. Number of workers to use for evaluation with mt_bench or mt_bench_branch. Must be a positive integer or 'auto'.",
    isOptional: false,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.FINAL_EVAL_BATCH_SIZE]: {
    defaultValue: 'auto',
    description:
      "Final model evaluation parameter for MMLU. Batch size for evaluation. Valid values are a positive integer or 'auto' to select the largest batch size that will fit in memory.",
    isOptional: false,
    parameterType: InputDefinitionParameterType.STRING,
  },
  'test param': {
    defaultValue: 'hi!',
    description: 'this is a random parameter',
    isOptional: false,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.OUTPUT_MODEL_NAME]: {
    description: 'The name of the output model.',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.OUTPUT_MODEL_REGISTRY_API_URL]: {
    description: 'The API URL for the model registry.',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.OUTPUT_MODEL_REGISTRY_NAME]: {
    description: 'The name of the model registry.',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.OUTPUT_MODEL_VERSION]: {
    description: 'The version of the output model.',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.OUTPUT_OCI_MODEL_URI]: {
    description: 'The OCI URI for the output model.',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
  [KnownFineTuningPipelineParameters.OUTPUT_OCI_REGISTRY_SECRET]: {
    description: 'The secret for accessing the OCI registry.',
    isOptional: true,
    parameterType: InputDefinitionParameterType.STRING,
  },
};
