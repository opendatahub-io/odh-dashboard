export enum FineTunePageSections {
  PROJECT_DETAILS = 'fine-tune-section-project-details',
  PIPELINE_DETAILS = 'fine-tine-section-pipeline-details',
  BASE_MODEL = 'fine-tune-section-base-model',
  TAXONOMY_DETAILS = 'fine-tune-section-taxonomy-details',
  TEACHER_MODEL = 'fine-tune-section-teacher-model',
  JUDGE_MODEL = 'fine-tune-section-judge-model',
  TRAINING_HARDWARE = 'fine-tune-section-training-hardware',
  HYPERPARAMETERS = 'fine-tune-section-hyperparameters',
  FINE_TUNED_MODEL_DETAILS = 'fine-tune-section-fine-tuned-model-details',
}

export const fineTunePageSectionTitles: Record<FineTunePageSections, string> = {
  [FineTunePageSections.PROJECT_DETAILS]: 'Project details',
  [FineTunePageSections.PIPELINE_DETAILS]: 'Pipeline details',
  [FineTunePageSections.TAXONOMY_DETAILS]: 'Taxonomy details',
  [FineTunePageSections.BASE_MODEL]: 'Base model',
  [FineTunePageSections.TEACHER_MODEL]: 'LAB teacher model',
  [FineTunePageSections.JUDGE_MODEL]: 'LAB judge model',
  [FineTunePageSections.TRAINING_HARDWARE]: 'Training hardware',
  [FineTunePageSections.HYPERPARAMETERS]: 'Hyperparameters',
  [FineTunePageSections.FINE_TUNED_MODEL_DETAILS]: 'Fine-tuned model details',
};

export const SCROLLABLE_SELECTOR_ID = 'fine-tune-page-scrollable-selector';

export const ILAB_PIPELINE_NAME = 'instructlab';

export const BASE_MODEL_INPUT_STORAGE_LOCATION_URI_KEY = 'baseModelInputStorageLocationUri';

export const CONTAINER_RESOURCE_DEFAULT = {
  limits: {
    cpu: '2',
    memory: '20Gi',
  },
  requests: {
    cpu: '2',
    memory: '20Gi',
  },
};

export enum KnownFineTuningPipelineParameters {
  OUTPUT_OCI_MODEL_URI = 'output_oci_model_uri',
  OUTPUT_OCI_REGISTRY_SECRET = 'output_oci_registry_secret',
  OUTPUT_MODEL_NAME = 'output_model_name',
  OUTPUT_MODEL_VERSION = 'output_model_version',
  OUTPUT_MODEL_REGISTRY_API_URL = 'output_model_registry_api_url',
  OUTPUT_MODEL_REGISTRY_NAME = 'output_model_registry_name',
  OUTPUT_MODELCAR_BASE_IMAGE = 'output_modelcar_base_image',
  SDG_REPO_URL = 'sdg_repo_url',
  SDG_REPO_SECRET = 'sdg_repo_secret',
  SDG_REPO_BRANCH = 'sdg_repo_branch',
  SDG_REPO_PR = 'sdg_repo_pr',
  SDG_TEACHER_SECRET = 'sdg_teacher_secret',
  SDG_BASE_MODEL = 'sdg_base_model',
  SDG_SCALE_FACTOR = 'sdg_scale_factor',
  SDG_PIPELINE = 'sdg_pipeline',
  SDG_MAX_BATCH_LEN = 'sdg_max_batch_len',
  SDG_SAMPLE_SIZE = 'sdg_sample_size',
  TRAIN_TOLERATIONS = 'train_tolerations',
  TRAIN_NODE_SELECTORS = 'train_node_selectors',
  TRAIN_GPU_IDENTIFIER = 'train_gpu_identifier',
  TRAIN_GPU_PER_WORKER = 'train_gpu_per_worker',
  TRAIN_CPU_PER_WORKER = 'train_cpu_per_worker',
  TRAIN_MEMORY_PER_WORKER = 'train_memory_per_worker',
  TRAIN_NUM_WORKERS = 'train_num_workers',
  TRAIN_NUM_EPOCHS_PHASE_1 = 'train_num_epochs_phase_1',
  TRAIN_NUM_EPOCHS_PHASE_2 = 'train_num_epochs_phase_2',
  TRAIN_EFFECTIVE_BATCH_SIZE_PHASE_1 = 'train_effective_batch_size_phase_1',
  TRAIN_EFFECTIVE_BATCH_SIZE_PHASE_2 = 'train_effective_batch_size_phase_2',
  TRAIN_LEARNING_RATE_PHASE_1 = 'train_learning_rate_phase_1',
  TRAIN_LEARNING_RATE_PHASE_2 = 'train_learning_rate_phase_2',
  TRAIN_NUM_WARMUP_STEPS_PHASE_1 = 'train_num_warmup_steps_phase_1',
  TRAIN_NUM_WARMUP_STEPS_PHASE_2 = 'train_num_warmup_steps_phase_2',
  TRAIN_SAVE_SAMPLES = 'train_save_samples',
  TRAIN_MAX_BATCH_LEN = 'train_max_batch_len',
  TRAIN_SEED = 'train_seed',
  MT_BENCH_MAX_WORKERS = 'mt_bench_max_workers',
  MT_BENCH_MERGE_SYSTEM_USER_MESSAGE = 'mt_bench_merge_system_user_message',
  FINAL_EVAL_MAX_WORKERS = 'final_eval_max_workers',
  FINAL_EVAL_FEW_SHOTS = 'final_eval_few_shots',
  FINAL_EVAL_BATCH_SIZE = 'final_eval_batch_size',
  FINAL_EVAL_MERGE_SYSTEM_USER_MESSAGE = 'final_eval_merge_system_user_message',
  EVAL_GPU_IDENTIFIER = 'eval_gpu_identifier',
  EVAL_JUDGE_SECRET = 'eval_judge_secret',
  K8S_STORAGE_CLASS_NAME = 'k8s_storage_class_name',
}

export const EXCLUDED_HYPERPARAMETERS: string[] = [
  KnownFineTuningPipelineParameters.FINAL_EVAL_MERGE_SYSTEM_USER_MESSAGE,
  KnownFineTuningPipelineParameters.OUTPUT_MODELCAR_BASE_IMAGE,
  KnownFineTuningPipelineParameters.MT_BENCH_MERGE_SYSTEM_USER_MESSAGE,
  KnownFineTuningPipelineParameters.SDG_REPO_BRANCH,
  KnownFineTuningPipelineParameters.SDG_REPO_PR,
];

export const EXPECTED_FINE_TUNING_PIPELINE_PARAMETERS: string[] = [
  KnownFineTuningPipelineParameters.SDG_TEACHER_SECRET,
  KnownFineTuningPipelineParameters.EVAL_JUDGE_SECRET,
  KnownFineTuningPipelineParameters.SDG_REPO_URL,
  KnownFineTuningPipelineParameters.SDG_REPO_SECRET,
  KnownFineTuningPipelineParameters.SDG_BASE_MODEL,
  KnownFineTuningPipelineParameters.TRAIN_GPU_IDENTIFIER,
  KnownFineTuningPipelineParameters.EVAL_GPU_IDENTIFIER,
  KnownFineTuningPipelineParameters.TRAIN_GPU_PER_WORKER,
  KnownFineTuningPipelineParameters.TRAIN_CPU_PER_WORKER,
  KnownFineTuningPipelineParameters.TRAIN_MEMORY_PER_WORKER,
  KnownFineTuningPipelineParameters.TRAIN_TOLERATIONS,
  KnownFineTuningPipelineParameters.TRAIN_NODE_SELECTORS,
  KnownFineTuningPipelineParameters.K8S_STORAGE_CLASS_NAME,
  KnownFineTuningPipelineParameters.SDG_PIPELINE,
  KnownFineTuningPipelineParameters.OUTPUT_MODEL_NAME,
  KnownFineTuningPipelineParameters.OUTPUT_MODEL_REGISTRY_API_URL,
  KnownFineTuningPipelineParameters.OUTPUT_MODEL_REGISTRY_NAME,
  KnownFineTuningPipelineParameters.OUTPUT_MODEL_VERSION,
  KnownFineTuningPipelineParameters.OUTPUT_OCI_MODEL_URI,
  KnownFineTuningPipelineParameters.OUTPUT_OCI_REGISTRY_SECRET,
] as const;

export const taxonomyMarkdownTitle = 'Creating a taxonomy for LAB-tuning';

export const taxonomyMarkdownContent = `To use LAB-tuning on Red Hat OpenShift AI, you must have a taxonomy stored in a Git repository. A taxonomy is a structured set of training data that defines the _knowledge_ and _skills_ your model should learn.

**Knowledge**

A data set that consists of information and facts. When creating knowledge data for a model, you are providing it with additional data and information so the model can answer questions more accurately.

**Skills**

A data set where you can teach the model how to do a task. Skills are split into categories:

* Compositional skill: Compositional skills allow AI models to perform specific tasks or functions. There are two types of composition skills: 
  * Freeform compositional skills: These are performative skills that do not require additional context or information to function. 
  * Grounded compositional skills: These are performative skills that require additional context. For example, you can teach the model to read a table, where the additional context is an example of the table layout. 
* Foundation skills: Foundational skills involve math, reasoning, and coding. These skills come from the model and are not added to your taxonomy tree.

## Taxonomy tree structure

A taxonomy tree for LAB-tuning organizes training data using a cascading directory structure. Each branch ends in a leaf node, and each leaf node is a directory with a \`qna.yaml\` file focused on a specific knowledge area or skill. Your taxonomy tree for OpenShift AI must include a \`root\` directory, a \`knowledge\` directory, and a \`compositional_skills\` directory. 

For more information about the taxonomy tree and \`qna.yaml\` file structure, see the [Red Hat Enterprise Linux AI documentation](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_ai/).

## Setting up your taxonomy for LAB-tuning

Setting up your taxonomy for LAB-tuning involves the following steps:

1. Create your taxonomy by using RHEL AI, as described in the [Red Hat Enterprise Linux AI documentation](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_ai/), or manually, following the guidance in the [Red Hat OpenShift AI documentation](https://docs.redhat.com/en/documentation/red_hat_openshift_ai/).
2. Upload your taxonomy to a Git repository. For an example, see [https://github.com/RedHatOfficial/rhelai-sample-taxonomy](https://github.com/RedHatOfficial/rhelai-sample-taxonomy).
3. Provide the Git repository URL containing your taxonomy, along with any required authentication details, when creating your LAB-tuning run in OpenShift AI.

For more detailed information about setting up your taxonomy, see the [Red Hat OpenShift AI documentation](https://docs.redhat.com/en/documentation/red_hat_openshift_ai/).`;

export const teacherJudgeMarkdownTitle = 'Deploying LAB teacher and LAB judge models';

export const teacherJudgeMarkdownContent = `To use LAB-tuning on Red Hat OpenShift AI, you must have deployed a LAB teacher model and a LAB judge model.

* **LAB teacher model:** Generates synthetic data for training.   
* **LAB judge model:** Evaluates model performance.

Setting up your LAB teacher model and LAB judge model requires performing the following steps for each model:

1. Find a LAB teacher or LAB judge model in the OpenShift AI model catalog.  
2. Upload the model to your object storage.  
3. Configure the object storage as a data connection within your project.  
4. If authorization is enabled on the model, configure service accounts to manage access.  
5. Deploy the model in OpenShift AI.  
6. When creating your LAB-tuning run in OpenShift AI, provide the model name, endpoint, and token, if applicable.

For more detailed information about setting up your LAB teacher and LAB judge models, see the [Red Hat OpenShift AI documentation](https://docs.redhat.com/en/documentation/red_hat_openshift_ai/).`;
