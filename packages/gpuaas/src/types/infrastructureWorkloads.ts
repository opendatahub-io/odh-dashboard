import type { NotebookKind } from '@odh-dashboard/k8s-core';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import type { LLMInferenceServiceKind } from '@odh-dashboard/llmd-serving/types';
import type { RayJobKind, TrainJobKind } from '@odh-dashboard/model-training/k8sTypes';
import type { DeploymentStatus } from '@odh-dashboard/model-serving/extension-points';
import type { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import type { JobDisplayState } from '@odh-dashboard/model-training/types';

export enum InfrastructureWorkloadKind {
  TrainJob = 'TrainJob',
  RayJob = 'RayJob',
  Notebook = 'Notebook',
  InferenceService = 'InferenceService',
  LLMInferenceService = 'LLMInferenceService',
}

export type InfrastructureWorkloadResource =
  | (NotebookKind & { kind: InfrastructureWorkloadKind.Notebook })
  | TrainJobKind
  | RayJobKind
  | InferenceServiceKind
  | LLMInferenceServiceKind;

export type InfrastructureWorkloadType = 'Train job' | 'Ray job' | 'Workbench' | 'Inference';

export type InfrastructureWorkloadsFilterType = 'status' | 'type' | 'hardwareProfile';

export type InfrastructureWorkloadsFilterValues = Record<
  InfrastructureWorkloadsFilterType,
  string[]
>;

export type InfrastructureWorkloadStatus = {
  label: string;
  message?: string;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'custom';
};

export type InfrastructureKueueState = 'managed' | 'non-kueue' | 'unavailable';

export type InfrastructureWorkloadRow = {
  name: string;
  namespace: string;
  resource: InfrastructureWorkloadResource;
  type: InfrastructureWorkloadType;
  status: InfrastructureWorkloadStatus;
  jobStatus?: JobDisplayState;
  kueueStatus?: KueueWorkloadStatus;
  deploymentStatus?: DeploymentStatus;
  queuePosition?: string;
  priority?: string;
  hardwareProfile?: string;
  hardwareProfileResourceType?: string;
  isKueueEnabled: boolean;
  isKueueManaged: boolean;
  kueueState: InfrastructureKueueState;
};

export type InfrastructureWorkloadsResult = {
  workloads: InfrastructureWorkloadRow[];
  kueueEnabled: boolean;
  failedSources: string[];
};
