export enum BiasMetricType {
  SPD = 'SPD',
  DIR = 'DIR',
}

export type BaseMetric = {
  protectedAttribute: string;
  outcomeName: string;
  modelId: string;
  requestName?: string;
  thresholdDelta?: number;
  batchSize?: number;
};

export type BaseMetricRequestInput = {
  favorableOutcome: string | number | boolean;
  privilegedAttribute: string | number | boolean;
  unprivilegedAttribute: string | number | boolean;
} & BaseMetric;

export type BaseMetricRequest = {
  favorableOutcome: string | number | boolean;
  privilegedAttribute: string | number | boolean;
  unprivilegedAttribute: string | number | boolean;
} & BaseMetric;

export enum TrustyInstallState {
  UNINSTALLING = 'uninstalling',
  INSTALLED = 'installed',
  INSTALLING = 'installing',
  /** Unrelated to Trusty error / infra failed, network issue, etc */
  INFRA_ERROR = 'infra-error',
  /** Specific error with the CR */
  CR_ERROR = 'error',
  UNINSTALLED = 'uninstalled',
  LOADING_INITIAL_STATE = 'unknown',
}

export type BiasMetricConfig = {
  id: string;
  name: string;
  metricType: BiasMetricType;
  protectedAttribute: string;
  outcomeName: string;
  favorableOutcome: string;
  privilegedAttribute: string;
  unprivilegedAttribute: string;
  modelId: string;
  thresholdDelta?: number;
  batchSize?: number;
};
