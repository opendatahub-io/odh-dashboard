import * as React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { GroupReference } from '~/app/types/subscriptions';

type ExpandedGroupsPanelProps = {
  groups: GroupReference[];
};

const ExpandedGroupsPanel: React.FC<ExpandedGroupsPanelProps> = ({ groups }) => (
  <Table aria-label="Groups" data-testid="groups-expanded-panel" variant="compact" borders>
    <Thead>
      <Tr>
        <Th>Group name</Th>
      </Tr>
    </Thead>
    <Tbody>
      {groups.length === 0 ? (
        <Tr>
          <Td data-testid="empty-groups-expanded-panel">No groups</Td>
        </Tr>
      ) : (
        groups.map((group) => (
          <Tr key={group.name} data-testid="expanded-group-item">
            <Td dataLabel="Group name" data-testid="expanded-group-name">
              {group.name}
            </Td>
          </Tr>
        ))
      )}
    </Tbody>
  </Table>
);

export default ExpandedGroupsPanel;
