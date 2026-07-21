import * as React from 'react';
import { Bullseye, Content, Flex, FlexItem, Stack, StackItem, Title } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { GroupReference } from '~/app/types/subscriptions';

type SubscriptionGroupsSectionProps = {
  groups: GroupReference[];
};

const SubscriptionGroupsSection: React.FC<SubscriptionGroupsSectionProps> = ({ groups }) => (
  <Stack hasGutter data-testid="subscription-groups-section">
    <StackItem>
      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <Title headingLevel="h2" size="xl">
            Groups
          </Title>
        </FlexItem>
        <FlexItem>
          <Content component="p">User groups that can use models in this subscription.</Content>
        </FlexItem>
      </Flex>
    </StackItem>
    <StackItem>
      {groups.length === 0 ? (
        <Bullseye>
          <Content component="p">No groups assigned to this subscription.</Content>
        </Bullseye>
      ) : (
        <Table
          aria-label="Subscription groups"
          variant="compact"
          data-testid="subscription-groups-table"
        >
          <Thead>
            <Tr>
              <Th>Name</Th>
            </Tr>
          </Thead>
          <Tbody>
            {groups.map((group) => (
              <Tr key={group.name}>
                <Td dataLabel="Name">{group.name}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </StackItem>
  </Stack>
);

export default SubscriptionGroupsSection;
