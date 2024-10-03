import {
  BaseMetricCreationResponse,
  BaseMetricListResponse,
  BaseMetricRequest,
  BiasMetricType,
} from '~/api';
import { K8sAPIOptions } from '~/k8sTypes';

export enum TrustyInstallState {
  UNINSTALLING = 'uninstalling',
  INSTALLED = 'installed',
  INSTALLING = 'installing',
  ERROR = 'error',
  UNINSTALLED = 'uninstalled',
  LOADING_INITIAL_STATE = 'unknown',
}

export type TrustyStatusStates =
  | { type: TrustyInstallState.ERROR; message: string }
  | { type: TrustyInstallState.LOADING_INITIAL_STATE }
  | { type: TrustyInstallState.INSTALLED; showSuccess: boolean; onDismissSuccess?: () => void }
  | { type: TrustyInstallState.INSTALLING }
  | { type: TrustyInstallState.UNINSTALLING }
  | { type: TrustyInstallState.UNINSTALLED };

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
