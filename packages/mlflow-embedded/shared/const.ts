export enum WorkflowType {
  GENAI = 'genai',
  MACHINE_LEARNING = 'machine_learning',
}

export const EXPERIMENTS_PAGE_TITLE = 'Experiments';
export const PROMPT_MANAGEMENT_PAGE_TITLE = 'Prompts';

export const EXPERIMENTS_NO_PROJECTS_MESSAGE =
  'To view MLflow experiments, first create a project.';
export const PROMPT_MANAGEMENT_NO_PROJECTS_MESSAGE = 'To manage prompts, first create a project.';

export const MLFLOW_UNAVAILABLE_TITLE = 'MLflow is currently unavailable';
export const MLFLOW_UNAVAILABLE_MESSAGE =
  'The MLflow service could not be reached. Please check that MLflow is deployed and running, then try again.';

export const MLFLOW_NOT_CONFIGURED_ADMIN_TITLE = 'Enable experiments';
export const MLFLOW_NOT_CONFIGURED_ADMIN_MESSAGE =
  'To enable the use of experiments on this cluster, enable the MLflow Operator component and ensure that an MLflow custom resource has been created. To learn more about how to install and configure MLflow, view the documentation.';

export const MLFLOW_NOT_CONFIGURED_TITLE = 'Admin configuration required';
export const MLFLOW_NOT_CONFIGURED_MESSAGE =
  'MLflow supports experiment tracking, prompt management, and agent observability. Ask your administrator to enable MLflow for this cluster.';

export const AGENT_OBSERVABILITY_PAGE_TITLE = 'Agent observability';
export const AGENT_OBSERVABILITY_NO_PROJECTS_MESSAGE =
  'To view agent observability, first create a project.';
