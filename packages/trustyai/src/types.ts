import type { K8sAPIOptions } from '@odh-dashboard/k8s-core';

// ─── Bias metric enums & types ───────────────────────────────────────────────

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

// ─── Install state ───────────────────────────────────────────────────────────

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

export type TrustyStatusStates =
  | { type: TrustyInstallState.CR_ERROR | TrustyInstallState.INFRA_ERROR; message: string }
  | { type: TrustyInstallState.LOADING_INITIAL_STATE }
  | { type: TrustyInstallState.INSTALLED; showSuccess: boolean; onDismissSuccess?: () => void }
  | { type: TrustyInstallState.INSTALLING }
  | { type: TrustyInstallState.UNINSTALLING }
  | { type: TrustyInstallState.UNINSTALLED };

export const TRUSTY_CR_NOT_AVAILABLE_STATES = [
  TrustyInstallState.UNINSTALLED,
  TrustyInstallState.LOADING_INITIAL_STATE,
];

// ─── DB types ────────────────────────────────────────────────────────────────

/** Structure matches K8s Secret structure */
export type TrustyDBData = {
  databaseKind: string;
  databaseUsername: string;
  databasePassword: string;
  databaseService: string;
  databasePort: string;
  databaseName: string;
  databaseGeneration: string;
};

// ─── API response types ──────────────────────────────────────────────────────

export enum DataTypes {
  BOOL = 'BOOL',
  FLOAT = 'FLOAT',
  DOUBLE = 'DOUBLE',
  INT32 = 'INT32',
  INT64 = 'INT64',
  STRING = 'STRING',
}

export type TypedValue = {
  type: DataTypes;
  value: string;
};

export type BaseMetricResponse = {
  id: string;
  request: {
    metricName: BiasMetricType;
    favorableOutcome: TypedValue;
    privilegedAttribute: TypedValue;
    unprivilegedAttribute: TypedValue;
  } & BaseMetric;
};

export type BaseMetricListResponse = {
  requests: BaseMetricResponse[];
};

export type BaseMetricCreationResponse = {
  requestId: string;
  timestamp: string;
};

// ─── API state ───────────────────────────────────────────────────────────────

export type APIState<T> = {
  /** If API will successfully call */
  apiAvailable: boolean;
  /** The available API functions */
  api: T;
};

export type ListRequests = (opts: K8sAPIOptions) => Promise<BaseMetricListResponse>;
export type ListSpdRequests = (opts: K8sAPIOptions) => Promise<BaseMetricListResponse>;
export type ListDirRequests = (opts: K8sAPIOptions) => Promise<BaseMetricListResponse>;
export type CreateSpdRequest = (
  opts: K8sAPIOptions,
  x: BaseMetricRequest,
) => Promise<BaseMetricCreationResponse>;
export type CreateDirRequest = (
  opts: K8sAPIOptions,
  x: BaseMetricRequest,
) => Promise<BaseMetricCreationResponse>;
export type DeleteSpdRequest = (opts: K8sAPIOptions, requestId: string) => Promise<void>;
export type DeleteDirRequest = (opts: K8sAPIOptions, requestId: string) => Promise<void>;

export type ExplainabilityAPI = {
  listRequests: ListRequests;
  listSpdRequests: ListSpdRequests;
  listDirRequests: ListDirRequests;
  createSpdRequest: CreateSpdRequest;
  createDirRequest: CreateDirRequest;
  deleteSpdRequest: DeleteSpdRequest;
  deleteDirRequest: DeleteDirRequest;
};

// ─── Context data ────────────────────────────────────────────────────────────

export type TrustyAIContextData = {
  refresh: () => Promise<void>;
  biasMetricConfigs: BiasMetricConfig[];
  loaded: boolean;
  error?: Error;
};
