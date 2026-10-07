import type { K8sResourceCommon, MatchExpression } from '@openshift/dynamic-plugin-sdk-utils';
import type { K8sCondition } from '../k8sTypes';

/** resource.k8s.io/v1 DRA types, mirroring k8s.io/api v0.34. */

/** Serialized resource.Quantity, e.g. "40Gi". */
type Quantity = string | number;

/** Upstream may add modes; refuse unknown values instead of guessing. */
export enum DeviceAllocationMode {
  EXACT_COUNT = 'ExactCount',
  ALL = 'All',
}

export enum DeviceTolerationOperator {
  EXISTS = 'Exists',
  EQUAL = 'Equal',
}

export enum DeviceTaintEffect {
  NO_SCHEDULE = 'NoSchedule',
  NO_EXECUTE = 'NoExecute',
}

export enum AllocationConfigSource {
  FROM_CLASS = 'FromClass',
  FROM_CLAIM = 'FromClaim',
}

export type CELDeviceSelector = {
  expression: string;
};

export type DeviceSelector = {
  cel?: CELDeviceSelector;
};

export type DeviceToleration = {
  key?: string;
  operator?: DeviceTolerationOperator;
  value?: string;
  effect?: DeviceTaintEffect;
  tolerationSeconds?: number;
};

export type CapacityRequirements = {
  requests?: Record<string, Quantity>;
};

/** Fields shared by `exactly` and `firstAvailable` entries. */
type DeviceSelection = {
  deviceClassName: string;
  selectors?: DeviceSelector[];
  /** Defaults to ExactCount. */
  allocationMode?: DeviceAllocationMode;
  /** ExactCount only; defaults to 1. */
  count?: number;
  tolerations?: DeviceToleration[];
  capacity?: CapacityRequirements;
};

export type ExactDeviceRequest = DeviceSelection & {
  adminAccess?: boolean;
};

export type DeviceSubRequest = DeviceSelection & {
  name: string;
};

/** Exactly one of `exactly` or `firstAvailable`; the latter is tried in order. */
export type DeviceRequest = {
  name: string;
  exactly?: ExactDeviceRequest;
  firstAvailable?: DeviceSubRequest[];
};

export type DeviceConstraint = {
  requests?: string[];
  matchAttribute?: string;
  distinctAttribute?: string;
};

/** Driver-specific; `parameters` is not interpreted. */
export type OpaqueDeviceConfiguration = {
  driver: string;
  parameters: unknown;
};

export type DeviceClaimConfiguration = {
  requests?: string[];
  opaque?: OpaqueDeviceConfiguration;
};

export type DeviceClaim = {
  /** Null or empty: nothing to allocate (not omitempty upstream). */
  requests?: DeviceRequest[] | null;
  constraints?: DeviceConstraint[];
  config?: DeviceClaimConfiguration[];
};

export type ResourceClaimSpec = {
  devices?: DeviceClaim;
};

export type DeviceRequestAllocationResult = {
  /** `<request>` or `<request>/<subrequest>`. */
  request: string;
  driver: string;
  pool: string;
  device: string;
  adminAccess?: boolean;
  tolerations?: DeviceToleration[];
  bindingConditions?: string[];
  bindingFailureConditions?: string[];
  shareID?: string;
  consumedCapacity?: Record<string, Quantity>;
};

export type DeviceAllocationConfiguration = {
  source: AllocationConfigSource;
  requests?: string[];
  opaque?: OpaqueDeviceConfiguration;
};

export type DeviceAllocationResult = {
  results?: DeviceRequestAllocationResult[];
  config?: DeviceAllocationConfiguration[];
};

export type AllocationResult = {
  devices?: DeviceAllocationResult;
  nodeSelector?: {
    nodeSelectorTerms: {
      matchExpressions?: MatchExpression[];
      matchFields?: MatchExpression[];
    }[];
  };
  allocationTimestamp?: string;
};

export type ResourceClaimConsumerReference = {
  apiGroup?: string;
  resource: string;
  name: string;
  uid: string;
};

export type AllocatedDeviceStatus = {
  driver: string;
  pool: string;
  device: string;
  shareID?: string;
  /** May be null when empty (not omitempty upstream). */
  conditions?: K8sCondition[] | null;
  data?: unknown;
  networkData?: {
    interfaceName?: string;
    ips?: string[];
    hardwareAddress?: string;
  };
};

export type ResourceClaimStatus = {
  allocation?: AllocationResult;
  reservedFor?: ResourceClaimConsumerReference[];
  devices?: AllocatedDeviceStatus[];
};

export type ResourceClaimKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: ResourceClaimSpec;
  status?: ResourceClaimStatus;
};

export type ResourceClaimTemplateKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    metadata?: K8sResourceCommon['metadata'];
    spec: ResourceClaimSpec;
  };
};
