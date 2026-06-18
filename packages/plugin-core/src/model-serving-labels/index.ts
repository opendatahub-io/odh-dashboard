export enum ModelLocationSelectOption {
  EXISTING = 'Existing connection',
  PVC = 'Cluster storage',
  S3 = 'S3 object storage',
  OCI = 'OCI compliant registry',
  URI = 'URI',
}

export enum ModelTypeLabel {
  PREDICTIVE = 'Predictive model',
  GENERATIVE = 'Generative AI model (Example, LLM)',
}

export enum ModelStateLabel {
  STOPPED = 'Stopped',
  STOPPING = 'Stopping',
  STARTING = 'Starting',
  READY = 'Ready',
  RUNNING = 'Running',
  FAILED_TO_LOAD = 'Failed to load',
}

export enum ModelStateToggleLabel {
  START = 'Start',
  STOP = 'Stop',
}

export enum YAMLViewerToggleOption {
  YAML = 'YAML',
  FORM = 'Form',
}
