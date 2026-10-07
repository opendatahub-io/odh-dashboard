import {
  DeviceAllocationMode,
  type DeviceRequest,
  type DeviceSubRequest,
  type ExactDeviceRequest,
  type ResourceClaimKind,
  type ResourceClaimTemplateKind,
} from '@odh-dashboard/k8s-core/dra/types';
import { toDeviceFilter } from './celFormatter';
import type {
  DeviceCount,
  NormalizedDeviceAlternative,
  NormalizedDeviceRequest,
  NormalizedDeviceSelection,
} from './types';

/** Kubernetes defaults: omitted mode is ExactCount, omitted ExactCount count is 1. */
export const normalizeDeviceCount = (
  allocationMode: DeviceAllocationMode | string | undefined,
  count: number | undefined,
): DeviceCount => {
  const mode = allocationMode ?? DeviceAllocationMode.EXACT_COUNT;
  switch (mode) {
    case DeviceAllocationMode.EXACT_COUNT:
      return { mode: 'ExactCount', count: count ?? 1 };
    case DeviceAllocationMode.ALL:
      return { mode: 'All' };
    default:
      return { mode: 'Unknown', rawMode: mode };
  }
};

export const normalizeDeviceSelection = (
  selection: ExactDeviceRequest | DeviceSubRequest,
): NormalizedDeviceSelection => ({
  deviceClassName: selection.deviceClassName,
  count: normalizeDeviceCount(selection.allocationMode, selection.count),
  filters: (selection.selectors ?? []).map((selector) => toDeviceFilter(selector.cel?.expression)),
});

export const normalizeDeviceRequest = (request: DeviceRequest): NormalizedDeviceRequest => {
  const { name, exactly, firstAvailable } = request;
  if (exactly && !firstAvailable) {
    return { name, type: 'exactly', selection: normalizeDeviceSelection(exactly) };
  }
  if (firstAvailable && !exactly) {
    const alternatives: NormalizedDeviceAlternative[] = firstAvailable.map((alternative) => ({
      name: alternative.name,
      ...normalizeDeviceSelection(alternative),
    }));
    return { name, type: 'firstAvailable', alternatives };
  }
  return { name, type: 'unknown' };
};

/** Null, undefined and [] all mean no requests. */
export const normalizeDeviceRequests = (
  requests: DeviceRequest[] | null | undefined,
): NormalizedDeviceRequest[] => (requests ?? []).map(normalizeDeviceRequest);

export const normalizeResourceClaimTemplateRequests = (
  template: ResourceClaimTemplateKind,
): NormalizedDeviceRequest[] => normalizeDeviceRequests(template.spec.spec.devices?.requests);

export const normalizeResourceClaimRequests = (
  claim: ResourceClaimKind,
): NormalizedDeviceRequest[] => normalizeDeviceRequests(claim.spec.devices?.requests);

/** Finds the request and, for `<request>/<subrequest>`, the matching firstAvailable alternative. */
export const findRequestForAllocation = (
  requests: NormalizedDeviceRequest[],
  allocationRequest: string,
): {
  requestName: string;
  subrequestName?: string;
  request?: NormalizedDeviceRequest;
  alternative?: NormalizedDeviceAlternative;
} => {
  const slash = allocationRequest.indexOf('/');
  const requestName = slash === -1 ? allocationRequest : allocationRequest.slice(0, slash);
  const subrequestName = slash === -1 ? undefined : allocationRequest.slice(slash + 1);
  const request = requests.find((r) => r.name === requestName);
  const alternative =
    request?.type === 'firstAvailable' && subrequestName !== undefined
      ? request.alternatives.find((a) => a.name === subrequestName)
      : undefined;
  return { requestName, subrequestName, request, alternative };
};

/** Device class the matched request asked for; undefined for unknown or unmatched shapes. */
export const getRequestedDeviceClassName = (
  request: NormalizedDeviceRequest | undefined,
  alternative: NormalizedDeviceAlternative | undefined,
): string | undefined => {
  if (alternative) {
    return alternative.deviceClassName;
  }
  if (request?.type === 'exactly') {
    return request.selection.deviceClassName;
  }
  return undefined;
};
