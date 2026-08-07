import * as React from 'react';
import { Button, Content, Flex, FlexItem, Grid, GridItem } from '@patternfly/react-core';
import { ExpandableRowContent, Table, Tbody, Tr, Td } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ModelOverviewSubscription, ModelOverviewPolicy } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import PhaseLabel from '~/app/shared/PhaseLabel';
import { PhaseLabelLocation, PhaseResourceType } from '~/app/utilities/phaseLabelUtils';
import { formatTokenLimits } from '~/app/utilities/rateLimits';
import { MaaSEvents } from '~/app/types/event-tracking';
import {
  getAuthPolicyViewUrl,
  getSubscriptionViewUrl,
} from '~/app/utilities/subscriptionManagementNavigation';
import { hasHighlightedGroup } from './utils';
import GroupChips from './GroupChips';
import styles from './ExpandedModelContent.module.scss';

const OVERVIEW_LINK_STATE = {
  returnTo: `${URL_PREFIX}/maas-governance/overview`,
  breadcrumbLabel: 'MaaS governance',
};

const toggleExpandedItem = (prev: Set<string>, name: string): Set<string> => {
  const next = new Set(prev);
  if (next.has(name)) {
    next.delete(name);
  } else {
    next.add(name);
  }
  return next;
};

const isEffectivelyExpanded = (
  name: string,
  groups: string[] | undefined,
  expanded: Set<string>,
  highlightedGroup: string | null,
): boolean => expanded.has(name) || hasHighlightedGroup(groups ?? [], highlightedGroup);

type ExpandableItemProps = {
  ariaLabel: string;
  name: string;
  displayName?: string;
  linkTo: string;
  linkState: { returnTo: string; breadcrumbLabel?: string };
  phase?: string;
  resourceType: PhaseResourceType;
  rowIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  onLinkClick?: () => void;
  statusMessage?: string;
  reason?: string;
  isHighlighted: boolean;
  resourceUrl?: string;
  returnTo: string;
  status?: string;
  conditionType?: string;
  lastTransitionTime?: string;
};

const ExpandableItem: React.FC<ExpandableItemProps> = ({
  ariaLabel,
  name,
  displayName,
  linkTo,
  linkState,
  phase,
  resourceType,
  rowIndex,
  isExpanded,
  onToggle,
  children,
  onLinkClick,
  statusMessage,
  reason,
  isHighlighted,
  resourceUrl,
  returnTo,
  status,
  conditionType,
  lastTransitionTime,
}) => (
  <div
    className={`${styles['maas-expandable-item']}${
      isHighlighted ? ` ${styles['m-highlighted']}` : ''
    }`}
  >
    <Table aria-label={ariaLabel} borders={false} variant="compact">
      <Tbody isExpanded={isExpanded}>
        <Tr>
          <Td expand={{ rowIndex, isExpanded, onToggle }} />
          <Td>
            <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
              <FlexItem>
                <Link
                  to={linkTo}
                  state={linkState}
                  className="pf-v6-u-font-weight-bold pf-v6-u-font-size-md"
                  onClick={onLinkClick}
                >
                  {displayName ?? name}
                </Link>
              </FlexItem>
              <FlexItem>
                <PhaseLabel
                  phase={phase}
                  resourceType={resourceType}
                  statusMessage={statusMessage}
                  status={status}
                  conditionType={conditionType}
                  lastTransitionTime={lastTransitionTime}
                  reason={reason}
                  resourceName={displayName ?? name}
                  resourceUrl={resourceUrl}
                  returnTo={returnTo}
                  hideSubtext
                  onClick={() => {
                    fireMiscTrackingEvent(
                      MaaSEvents.SUBSCRIPTION_MANAGEMENT_STATUS_POPOVER_VIEWED,
                      {
                        popoverType: 'status',
                        status: phase,
                        location: PhaseLabelLocation.OVERVIEW,
                      },
                    );
                  }}
                />
              </FlexItem>
            </Flex>
          </Td>
        </Tr>
        <Tr isExpanded={isExpanded}>
          <Td colSpan={2}>
            <ExpandableRowContent>{children}</ExpandableRowContent>
          </Td>
        </Tr>
      </Tbody>
    </Table>
  </div>
);

type SectionHeaderProps = {
  title: string;
  showToggle: boolean;
  allExpanded: boolean;
  onToggleAll: () => void;
  testId: string;
};

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  showToggle,
  allExpanded,
  onToggleAll,
  testId,
}) => (
  <Flex
    justifyContent={{ default: 'justifyContentSpaceBetween' }}
    alignItems={{ default: 'alignItemsCenter' }}
    className="pf-v6-u-mb-sm"
  >
    <FlexItem>
      <Content>{title}</Content>
    </FlexItem>
    {showToggle && (
      <FlexItem>
        <Button
          variant="link"
          isInline
          onClick={onToggleAll}
          style={{ textDecoration: 'none' }}
          data-testid={testId}
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </Button>
      </FlexItem>
    )}
  </Flex>
);

type EmptyStateProps = {
  title: string;
  subtitle: string;
};

const SectionEmptyState: React.FC<EmptyStateProps> = ({ title, subtitle }) => (
  <div className="pf-v6-u-text-align-center pf-v6-u-mt-lg">
    <Content component="h4">{title}</Content>
    <Content component="p" className="pf-v6-u-mt-sm pf-v6-u-font-size-md">
      {subtitle}
    </Content>
  </div>
);

type SubscriptionsSectionProps = {
  subscriptions: ModelOverviewSubscription[];
  expandedSubs: Set<string>;
  onToggleSub: (name: string) => void;
  onToggleAll: () => void;
  highlightedGroup: string | null;
  setHighlightedGroup: (group: string | null) => void;
  returnTo: string;
};

const SubscriptionsSection: React.FC<SubscriptionsSectionProps> = ({
  subscriptions,
  expandedSubs,
  onToggleSub,
  onToggleAll,
  highlightedGroup,
  setHighlightedGroup,
  returnTo,
}) => {
  const allExpanded =
    subscriptions.length > 0 &&
    subscriptions.every((sub) =>
      isEffectivelyExpanded(sub.name, sub.groups, expandedSubs, highlightedGroup),
    );

  return (
    <>
      <SectionHeader
        title="Subscriptions"
        showToggle={subscriptions.length > 1}
        allExpanded={allExpanded}
        onToggleAll={onToggleAll}
        testId="expand-all-subscriptions"
      />
      {subscriptions.length === 0 ? (
        <SectionEmptyState
          title="No subscriptions"
          subtitle="No rate limits configured for this model."
        />
      ) : (
        subscriptions.map((sub, index) => {
          const isHighlighted = hasHighlightedGroup(sub.groups ?? [], highlightedGroup);
          return (
            <ExpandableItem
              key={sub.name}
              ariaLabel={`Subscription ${sub.displayName ?? sub.name}`}
              name={sub.name}
              displayName={sub.displayName}
              linkTo={`${URL_PREFIX}/maas-governance/subscriptions/view/${sub.name}`}
              linkState={OVERVIEW_LINK_STATE}
              returnTo={returnTo}
              phase={sub.phase}
              resourceType={PhaseResourceType.SUBSCRIPTION}
              rowIndex={index}
              isExpanded={isEffectivelyExpanded(
                sub.name,
                sub.groups,
                expandedSubs,
                highlightedGroup,
              )}
              isHighlighted={isHighlighted}
              onToggle={() => onToggleSub(sub.name)}
              statusMessage={sub.statusMessage}
              reason={sub.reason}
              status={sub.status}
              conditionType={sub.conditionType}
              lastTransitionTime={sub.lastTransitionTime}
              resourceUrl={getSubscriptionViewUrl(sub.name)}
            >
              <Content className="pf-v6-u-mb-sm">
                <strong className="pf-v6-u-mr-md">Token limits</strong>
                {formatTokenLimits(sub.tokenRateLimits ?? [])}
              </Content>
              <GroupChips
                groups={sub.groups ?? []}
                highlightedGroup={highlightedGroup}
                setHighlightedGroup={setHighlightedGroup}
              />
            </ExpandableItem>
          );
        })
      )}
    </>
  );
};

type PoliciesSectionProps = {
  policies: ModelOverviewPolicy[];
  expandedPolicies: Set<string>;
  onTogglePolicy: (name: string) => void;
  onToggleAll: () => void;
  highlightedGroup: string | null;
  setHighlightedGroup: (group: string | null) => void;
  returnTo: string;
};

const PoliciesSection: React.FC<PoliciesSectionProps> = ({
  policies,
  expandedPolicies,
  onTogglePolicy,
  onToggleAll,
  highlightedGroup,
  setHighlightedGroup,
  returnTo,
}) => {
  const allExpanded =
    policies.length > 0 &&
    policies.every((policy) =>
      isEffectivelyExpanded(policy.name, policy.groups, expandedPolicies, highlightedGroup),
    );

  return (
    <>
      <SectionHeader
        title="Authorization policies"
        showToggle={policies.length > 1}
        allExpanded={allExpanded}
        onToggleAll={onToggleAll}
        testId="expand-all-policies"
      />
      {policies.length === 0 ? (
        <SectionEmptyState
          title="No authorization policies"
          subtitle="Access is denied by default."
        />
      ) : (
        policies.map((policy, index) => {
          const isHighlighted = hasHighlightedGroup(policy.groups ?? [], highlightedGroup);
          return (
            <ExpandableItem
              key={policy.name}
              ariaLabel={`Policy ${policy.displayName ?? policy.name}`}
              name={policy.name}
              displayName={policy.displayName}
              linkTo={`${URL_PREFIX}/maas-governance/auth-policies/view/${policy.name}`}
              linkState={OVERVIEW_LINK_STATE}
              phase={policy.phase}
              resourceType={PhaseResourceType.AUTHPOLICY}
              rowIndex={index}
              resourceUrl={getAuthPolicyViewUrl(policy.name)}
              returnTo={returnTo}
              isExpanded={isEffectivelyExpanded(
                policy.name,
                policy.groups,
                expandedPolicies,
                highlightedGroup,
              )}
              isHighlighted={isHighlighted}
              onToggle={() => onTogglePolicy(policy.name)}
              statusMessage={policy.statusMessage}
              reason={policy.reason}
              status={policy.status}
              conditionType={policy.conditionType}
              lastTransitionTime={policy.lastTransitionTime}
            >
              <GroupChips
                groups={policy.groups ?? []}
                highlightedGroup={highlightedGroup}
                setHighlightedGroup={setHighlightedGroup}
              />
            </ExpandableItem>
          );
        })
      )}
    </>
  );
};

type ExpandedModelContentProps = {
  subscriptions: ModelOverviewSubscription[];
  policies: ModelOverviewPolicy[];
  returnTo: string;
};

const ExpandedModelContent: React.FC<ExpandedModelContentProps> = ({
  subscriptions,
  policies,
  returnTo,
}) => {
  const [expandedSubs, setExpandedSubs] = React.useState<Set<string>>(new Set());
  const [expandedPolicies, setExpandedPolicies] = React.useState<Set<string>>(new Set());
  const [highlightedGroup, setHighlightedGroup] = React.useState<string | null>(null);

  const toggleSub = React.useCallback(
    (name: string) => setExpandedSubs((prev) => toggleExpandedItem(prev, name)),
    [],
  );
  const togglePolicy = React.useCallback(
    (name: string) => setExpandedPolicies((prev) => toggleExpandedItem(prev, name)),
    [],
  );

  const toggleAllSubs = React.useCallback(() => {
    const allExpanded =
      subscriptions.length > 0 &&
      subscriptions.every((sub) =>
        isEffectivelyExpanded(sub.name, sub.groups, expandedSubs, highlightedGroup),
      );
    if (allExpanded) {
      setExpandedSubs(new Set());
      setHighlightedGroup(null);
    } else {
      setExpandedSubs(new Set(subscriptions.map((s) => s.name)));
    }
  }, [subscriptions, expandedSubs, highlightedGroup]);

  const toggleAllPolicies = React.useCallback(() => {
    const allExpanded =
      policies.length > 0 &&
      policies.every((policy) =>
        isEffectivelyExpanded(policy.name, policy.groups, expandedPolicies, highlightedGroup),
      );
    if (allExpanded) {
      setExpandedPolicies(new Set());
      setHighlightedGroup(null);
    } else {
      setExpandedPolicies(new Set(policies.map((p) => p.name)));
    }
  }, [policies, expandedPolicies, highlightedGroup]);

  return (
    <Grid hasGutter>
      <GridItem
        span={6}
        style={{
          borderRight: '1px solid var(--pf-t--global--border--color--default)',
          paddingRight: 'var(--pf-t--global--spacer--lg)',
        }}
      >
        <SubscriptionsSection
          subscriptions={subscriptions}
          expandedSubs={expandedSubs}
          onToggleSub={toggleSub}
          onToggleAll={toggleAllSubs}
          highlightedGroup={highlightedGroup}
          setHighlightedGroup={setHighlightedGroup}
          returnTo={returnTo}
        />
      </GridItem>
      <GridItem span={6}>
        <PoliciesSection
          policies={policies}
          expandedPolicies={expandedPolicies}
          onTogglePolicy={togglePolicy}
          onToggleAll={toggleAllPolicies}
          highlightedGroup={highlightedGroup}
          setHighlightedGroup={setHighlightedGroup}
          returnTo={returnTo}
        />
      </GridItem>
    </Grid>
  );
};

export default ExpandedModelContent;
