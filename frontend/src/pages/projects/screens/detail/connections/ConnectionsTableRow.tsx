import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { TableRowTitleDescription } from '~/components/table';
import { Connection } from './types';

type ConnectionsTableRowProps = {
  obj: Connection;
  onEditConnection: (pvc: Connection) => void;
  onDeleteConnection: (dataConnection: Connection) => void;
};

const ConnectionsTableRow: React.FC<ConnectionsTableRowProps> = ({
  obj,
  onEditConnection,
  onDeleteConnection,
}) => (
  <Tr>
    <Td dataLabel="Name">
      <TableRowTitleDescription
        title={obj.metadata.annotations['openshift.io/display-name']}
        boldTitle={false}
        resource={obj}
        description={obj.metadata.annotations['openshift.io/description']}
      />
    </Td>
    <Td dataLabel="Type">{obj.metadata.annotations['opendatahub.io/connection-type']}</Td>
    <Td dataLabel="Compatibility">-</Td>
    <Td dataLabel="Connected resources">-</Td>
    <Td isActionCell>
      <ActionsColumn
        items={[
          {
            title: 'Edit',
            onClick: () => {
              onEditConnection(obj);
            },
          },
          {
            title: 'Delete',
            onClick: () => {
              onDeleteConnection(obj);
            },
          },
        ]}
      />
    </Td>
  </Tr>
);

export default ConnectionsTableRow;
