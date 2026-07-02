export const ModelLocationSelectOption = {
  EXISTING: 'Existing connection',
  PVC: 'Cluster storage',
  S3: 'S3 object storage',
  OCI: 'OCI compliant registry',
  URI: 'URI',
} as const;

export const ModelStateLabel = {
  STOPPED: 'Stopped',
  STOPPING: 'Stopping',
  STARTING: 'Starting',
  READY: 'Ready',
  RUNNING: 'Running',
  FAILED_TO_LOAD: 'Failed to load',
} as const;

export const ModelTypeLabel = {
  PREDICTIVE: 'Predictive model',
  GENERATIVE: 'Generative AI model (Example, LLM)',
} as const;

export type ModelTypeLabelValue = (typeof ModelTypeLabel)[keyof typeof ModelTypeLabel];

export const ModelStateToggleLabel = {
  START: 'Start',
  STOP: 'Stop',
} as const;

export const YAMLViewerToggleOption = {
  YAML: 'YAML',
  FORM: 'Form',
} as const;
