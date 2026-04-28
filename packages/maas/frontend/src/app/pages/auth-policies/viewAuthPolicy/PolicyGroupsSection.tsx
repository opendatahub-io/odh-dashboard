import * as React from 'react';
import { Bullseye, Content, Flex, FlexItem, Stack, StackItem, Title } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { GroupReference } from '~/app/types/subscriptions';

type PolicyGroupsSectionProps = {
  groups: GroupReference[];
};

const PolicyGroupsSection: React.FC<PolicyGroupsSectionProps> = ({ groups }) => (
  <Stack hasGutter data-testid="policy-groups-section">
    <StackItem>
      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <Title headingLevel="h2" size="xl">
            Groups
          </Title>
        </FlexItem>
        <FlexItem>
          <Content component="p">
            Users in these groups are able to access this authorization policy.
          </Content>
        </FlexItem>
      </Flex>
    </StackItem>
    <StackItem>
      {groups.length === 0 ? (
        <Bullseye>
          <Content component="p">No groups assigned to this authorization policy.</Content>
        </Bullseye>
      ) : (
        <Table aria-label="Policy groups" variant="compact" data-testid="policy-groups-table">
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

export default PolicyGroupsSection;
