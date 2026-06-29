import * as React from 'react';
import { Button, Content, Flex, FlexItem, Grid, GridItem } from '@patternfly/react-core';
import { ExpandableRowContent, Table, Tbody, Tr, Td } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import {
  ModelOverviewSubscription,
  ModelOverviewPolicy,
  TokenRateLimit,
} from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import PhaseLabel from '~/app/shared/PhaseLabel';
import { PhaseResourceType } from '~/app/utilities/phaseLabelUtils';
import { formatWindow } from '~/app/utilities/rateLimits';
import GroupChips from './GroupChips';

const OVERVIEW_LINK_STATE = {
  returnTo: `${URL_PREFIX}/subscription-management/overview`,
  breadcrumbLabel: 'Subscription management',
};

const formatTokenLimits = (limits: TokenRateLimit[]): string =>
  limits.length === 0
    ? '—'
    : limits.map((l) => `${l.limit.toLocaleString('en-US')}/${formatWindow(l.window)}`).join(' | ');

const itemBorderStyle = {
  border: '1px solid var(--pf-t--global--border--color--default)',
  borderRadius: 'var(--pf-t--global--border--radius--medium)',
  marginBottom: 'var(--pf-t--global--spacer--sm)',
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
}) => (
  <div style={itemBorderStyle}>
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
                >
                  {displayName ?? name}
                </Link>
              </FlexItem>
              <FlexItem>
                <PhaseLabel phase={phase} resourceType={resourceType} />
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
};

const SubscriptionsSection: React.FC<SubscriptionsSectionProps> = ({
  subscriptions,
  expandedSubs,
  onToggleSub,
  onToggleAll,
}) => {
  const allExpanded = subscriptions.length > 0 && expandedSubs.size === subscriptions.length;

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
        subscriptions.map((sub, index) => (
          <ExpandableItem
            key={sub.name}
            ariaLabel={`Subscription ${sub.displayName ?? sub.name}`}
            name={sub.name}
            displayName={sub.displayName}
            linkTo={`${URL_PREFIX}/subscription-management/subscriptions/view/${sub.name}`}
            linkState={OVERVIEW_LINK_STATE}
            phase={sub.phase}
            resourceType={PhaseResourceType.SUBSCRIPTION}
            rowIndex={index}
            isExpanded={expandedSubs.has(sub.name)}
            onToggle={() => onToggleSub(sub.name)}
          >
            <Content className="pf-v6-u-mb-sm">
              <strong className="pf-v6-u-mr-md">Token limits</strong>
              {formatTokenLimits(sub.tokenRateLimits ?? [])}
            </Content>
            <GroupChips groups={sub.groups ?? []} />
          </ExpandableItem>
        ))
      )}
    </>
  );
};

type PoliciesSectionProps = {
  policies: ModelOverviewPolicy[];
  expandedPolicies: Set<string>;
  onTogglePolicy: (name: string) => void;
  onToggleAll: () => void;
};

const PoliciesSection: React.FC<PoliciesSectionProps> = ({
  policies,
  expandedPolicies,
  onTogglePolicy,
  onToggleAll,
}) => {
  const allExpanded = policies.length > 0 && expandedPolicies.size === policies.length;

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
        policies.map((policy, index) => (
          <ExpandableItem
            key={policy.name}
            ariaLabel={`Policy ${policy.displayName ?? policy.name}`}
            name={policy.name}
            displayName={policy.displayName}
            linkTo={`${URL_PREFIX}/subscription-management/auth-policies/view/${policy.name}`}
            linkState={OVERVIEW_LINK_STATE}
            phase={policy.phase}
            resourceType={PhaseResourceType.AUTHPOLICY}
            rowIndex={index}
            isExpanded={expandedPolicies.has(policy.name)}
            onToggle={() => onTogglePolicy(policy.name)}
          >
            <GroupChips groups={policy.groups ?? []} />
          </ExpandableItem>
        ))
      )}
    </>
  );
};

type ExpandedModelContentProps = {
  subscriptions: ModelOverviewSubscription[];
  policies: ModelOverviewPolicy[];
};

const ExpandedModelContent: React.FC<ExpandedModelContentProps> = ({ subscriptions, policies }) => {
  const [expandedSubs, setExpandedSubs] = React.useState<Set<string>>(new Set());
  const [expandedPolicies, setExpandedPolicies] = React.useState<Set<string>>(new Set());

  const toggleSub = React.useCallback(
    (name: string) => setExpandedSubs((prev) => toggleExpandedItem(prev, name)),
    [],
  );
  const togglePolicy = React.useCallback(
    (name: string) => setExpandedPolicies((prev) => toggleExpandedItem(prev, name)),
    [],
  );

  const toggleAllSubs = React.useCallback(() => {
    setExpandedSubs((prev) => {
      const allExpanded = subscriptions.length > 0 && prev.size === subscriptions.length;
      return allExpanded ? new Set() : new Set(subscriptions.map((s) => s.name));
    });
  }, [subscriptions]);

  const toggleAllPolicies = React.useCallback(() => {
    setExpandedPolicies((prev) => {
      const allExpanded = policies.length > 0 && prev.size === policies.length;
      return allExpanded ? new Set() : new Set(policies.map((p) => p.name));
    });
  }, [policies]);

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
        />
      </GridItem>
      <GridItem span={6}>
        <PoliciesSection
          policies={policies}
          expandedPolicies={expandedPolicies}
          onTogglePolicy={togglePolicy}
          onToggleAll={toggleAllPolicies}
        />
      </GridItem>
    </Grid>
  );
};

export default ExpandedModelContent;
