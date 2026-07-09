import { AlertVariant } from '@patternfly/react-core';
import type { SecretKind, ImagePullSecret } from '@odh-dashboard/k8s-core';
import type { ToggleState } from '@odh-dashboard/ui-core';
import type {
  CreatingModelServingObjectCommon,
  InferenceServiceKind,
  ServingContainer,
  ServingRuntimeKind,
} from '@odh-dashboard/model-serving/shared';
import { Connection } from '#~/concepts/connectionTypes/types';
import { EnvVariableDataEntry } from '#~/pages/projects/types';

export enum PerformanceMetricType {
  SERVER = 'server',
  MODEL = 'model',
}

export enum MetricType {
  SERVER = 'server',
  MODEL = 'model',
  BIAS = 'bias',
}

export enum ServingRuntimeTableTabs {
  TYPE = 1,
  DEPLOYED_MODELS = 2,
  TOKENS = 3,
}

export type ModelServingState = ToggleState & {
  inferenceService: InferenceServiceKind;
};

export type { ModelServingSize } from '@odh-dashboard/k8s-core';

export type CreatingInferenceServiceObject = CreatingModelServingObjectCommon & {
  project: string;
  servingRuntimeName: string;
  storage: InferenceServiceStorage;
  format: InferenceServiceFormat;
  maxReplicas: number;
  minReplicas: number;
  labels?: Record<string, string>;
  servingRuntimeArgs?: ServingContainer['args'];
  servingRuntimeEnvVars?: ServingContainer['env'];
  imagePullSecrets?: ImagePullSecret[];
  dashboardNamespace?: string;
};

export enum InferenceServiceStorageType {
  NEW_STORAGE = 'new-storage',
  EXISTING_STORAGE = 'existing-storage',
  EXISTING_URI = 'existing-uri',
  PVC_STORAGE = 'pvc-storage',
}

export type InferenceServiceStorage = {
  type: InferenceServiceStorageType;
  path: string;
  dataConnection: string;
  uri?: string;
  awsData: EnvVariableDataEntry[];
  pvcConnection?: string;
  alert?: {
    type: AlertVariant;
    title: string;
    message: string;
  };
};

export type InferenceServiceFormat = {
  name: string;
  version?: string;
};

export type ServingRuntimeEditInfo = {
  servingRuntime?: ServingRuntimeKind;
  secrets: SecretKind[];
};

type PlatformStatus = {
  enabled: boolean;
  installed: boolean;
};
export type ServingPlatformStatuses = {
  kServe: PlatformStatus;
  kServeNIM: PlatformStatus;
  platformEnabledCount: number;
  refreshNIMAvailability: () => Promise<boolean | undefined>;
};

export type LabeledConnection = {
  connection: Connection;
  isRecommended?: boolean;
};
