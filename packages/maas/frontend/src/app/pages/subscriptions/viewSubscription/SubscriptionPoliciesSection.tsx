import * as React from 'react';
import { Bullseye, Content, Flex, FlexItem, Stack, StackItem, Title } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';

type SubscriptionPoliciesSectionProps = {
  authPolicies: MaaSAuthPolicy[];
};

const SubscriptionPoliciesSection: React.FC<SubscriptionPoliciesSectionProps> = ({
  authPolicies,
}) => (
  <Stack hasGutter data-testid="subscription-policies-section">
    <StackItem>
      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <Title headingLevel="h2" size="xl">
            Related Policies
          </Title>
        </FlexItem>
        <FlexItem>
          <Content component="p">
            Policies that are associated with this subscription or its models.
          </Content>
        </FlexItem>
      </Flex>
    </StackItem>
    <StackItem>
      {authPolicies.length === 0 ? (
        <Bullseye>
          <Content component="p" data-testid="policies-empty-message">
            No policies associated with this subscription.
          </Content>
        </Bullseye>
      ) : (
        <Table
          aria-label="Subscription auth policies"
          variant="compact"
          data-testid="subscription-policies-table"
        >
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Type</Th>
            </Tr>
          </Thead>
          <Tbody>
            {authPolicies.map((policy) => (
              <Tr key={policy.name}>
                <Td dataLabel="Name">{policy.name}</Td>
                <Td dataLabel="Type">{policy.kind ?? '—'}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </StackItem>
  </Stack>
);

export default SubscriptionPoliciesSection;
