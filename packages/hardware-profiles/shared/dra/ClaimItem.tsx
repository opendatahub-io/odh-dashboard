import * as React from 'react';
import { upperFirst } from 'lodash-es';
import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  Spinner,
  Stack,
  StackItem,
  Truncate,
} from '@patternfly/react-core';
import { LockIcon } from '@patternfly/react-icons';
import { renderRequest } from './requestDisplay';
import type { AllocatedDevice, ResolvedClaim, WorkloadPodIdentity } from './types';

type ClaimItemProps = {
  claim: ResolvedClaim;
  /** The Pod the claim was read from; absent when the workload has no Pod. */
  pod?: WorkloadPodIdentity;
  namespace?: string;
  showPodLine?: boolean;
  /** Containers the host cares about; a claim none of them reference gets a note. */
  containerNames?: string[];
  /** Noun for those containers in the note, e.g. `workbench container`. */
  containerLabel?: string;
  /** Test id prefix; hosts with several Pod groups make it unique per group. */
  testIdPrefix?: string;
  /** The Pod list never loaded, so a missing Pod is unknown rather than absent. */
  podsFailed?: boolean;
};

type ClaimObject = 'claim' | 'claim template';

/** A lookup that failed; the object tells the user which resource could not be read. */
export type ClaimLookupIssue =
  | { kind: 'missing'; object: ClaimObject }
  | { kind: 'forbidden'; object: ClaimObject }
  | { kind: 'error'; object: ClaimObject; error: Error };

/** What the item shows; derived from the resolved claim and whether a Pod exists. */
export type ClaimDisplayState =
  | { kind: 'noPod'; issue?: ClaimLookupIssue }
  | { kind: 'podUnknown'; issue?: ClaimLookupIssue }
  | { kind: 'loading' }
  | { kind: 'allocated'; devices: AllocatedDevice[] }
  | { kind: 'pending' }
  | { kind: 'skipped' }
  | ClaimLookupIssue;

/** A pending-generation claim only has its RCT, so that lookup's failure is the claim's failure. */
const getLookupIssue = (claim: ResolvedClaim): ClaimLookupIssue | undefined => {
  const { state, templateState } = claim;
  if (state.status === 'pending' && state.reason === 'generation' && templateState) {
    switch (templateState.status) {
      case 'missing':
      case 'forbidden':
        return { kind: templateState.status, object: 'claim template' };
      case 'error':
        return { kind: 'error', object: 'claim template', error: templateState.error };
      default:
        return undefined;
    }
  }
  switch (state.status) {
    case 'missing':
    case 'forbidden':
      return { kind: state.status, object: 'claim' };
    case 'error':
      return { kind: 'error', object: 'claim', error: state.error };
    default:
      return undefined;
  }
};

export const getClaimDisplayState = (
  claim: ResolvedClaim,
  hasPod: boolean,
  podsFailed = false,
): ClaimDisplayState => {
  const issue = getLookupIssue(claim);
  if (!hasPod) {
    return { kind: podsFailed ? 'podUnknown' : 'noPod', issue };
  }
  if (issue) {
    return issue;
  }
  const { state, templateState } = claim;
  if (
    state.status === 'pending' &&
    state.reason === 'generation' &&
    templateState?.status === 'loading'
  ) {
    return { kind: 'loading' };
  }
  switch (state.status) {
    case 'allocated':
      return { kind: 'allocated', devices: state.devices };
    case 'loading':
    case 'pending':
    case 'skipped':
      return { kind: state.status };
    default:
      // Lookup failures were handled above; anything else cannot be displayed.
      return {
        kind: 'error',
        object: 'claim',
        error: new Error('Claim state cannot be displayed'),
      };
  }
};

/** `<alias>: <template or direct claim name>`; the alias alone when the source is unknown. */
export const getClaimTitle = (claim: ResolvedClaim): string => {
  const { alias, source } = claim.reference;
  switch (source.type) {
    case 'template':
      return `${alias}: ${source.resourceClaimTemplateName}`;
    case 'direct':
      return `${alias}: ${source.resourceClaimName}`;
    default:
      return alias;
  }
};

/** Which containers reference the claim, relative to the ones the host cares about. */
export const getConsumptionNote = (
  claim: ResolvedClaim,
  containerNames: string[] | undefined,
  containerLabel: string,
): string | undefined => {
  const containers = [...new Set(claim.reference.consumers.map((c) => c.containerName))];
  if (containerNames && !containers.some((name) => containerNames.includes(name))) {
    return `Not used by the ${containerLabel}.`;
  }
  if (containers.length > 1) {
    return `Used by: ${containers.join(', ')}`;
  }
  return undefined;
};

const describeIssue = (issue: ClaimLookupIssue, namespace: string | undefined): string => {
  const projectLabel = namespace ? `the ${namespace} project` : 'this project';
  switch (issue.kind) {
    case 'missing':
      return `${upperFirst(issue.object)} not found in ${projectLabel}.`;
    case 'forbidden':
      return `You do not have permission to view this ${issue.object} in ${projectLabel}.`;
    case 'error':
      return `${upperFirst(issue.object)} could not be loaded: ${issue.error.message}`;
  }
};

/** Status label for one claim, or for a Pod row standing in for its claims. */
export const renderStatusLabel = (
  kind: ClaimDisplayState['kind'],
  testId: string,
): React.ReactNode => {
  switch (kind) {
    case 'allocated':
      return (
        <Label status="success" data-testid={testId}>
          Allocated
        </Label>
      );
    case 'pending':
      return (
        <Label status="warning" data-testid={testId}>
          Pending
        </Label>
      );
    case 'loading':
      return (
        <Label color="grey" icon={<Spinner size="sm" />} data-testid={testId}>
          Loading
        </Label>
      );
    case 'missing':
      return (
        <Label color="grey" data-testid={testId}>
          Missing
        </Label>
      );
    case 'forbidden':
      return (
        <Label color="grey" icon={<LockIcon />} data-testid={testId}>
          Unavailable
        </Label>
      );
    case 'error':
      return (
        <Label status="danger" data-testid={testId}>
          Error
        </Label>
      );
    case 'skipped':
      return (
        <Label color="grey" data-testid={testId}>
          Not needed
        </Label>
      );
    case 'noPod':
      return (
        <Label color="grey" data-testid={testId}>
          No running pod
        </Label>
      );
    case 'podUnknown':
      return (
        <Label color="grey" data-testid={testId}>
          Unknown
        </Label>
      );
  }
};

const getSummary = (display: ClaimDisplayState, namespace: string | undefined): string => {
  switch (display.kind) {
    case 'allocated': {
      const count = display.devices.length;
      return count === 0
        ? 'No devices were allocated for this container.'
        : `${count} allocated ${count === 1 ? 'device' : 'devices'}`;
    }
    case 'pending':
      return 'Waiting for device allocation.';
    case 'loading':
      return 'Loading claim details.';
    case 'skipped':
      return 'No claim was needed for this pod.';
    case 'noPod':
      return 'No pod is running for this workload.';
    case 'podUnknown':
      return 'Pod details could not be loaded.';
    default:
      return describeIssue(display, namespace);
  }
};

/** Compact state for a collapsed Pod row, e.g. `1 allocated device`. */
export const getClaimShortSummary = (display: ClaimDisplayState): string => {
  switch (display.kind) {
    case 'allocated': {
      const count = display.devices.length;
      return count === 0
        ? 'No allocated devices'
        : `${count} allocated ${count === 1 ? 'device' : 'devices'}`;
    }
    case 'pending':
      return 'Pending allocation';
    case 'loading':
      return 'Loading';
    case 'skipped':
      return 'Not needed';
    case 'noPod':
      return 'No running pod';
    case 'podUnknown':
      return 'Pod details could not be loaded';
    case 'missing':
      return `${upperFirst(display.object)} not found`;
    case 'forbidden':
      return 'Access denied';
    case 'error':
      return `${upperFirst(display.object)} could not be loaded`;
  }
};

const renderAllocatedDevice = (
  device: AllocatedDevice,
  index: number,
  total: number,
  testId: string,
): React.ReactNode => {
  const suffix = total > 1 ? ` ${index + 1}` : '';
  const { result } = device;
  return (
    <React.Fragment
      key={`${result.request}-${result.pool}-${result.device}-${result.shareID ?? ''}`}
    >
      <DescriptionListGroup>
        <DescriptionListTerm>Requested device class{suffix}</DescriptionListTerm>
        <DescriptionListDescription data-testid={`${testId}-device-${index}-class`}>
          {device.requestedDeviceClassName ? (
            <Truncate content={device.requestedDeviceClassName} />
          ) : (
            'Unknown'
          )}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Driver{suffix}</DescriptionListTerm>
        <DescriptionListDescription data-testid={`${testId}-device-${index}-driver`}>
          <Truncate content={result.driver} />
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Pool{suffix}</DescriptionListTerm>
        <DescriptionListDescription data-testid={`${testId}-device-${index}-pool`}>
          <Truncate content={result.pool} />
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Device{suffix}</DescriptionListTerm>
        <DescriptionListDescription data-testid={`${testId}-device-${index}-device`}>
          <Truncate content={result.device} />
        </DescriptionListDescription>
      </DescriptionListGroup>
    </React.Fragment>
  );
};

/** One claim: identity and status first; requested rows inline before allocation, details collapsed after. */
const ClaimItem: React.FC<ClaimItemProps> = ({
  claim,
  pod,
  namespace,
  showPodLine = true,
  containerNames,
  containerLabel = 'container',
  testIdPrefix = 'claim-item',
  podsFailed = false,
}) => {
  const [isDetailsExpanded, setDetailsExpanded] = React.useState(false);
  const testId = `${testIdPrefix}-${claim.reference.alias}`;
  const display = getClaimDisplayState(claim, !!pod, podsFailed);
  const hasNoPod = display.kind === 'noPod' || display.kind === 'podUnknown';
  const showAllocation = display.kind === 'allocated' && display.devices.length > 0;
  const showRequests = (display.kind === 'pending' || hasNoPod) && claim.requests.length > 0;
  const consumptionNote = getConsumptionNote(claim, containerNames, containerLabel);
  // Failure and zero-device states have no rows, so the known RC name gets its own line.
  const showClaimLine =
    !!claim.resourceClaimName &&
    (display.kind === 'missing' ||
      display.kind === 'forbidden' ||
      display.kind === 'error' ||
      (display.kind === 'allocated' && !showAllocation) ||
      (display.kind === 'pending' && !showRequests));
  const claimRow = claim.resourceClaimName && !hasNoPod && (
    <DescriptionListGroup>
      <DescriptionListTerm>Claim</DescriptionListTerm>
      <DescriptionListDescription data-testid={`${testId}-claim`}>
        <Truncate content={claim.resourceClaimName} />
      </DescriptionListDescription>
    </DescriptionListGroup>
  );

  return (
    <Stack data-testid={testId}>
      <StackItem>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
          flexWrap={{ default: 'nowrap' }}
        >
          <FlexItem>
            <Content component="p" data-testid={`${testId}-name`}>
              <Truncate content={getClaimTitle(claim)} />
            </Content>
          </FlexItem>
          <FlexItem>{renderStatusLabel(display.kind, `${testId}-status`)}</FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        <Content component="p" data-testid={`${testId}-summary`}>
          {getSummary(display, namespace)}
        </Content>
      </StackItem>
      {hasNoPod && display.issue && (
        <StackItem>
          <Content component="small" data-testid={`${testId}-issue`}>
            {describeIssue(display.issue, namespace)}
          </Content>
        </StackItem>
      )}
      {showClaimLine && (
        <StackItem>
          <Content component="small" data-testid={`${testId}-claim`}>
            Claim: {claim.resourceClaimName}
          </Content>
        </StackItem>
      )}
      {consumptionNote && (
        <StackItem>
          <Content component="small" data-testid={`${testId}-consumers`}>
            {consumptionNote}
          </Content>
        </StackItem>
      )}
      {pod && showPodLine && (
        <StackItem>
          <Content component="small" data-testid={`${testId}-pod`}>
            Pod: {pod.name}
          </Content>
        </StackItem>
      )}
      {showRequests && (
        <StackItem>
          <Stack hasGutter>
            <StackItem>
              <DescriptionList
                isCompact
                isHorizontal
                horizontalTermWidthModifier={{ default: '24ch' }}
                data-testid={`${testId}-requests`}
              >
                {claim.requests.map((request, index) =>
                  renderRequest(request, index, claim.requests.length > 1, {
                    testIdPrefix: `${testId}-request`,
                    deviceClassTerm: 'Requested device class',
                    countFirst: true,
                  }),
                )}
                {claimRow}
              </DescriptionList>
            </StackItem>
            <StackItem>
              <Content component="small" data-testid={`${testId}-caption`}>
                {display.kind === 'pending'
                  ? 'Allocated device details will appear when available.'
                  : 'Devices are allocated when the pod is running.'}
              </Content>
            </StackItem>
          </Stack>
        </StackItem>
      )}
      {showAllocation && (
        <StackItem>
          <ExpandableSection
            toggleContent={<span data-testid={`${testId}-details-toggle`}>Allocation details</span>}
            isExpanded={isDetailsExpanded}
            onToggle={(_e, expanded) => setDetailsExpanded(expanded)}
            isIndented
          >
            <DescriptionList
              isCompact
              columnModifier={{ default: '1Col', md: '2Col' }}
              data-testid={`${testId}-details`}
            >
              {display.devices.map((device, index) =>
                renderAllocatedDevice(device, index, display.devices.length, testId),
              )}
              <DescriptionListGroup>
                <DescriptionListTerm>Node</DescriptionListTerm>
                <DescriptionListDescription data-testid={`${testId}-node`}>
                  {pod?.nodeName ? <Truncate content={pod.nodeName} /> : 'Unknown'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              {claimRow}
            </DescriptionList>
          </ExpandableSection>
        </StackItem>
      )}
    </Stack>
  );
};

export default ClaimItem;
