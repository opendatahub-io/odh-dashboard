import type { PodKind, PodResourceClaim, PodResourceClaimStatus } from '@odh-dashboard/k8s-core';
import type { ResourceClaimKind } from '@odh-dashboard/k8s-core/dra/types';
import {
  findRequestForAllocation,
  getRequestedDeviceClassName,
  normalizeResourceClaimRequests,
  normalizeResourceClaimTemplateRequests,
} from './requestNormalizer';
import type {
  AllocatedDevice,
  ClaimConsumer,
  ClaimLookupNames,
  ClaimResolutionState,
  ClaimsAggregateState,
  DraLookupState,
  DraLookups,
  NormalizedDeviceRequest,
  PodClaimReference,
  PodClaimSource,
  PodClaimSpec,
  ResolvedClaim,
} from './types';

export type ClaimResolutionOptions = {
  /** Only claims consumed by these containers; omit for every declared claim. */
  containerNames?: string[];
};

const LOADING: DraLookupState<never> = { status: 'loading' };

/** Own-property read; an absent key means the lookup has not been requested yet. */
const getLookup = <T>(
  record: Record<string, DraLookupState<T> | undefined>,
  name: string,
): DraLookupState<T> => (Object.hasOwn(record, name) ? record[name] : undefined) ?? LOADING;

const isDefined = (value: string | undefined): value is string => value !== undefined;

type EffectiveStatus = ClaimResolutionState['status'] | DraLookupState<unknown>['status'];

const FAILED_STATUSES: ReadonlySet<EffectiveStatus> = new Set(['missing', 'forbidden', 'error']);

/** Direct claims never consult Pod status; template claims take the generated name only from it. */
const getPodClaimSource = (
  statuses: PodResourceClaimStatus[] | undefined,
  declaration: PodResourceClaim,
): PodClaimSource => {
  if (declaration.resourceClaimName) {
    return { type: 'direct', resourceClaimName: declaration.resourceClaimName };
  }
  if (declaration.resourceClaimTemplateName) {
    const status = statuses?.find((entry) => entry.name === declaration.name);
    if (!status) {
      return {
        type: 'template',
        resourceClaimTemplateName: declaration.resourceClaimTemplateName,
        generation: 'pending',
      };
    }
    return {
      type: 'template',
      resourceClaimTemplateName: declaration.resourceClaimTemplateName,
      resourceClaimName: status.resourceClaimName,
      generation: status.resourceClaimName ? 'generated' : 'skipped',
    };
  }
  return { type: 'unknown' };
};

const getClaimConsumers = (spec: PodClaimSpec): Map<string, ClaimConsumer[]> => {
  const consumers = new Map<string, ClaimConsumer[]>();
  [...(spec.initContainers ?? []), ...spec.containers].forEach((container) => {
    container.resources?.claims?.forEach((claim) => {
      const list = consumers.get(claim.name) ?? [];
      list.push({ containerName: container.name, requestName: claim.request });
      consumers.set(claim.name, list);
    });
  });
  return consumers;
};

/** True when the spec declares a claim or any container consumes one. */
export const hasDeclaredClaims = (spec: PodClaimSpec): boolean =>
  (spec.resourceClaims?.length ?? 0) > 0 || getClaimConsumers(spec).size > 0;

/** Declared claims in `resourceClaims` order; statuses come only from a real Pod, so no Pod means none. */
export const getDeclaredClaimReferences = (
  spec: PodClaimSpec,
  statuses: PodResourceClaimStatus[] | undefined,
  options: ClaimResolutionOptions = {},
): PodClaimReference[] => {
  const consumersByAlias = getClaimConsumers(spec);
  const containerFilter = options.containerNames ? new Set(options.containerNames) : undefined;
  return (spec.resourceClaims ?? []).flatMap((declaration) => {
    const consumers = (consumersByAlias.get(declaration.name) ?? []).filter(
      (consumer) => !containerFilter || containerFilter.has(consumer.containerName),
    );
    if (containerFilter && consumers.length === 0) {
      return [];
    }
    return [
      { alias: declaration.name, source: getPodClaimSource(statuses, declaration), consumers },
    ];
  });
};

/** Declared claims in `Pod.spec.resourceClaims` order, optionally filtered to consuming containers. */
export const getPodClaimReferences = (
  pod: PodKind,
  options: ClaimResolutionOptions = {},
): PodClaimReference[] =>
  getDeclaredClaimReferences(pod.spec, pod.status?.resourceClaimStatuses, options);

/** RC names when known (direct or generated), otherwise the RCT; deduplicated, order preserved. */
export const getClaimLookupNames = (references: PodClaimReference[]): ClaimLookupNames => {
  const claimNames = new Set<string>();
  const templateNames = new Set<string>();
  references.forEach(({ source }) => {
    if (source.type === 'direct') {
      claimNames.add(source.resourceClaimName);
    } else if (source.type === 'template') {
      if (source.resourceClaimName) {
        claimNames.add(source.resourceClaimName);
      } else if (source.generation === 'pending') {
        templateNames.add(source.resourceClaimTemplateName);
      }
    }
  });
  return { claimNames: [...claimNames], templateNames: [...templateNames] };
};

/** Request names the consumers care about; undefined means every request. */
export const getConsumedRequestNames = (consumers: ClaimConsumer[]): Set<string> | undefined => {
  if (consumers.length === 0 || consumers.some((consumer) => !consumer.requestName)) {
    return undefined;
  }
  return new Set(consumers.map((consumer) => consumer.requestName).filter(isDefined));
};

export const getAllocatedDevices = (
  claim: ResourceClaimKind,
  requests: NormalizedDeviceRequest[],
  requestFilter?: Set<string>,
): AllocatedDevice[] =>
  (claim.status?.allocation?.devices?.results ?? []).flatMap((result) => {
    const match = findRequestForAllocation(requests, result.request);
    if (requestFilter && !requestFilter.has(match.requestName)) {
      return [];
    }
    return [
      {
        result,
        requestName: match.requestName,
        subrequestName: match.subrequestName,
        request: match.request,
        alternative: match.alternative,
        requestedDeviceClassName: getRequestedDeviceClassName(match.request, match.alternative),
      },
    ];
  });

const getClaimState = (
  lookup: DraLookupState<ResourceClaimKind>,
  requests: NormalizedDeviceRequest[],
  requestFilter: Set<string> | undefined,
): ClaimResolutionState => {
  switch (lookup.status) {
    case 'loaded': {
      const devices = getAllocatedDevices(lookup.resource, requests, requestFilter);
      return lookup.resource.status?.allocation
        ? { status: 'allocated', devices }
        : { status: 'pending', reason: 'allocation' };
    }
    case 'error':
      return { status: 'error', error: lookup.error };
    default:
      return lookup;
  }
};

/** Resolves one declared claim against the supplied RC/RCT lookups; RC spec wins over RCT. */
export const resolvePodClaim = (
  reference: PodClaimReference,
  lookups: DraLookups,
): ResolvedClaim => {
  const { source } = reference;
  const requestFilter = getConsumedRequestNames(reference.consumers);
  const resourceClaimName = source.type === 'unknown' ? undefined : source.resourceClaimName;
  const claimLookup = resourceClaimName ? getLookup(lookups.claims, resourceClaimName) : undefined;
  // The RCT only matters until the RC has loaded, and never for a skipped claim.
  const templateState =
    source.type === 'template' &&
    source.generation !== 'skipped' &&
    claimLookup?.status !== 'loaded'
      ? getLookup(lookups.templates, source.resourceClaimTemplateName)
      : undefined;

  let requests: NormalizedDeviceRequest[] = [];
  let requestsSource: ResolvedClaim['requestsSource'] = 'none';
  if (claimLookup?.status === 'loaded') {
    requests = normalizeResourceClaimRequests(claimLookup.resource);
    requestsSource = 'resourceClaim';
  } else if (templateState?.status === 'loaded') {
    requests = normalizeResourceClaimTemplateRequests(templateState.resource);
    requestsSource = 'resourceClaimTemplate';
  }
  if (requestFilter) {
    requests = requests.filter((request) => requestFilter.has(request.name));
  }

  let state: ClaimResolutionState;
  if (claimLookup) {
    state = getClaimState(claimLookup, requests, requestFilter);
  } else if (source.type === 'template' && source.generation === 'skipped') {
    state = { status: 'skipped' };
  } else if (source.type === 'template') {
    state = { status: 'pending', reason: 'generation' };
  } else {
    state = { status: 'error', error: new Error(`Claim "${reference.alias}" has no claim source`) };
  }

  return { reference, resourceClaimName, state, requests, requestsSource, templateState };
};

export const resolvePodClaims = (
  pod: PodKind,
  lookups: DraLookups,
  options: ClaimResolutionOptions = {},
): ResolvedClaim[] =>
  getPodClaimReferences(pod, options).map((reference) => resolvePodClaim(reference, lookups));

/** Pending-generation claims have only the RCT to show, so its lookup state stands in for the claim's. */
const getEffectiveStatus = (claim: ResolvedClaim): EffectiveStatus =>
  claim.state.status === 'pending' && claim.state.reason === 'generation' && claim.templateState
    ? claim.templateState.status
    : claim.state.status;

/** Collection view: failures alongside successes are a partial failure, never a total one. */
export const getClaimsAggregateState = (claims: ResolvedClaim[]): ClaimsAggregateState => {
  if (claims.length === 0) {
    return 'empty';
  }
  const statuses = claims.map(getEffectiveStatus);
  const failed = statuses.filter((status) => FAILED_STATUSES.has(status)).length;
  if (failed === claims.length) {
    return 'failed';
  }
  if (failed > 0) {
    return 'partialFailure';
  }
  return statuses.includes('loading') ? 'loading' : 'resolved';
};
