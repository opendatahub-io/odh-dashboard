export const PIPELINE_IMPORT_ARGO_ERROR_TEXT =
  'The selected pipeline was created using the Kubeflow v1 SDK, which is not supported by this UI. Select a pipeline that was created or recompiled using the Kubeflow v2 SDK.';

export const PIPELINE_ARGO_ERROR = 'Unsupported pipeline version';

export const PIPELINE_CREATE_SCHEDULE_TOOLTIP_ARGO_ERROR =
  'Cannot create schedule for Kubeflow v1 SDK pipelines';

export const PIPELINE_CREATE_RUN_TOOLTIP_ARGO_ERROR =
  'Cannot create run for Kubeflow v1 SDK pipelines';

export const NAME_CHARACTER_LIMIT = 255;
export const DESCRIPTION_CHARACTER_LIMIT = 255;

export const PIPELINE_IMPORT_V1_ERROR_TEXT =
  'DSP 1.0 pipelines are no longer supported by OpenShift AI. To import this pipeline, you must update and recompile it. To learn more, view the Migrating pipelines from DSP 1.0 to 2.0 documentation.';
export const MAX_SIZE_AS_MB = 1;
export const MAX_SIZE = MAX_SIZE_AS_MB * 1024 * 1024;

// Pipeline server modal titles
export const MANAGE_PIPELINE_SERVER_TITLE = 'Manage pipeline server';
export const MANAGE_PIPELINE_SERVER_CONFIGURATION_TITLE = 'Manage pipeline server configuration';
