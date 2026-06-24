export const AUTOML_EVENTS = {
  PIPELINE_RUN_CREATED: 'AutoML Pipeline Run Created',
  PIPELINE_RUN_STOPPED: 'AutoML Pipeline Run Stopped',
  PIPELINE_RUN_DELETED: 'AutoML Pipeline Run Deleted',
  PIPELINE_RUN_RETRIED: 'AutoML Pipeline Run Retried',
  MODEL_REGISTERED: 'AutoML Model Registered',
  RUN_RECONFIGURED: 'AutoML Run Reconfigured',
  S3_CONNECTION_CREATED: 'AutoML S3 Connection Created',
  MODEL_DETAILS_DOWNLOADED: 'AutoML Model Details Downloaded',
  NOTEBOOK_SAVED: 'AutoML Notebook Saved',
} as const;
