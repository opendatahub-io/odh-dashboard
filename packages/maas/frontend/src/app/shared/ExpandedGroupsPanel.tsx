import * as React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { GroupReference } from '~/app/types/subscriptions';

type ExpandedGroupsPanelProps = {
  groups: GroupReference[];
  testId?: string;
};

const ExpandedGroupsPanel: React.FC<ExpandedGroupsPanelProps> = ({
  groups,
  testId = 'expanded-groups-panel',
}) => (
  <Table aria-label="Groups" data-testid={testId} variant="compact" borders={false}>
    <Thead>
      <Tr>
        <Th>Group name</Th>
      </Tr>
    </Thead>
    <Tbody>
      {groups.length === 0 ? (
        <Tr>
          <Td data-testid="no-groups-row">No groups</Td>
        </Tr>
      ) : (
        groups.map((group) => (
          <Tr key={group.name} data-testid="expanded-group-item">
            <Td dataLabel="Group name">{group.name}</Td>
          </Tr>
        ))
      )}
    </Tbody>
  </Table>
);

export default ExpandedGroupsPanel;
