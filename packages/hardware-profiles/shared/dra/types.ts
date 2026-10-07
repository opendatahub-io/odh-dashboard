import type { PodSpec } from '@odh-dashboard/k8s-core';
import type {
  DeviceRequestAllocationResult,
  ResourceClaimKind,
  ResourceClaimTemplateKind,
} from '@odh-dashboard/k8s-core/dra/types';

/** The Pod-template fields that declare and consume claims; shared by Pods and workload specs. */
export type PodClaimSpec = Pick<PodSpec, 'containers' | 'initContainers' | 'resourceClaims'>;

/** One supported clause of a device selector CEL expression. */
export type DeviceFilterClause = {
  /** `<domain>/<name>`, e.g. `gpu.nvidia.com/productName`, or `driver`. */
  attribute: string;
  category: 'attribute' | 'capacity' | 'driver';
  operator: DeviceFilterOperator;
  /** Literal as written, units preserved (e.g. `40Gi`). */
  value: string;
  valueType: 'string' | 'number' | 'boolean' | 'quantity';
};

export enum DeviceFilterOperator {
  EQUALS = '=',
  NOT_EQUALS = '≠',
  STARTS_WITH = 'starts with',
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL = '≥',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '≤',
}

/** Unsupported selectors carry no raw text so the UI can never leak it. */
export type DeviceFilter =
  | { type: 'supported'; clauses: DeviceFilterClause[] }
  | { type: 'unsupported' };

/** Explicit count descriptor; unknown modes are kept, never guessed. */
export type DeviceCount =
  | { mode: 'ExactCount'; count: number }
  | { mode: 'All' }
  | { mode: 'Unknown'; rawMode: string };

export type NormalizedDeviceSelection = {
  deviceClassName: string;
  count: DeviceCount;
  /** Selector order preserved. */
  filters: DeviceFilter[];
};

export type NormalizedDeviceAlternative = NormalizedDeviceSelection & {
  name: string;
};

export type NormalizedDeviceRequest = { name: string } & (
  | { type: 'exactly'; selection: NormalizedDeviceSelection }
  | { type: 'firstAvailable'; alternatives: NormalizedDeviceAlternative[] }
  | { type: 'unknown' }
);

/** Lookup state for one named RC or RCT fetch. */
export type DraLookupState<T> =
  | { status: 'loading' }
  | { status: 'loaded'; resource: T }
  | { status: 'missing' }
  | { status: 'forbidden' }
  | { status: 'error'; error: Error };

export type DraLookups = {
  /** Keyed by ResourceClaim name; absent key means not requested yet. */
  claims: Record<string, DraLookupState<ResourceClaimKind> | undefined>;
  /** Keyed by ResourceClaimTemplate name. */
  templates: Record<string, DraLookupState<ResourceClaimTemplateKind> | undefined>;
};

/** A container's `resources.claims[]` entry; no request name means every request. */
export type ClaimConsumer = {
  containerName: string;
  requestName?: string;
};

export type PodClaimSource =
  | { type: 'direct'; resourceClaimName: string }
  | {
      type: 'template';
      resourceClaimTemplateName: string;
      /** From Pod status only; never constructed. */
      resourceClaimName?: string;
      /** `skipped`: status entry exists without a name, so no claim is needed. */
      generation: 'generated' | 'pending' | 'skipped';
    }
  | { type: 'unknown' };

export type PodClaimReference = {
  /** `Pod.spec.resourceClaims[].name`. */
  alias: string;
  source: PodClaimSource;
  consumers: ClaimConsumer[];
};

export type AllocatedDevice = {
  result: DeviceRequestAllocationResult;
  requestName: string;
  subrequestName?: string;
  request?: NormalizedDeviceRequest;
  alternative?: NormalizedDeviceAlternative;
  /** From the matched request, not the allocation result. */
  requestedDeviceClassName?: string;
};

export type ClaimResolutionState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'forbidden' }
  | { status: 'pending'; reason: 'generation' | 'allocation' }
  | { status: 'allocated'; devices: AllocatedDevice[] }
  | { status: 'skipped' }
  | { status: 'error'; error: Error };

export type ResolvedClaim = {
  reference: PodClaimReference;
  /** Known RC name, kept even when the lookup fails. */
  resourceClaimName?: string;
  state: ClaimResolutionState;
  requests: NormalizedDeviceRequest[];
  requestsSource: 'resourceClaim' | 'resourceClaimTemplate' | 'none';
  templateState?: DraLookupState<ResourceClaimTemplateKind>;
};

export type ClaimsAggregateState = 'empty' | 'loading' | 'resolved' | 'partialFailure' | 'failed';

/** Names the UI must look up for a set of references, deduplicated. */
export type ClaimLookupNames = {
  claimNames: string[];
  templateNames: string[];
};

/** Pod identity for display; name and node come from a real Pod, never built; description is host-supplied. */
export type WorkloadPodIdentity = {
  name: string;
  /** `Pod.spec.nodeName`; absent until scheduled. */
  nodeName?: string;
  /** Host-supplied role shown after the name, e.g. an llm-d `prefill` worker. */
  description?: string;
};

/** Every claim a workload Pod declares, or the workload spec declares when no Pod exists. */
export type WorkloadClaimGroup = {
  pod?: WorkloadPodIdentity;
  claims: ResolvedClaim[];
};
