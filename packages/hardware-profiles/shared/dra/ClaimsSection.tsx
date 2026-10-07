import * as React from 'react';
import {
  Alert,
  Content,
  Divider,
  ExpandableSection,
  ExpandableSectionToggle,
  Flex,
  FlexItem,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import ClaimItem, {
  type ClaimDisplayState,
  getClaimDisplayState,
  getClaimShortSummary,
  getClaimTitle,
  renderStatusLabel,
} from './ClaimItem';
import type { WorkloadClaimGroup } from './types';

type ClaimsSectionProps = {
  /** One group per Pod, or one Pod-less group built from the workload spec. */
  groups: WorkloadClaimGroup[];
  /** Workload project namespace, for messages. */
  namespace?: string;
  /** Containers the host cares about; claims none of them reference get a note. */
  containerNames?: string[];
  /** Noun for those containers in notes, e.g. `workbench container`. */
  containerLabel?: string;
  /** True while the Pod list is still loading. */
  isLoading?: boolean;
  /** False until the first Pod list arrives; a later `loadError` then keeps the groups visible. */
  isLoaded?: boolean;
  loadError?: Error;
  /** Pod headings per group; defaults to on for more than one group. */
  showPodHeadings?: boolean;
  /** Collapse each group behind its Pod name, status, and a one-line summary; item ids are group-prefixed. */
  collapsibleGroups?: boolean;
  /** Hosts that supply their own "Claims" label hide the built-in title. */
  showTitle?: boolean;
  /** The Pod list never loaded, so Pod-less groups show an unknown Pod state. */
  podsFailed?: boolean;
};

// Most urgent first; the first kind present stands for the whole Pod.
const GROUP_KIND_PRIORITY: ClaimDisplayState['kind'][] = [
  'error',
  'forbidden',
  'missing',
  'loading',
  'pending',
  'podUnknown',
  'noPod',
  'allocated',
  'skipped',
];

/** The state a collapsed Pod row shows; undefined when the Pod declares no claims. */
export const getGroupDisplayKind = (
  group: WorkloadClaimGroup,
  podsFailed = false,
): ClaimDisplayState['kind'] | undefined => {
  const kinds = group.claims.map(
    (claim) => getClaimDisplayState(claim, !!group.pod, podsFailed).kind,
  );
  return GROUP_KIND_PRIORITY.find((kind) => kinds.includes(kind));
};

/** `<alias>: <source> · <state>` per claim, so a collapsed Pod row still names every claim. */
export const getGroupSummary = (group: WorkloadClaimGroup, podsFailed = false): string =>
  group.claims.length === 0
    ? 'No claims are declared.'
    : group.claims
        .map(
          (claim) =>
            `${getClaimTitle(claim)} · ${getClaimShortSummary(
              getClaimDisplayState(claim, !!group.pod, podsFailed),
            )}`,
        )
        .join('; ');

type ClaimsGroupProps = {
  group: WorkloadClaimGroup;
  groupId: string;
  namespace?: string;
  containerNames?: string[];
  containerLabel: string;
  itemTestIdPrefix: string;
  podsFailed?: boolean;
};

const ClaimsGroup: React.FC<
  ClaimsGroupProps & { showPodHeading: boolean; showPodLine: boolean; testId: string }
> = ({
  group,
  groupId,
  namespace,
  containerNames,
  containerLabel,
  showPodHeading,
  showPodLine,
  itemTestIdPrefix,
  testId,
  podsFailed,
}) => (
  <Stack hasGutter data-testid={testId}>
    {showPodHeading && group.pod && (
      <StackItem>
        <Content component="p" data-testid={`claims-group-${groupId}-pod`}>
          <strong>Pod: {group.pod.name}</strong>
          {group.pod.description && (
            <span data-testid={`claims-group-${groupId}-description`}>
              {' '}
              · {group.pod.description}
            </span>
          )}
        </Content>
      </StackItem>
    )}
    {group.claims.length === 0 && (
      <StackItem data-testid={`claims-group-${groupId}-empty`}>No claims are declared.</StackItem>
    )}
    {group.claims.map((claim, index) => (
      <React.Fragment key={claim.reference.alias}>
        {index > 0 && (
          <StackItem>
            <Divider />
          </StackItem>
        )}
        <StackItem>
          <ClaimItem
            claim={claim}
            pod={group.pod}
            namespace={namespace}
            showPodLine={showPodLine}
            containerNames={containerNames}
            containerLabel={containerLabel}
            testIdPrefix={itemTestIdPrefix}
            podsFailed={podsFailed}
          />
        </StackItem>
      </React.Fragment>
    ))}
  </Stack>
);

/** One Pod as a collapsed row: name, worst claim state, and a summary; the claims expand below it. */
const CollapsibleClaimsGroup: React.FC<ClaimsGroupProps> = (props) => {
  const { group, groupId, podsFailed } = props;
  const [isExpanded, setExpanded] = React.useState(false);
  const idBase = React.useId();
  const toggleId = `${idBase}-toggle`;
  const contentId = `${idBase}-content`;
  const kind = getGroupDisplayKind(group, podsFailed);
  const testId = `claims-group-${groupId}`;
  return (
    <Stack data-testid={testId}>
      <StackItem>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
          flexWrap={{ default: 'nowrap' }}
        >
          <FlexItem>
            <ExpandableSectionToggle
              isDetached
              isExpanded={isExpanded}
              onToggle={setExpanded}
              toggleId={toggleId}
              contentId={contentId}
              data-testid={`${testId}-toggle`}
            >
              <span data-testid={`${testId}-pod`}>{group.pod?.name ?? 'No pod'}</span>
              {group.pod?.description && (
                <span data-testid={`${testId}-description`}> · {group.pod.description}</span>
              )}
            </ExpandableSectionToggle>
          </FlexItem>
          {kind && <FlexItem>{renderStatusLabel(kind, `${testId}-status`)}</FlexItem>}
        </Flex>
      </StackItem>
      <StackItem>
        <Content component="small" data-testid={`${testId}-summary`}>
          {getGroupSummary(group, podsFailed)}
        </Content>
      </StackItem>
      <StackItem>
        <ExpandableSection
          isDetached
          isIndented
          isExpanded={isExpanded}
          toggleId={toggleId}
          contentId={contentId}
        >
          <ClaimsGroup
            {...props}
            showPodHeading={false}
            showPodLine={false}
            testId={`${testId}-content`}
          />
        </ExpandableSection>
      </StackItem>
    </Stack>
  );
};

/** Host-agnostic Claims presentation; hosts supply Pods (or a spec) already resolved into groups. */
const ClaimsSection: React.FC<ClaimsSectionProps> = ({
  groups,
  namespace,
  containerNames,
  containerLabel = 'container',
  isLoading = false,
  isLoaded = true,
  loadError,
  showPodHeadings = groups.length > 1,
  collapsibleGroups = false,
  showTitle = true,
  podsFailed = false,
}) => (
  <Stack hasGutter data-testid="claims-section">
    {showTitle && (
      <StackItem>
        <strong data-testid="claims-section-title">Claims</strong>
      </StackItem>
    )}
    {isLoading ? (
      <StackItem>
        <Spinner size="md" aria-label="Loading claims" data-testid="claims-section-loading" />
      </StackItem>
    ) : loadError && !isLoaded ? (
      <StackItem>
        <Alert
          variant="danger"
          isInline
          title="Claims could not be loaded"
          data-testid="claims-section-error"
        >
          {loadError.message}
        </Alert>
      </StackItem>
    ) : (
      <>
        {loadError && (
          <StackItem>
            <Alert
              variant="warning"
              isInline
              title="Latest claim details could not be loaded"
              data-testid="claims-section-refresh-error"
            >
              {loadError.message}
            </Alert>
          </StackItem>
        )}
        {groups.length === 0 && (
          <StackItem data-testid="claims-section-empty">No claims.</StackItem>
        )}
        {groups.map((group, index) => {
          // Keyed by Pod name so replica churn never remounts a sibling; Pod-less groups fall back to the index.
          const groupId = group.pod?.name ?? `no-pod-${index}`;
          const groupProps: ClaimsGroupProps = {
            group,
            groupId,
            namespace,
            containerNames,
            containerLabel,
            podsFailed,
            // A single inline group keeps the short ids hosts and page objects rely on.
            itemTestIdPrefix:
              collapsibleGroups || groups.length > 1
                ? `claims-group-${groupId}-item`
                : 'claim-item',
          };
          return (
            <StackItem key={groupId}>
              {collapsibleGroups ? (
                <>
                  {index > 0 && <Divider className="pf-v6-u-mb-sm" />}
                  <CollapsibleClaimsGroup {...groupProps} />
                </>
              ) : (
                <ClaimsGroup
                  {...groupProps}
                  showPodHeading={showPodHeadings}
                  showPodLine={!showPodHeadings}
                  testId={`claims-group-${groupId}`}
                />
              )}
            </StackItem>
          );
        })}
      </>
    )}
  </Stack>
);

export default ClaimsSection;
