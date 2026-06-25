import * as React from 'react';
import { Button, Content, Flex, FlexItem, Grid, GridItem } from '@patternfly/react-core';
import { ExpandableRowContent, Table, Tbody, Tr, Td } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { MaaSAuthPolicy, MaaSSubscription, TokenRateLimit } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import PhaseLabel from '~/app/shared/PhaseLabel';
import { PhaseResourceType } from '~/app/utilities/phaseLabelUtils';
import { formatWindow } from '~/app/utilities/rateLimits';
import GroupChips from './GroupChips';

const formatTokenLimits = (limits: TokenRateLimit[]): string =>
  limits.length === 0
    ? '—'
    : limits.map((l) => `${l.limit.toLocaleString('en-US')}/${formatWindow(l.window)}`).join(' | ');

const itemBorderStyle = {
  border: '1px solid var(--pf-t--global--border--color--default)',
  borderRadius: 'var(--pf-t--global--border--radius--small)',
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
  linkState: { returnTo: string };
  phase?: string;
  resourceType: PhaseResourceType;
  statusMessage?: string;
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
  statusMessage,
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
                <PhaseLabel
                  phase={phase}
                  resourceType={resourceType}
                  statusMessage={statusMessage}
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

type ExpandedModelContentProps = {
  modelName: string;
  modelNamespace: string;
  subscriptions: MaaSSubscription[];
  policies: MaaSAuthPolicy[];
};

const ExpandedModelContent: React.FC<ExpandedModelContentProps> = ({
  modelName,
  modelNamespace,
  subscriptions,
  policies,
}) => {
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

  const allSubsExpanded = subscriptions.length > 0 && expandedSubs.size === subscriptions.length;
  const allPoliciesExpanded = policies.length > 0 && expandedPolicies.size === policies.length;

  return (
    <Grid hasGutter>
      <GridItem
        span={6}
        style={{
          borderRight: '1px solid var(--pf-t--global--border--color--default)',
          paddingRight: 'var(--pf-t--global--spacer--lg)',
        }}
      >
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
          className="pf-v6-u-mb-sm"
        >
          <FlexItem>
            <Content>Subscriptions</Content>
          </FlexItem>
          {subscriptions.length > 1 && (
            <FlexItem>
              <Button
                variant="link"
                isInline
                onClick={toggleAllSubs}
                style={{ textDecoration: 'none' }}
                data-testid="expand-all-subscriptions"
              >
                {allSubsExpanded ? 'Collapse all' : 'Expand all'}
              </Button>
            </FlexItem>
          )}
        </Flex>
        {subscriptions.length === 0 ? (
          <div className="pf-v6-u-text-align-center pf-v6-u-mt-lg">
            <Content component="h4">No subscriptions</Content>
            <Content component="p" className="pf-v6-u-mt-sm pf-v6-u-font-size-md">
              No rate limits configured for this model.
            </Content>
          </div>
        ) : (
          subscriptions.map((sub, index) => {
            const modelRef = sub.modelRefs.find(
              (ref) => ref.name === modelName && ref.namespace === modelNamespace,
            );
            const tokenLimits = modelRef?.tokenRateLimits ?? [];

            return (
              <ExpandableItem
                key={sub.name}
                ariaLabel={`Subscription ${sub.displayName ?? sub.name}`}
                name={sub.name}
                displayName={sub.displayName}
                linkTo={`${URL_PREFIX}/subscription-management/subscriptions/view/${sub.name}`}
                linkState={{ returnTo: `${URL_PREFIX}/subscription-management/subscriptions` }}
                phase={sub.phase}
                resourceType={PhaseResourceType.SUBSCRIPTION}
                statusMessage={sub.statusMessage}
                rowIndex={index}
                isExpanded={expandedSubs.has(sub.name)}
                onToggle={() => toggleSub(sub.name)}
              >
                <Content className="pf-v6-u-mb-sm">
                  <strong className="pf-v6-u-mr-md">Token limits</strong>
                  {formatTokenLimits(tokenLimits)}
                </Content>
                <GroupChips groups={sub.owner.groups} />
              </ExpandableItem>
            );
          })
        )}
      </GridItem>
      <GridItem span={6}>
        <Flex
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
          className="pf-v6-u-mb-sm"
        >
          <FlexItem>
            <Content>Authorization policies</Content>
          </FlexItem>
          {policies.length > 1 && (
            <FlexItem>
              <Button
                variant="link"
                isInline
                onClick={toggleAllPolicies}
                style={{ textDecoration: 'none' }}
                data-testid="expand-all-policies"
              >
                {allPoliciesExpanded ? 'Collapse all' : 'Expand all'}
              </Button>
            </FlexItem>
          )}
        </Flex>
        {policies.length === 0 ? (
          <div className="pf-v6-u-text-align-center pf-v6-u-mt-lg">
            <Content component="h4">No authorization policies</Content>
            <Content component="p" className="pf-v6-u-mt-sm pf-v6-u-font-size-md">
              Access is denied by default.
            </Content>
          </div>
        ) : (
          policies.map((policy, index) => (
            <ExpandableItem
              key={policy.name}
              ariaLabel={`Policy ${policy.displayName ?? policy.name}`}
              name={policy.name}
              displayName={policy.displayName}
              linkTo={`${URL_PREFIX}/subscription-management/auth-policies/view/${policy.name}`}
              linkState={{ returnTo: `${URL_PREFIX}/subscription-management/auth-policies` }}
              phase={policy.phase}
              resourceType={PhaseResourceType.AUTHPOLICY}
              statusMessage={policy.statusMessage}
              rowIndex={index}
              isExpanded={expandedPolicies.has(policy.name)}
              onToggle={() => togglePolicy(policy.name)}
            >
              <GroupChips groups={policy.subjects.groups ?? []} />
            </ExpandableItem>
          ))
        )}
      </GridItem>
    </Grid>
  );
};

export default ExpandedModelContent;
