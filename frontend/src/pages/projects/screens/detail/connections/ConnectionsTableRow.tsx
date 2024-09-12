import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Connection, ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { TableRowTitleDescription } from '~/components/table';

type ConnectionsTableRowProps = {
  obj: Connection;
  connectionTypes?: ConnectionTypeConfigMapObj[];
  onEditConnection: (pvc: Connection) => void;
  onDeleteConnection: (dataConnection: Connection) => void;
};

const ConnectionsTableRow: React.FC<ConnectionsTableRowProps> = ({
  obj,
  connectionTypes,
  onEditConnection,
  onDeleteConnection,
}) => {
  const connectionTypeDisplayName = React.useMemo(() => {
    const matchingType = connectionTypes?.find(
      (type) => type.metadata.name === obj.metadata.annotations['opendatahub.io/connection-type'],
    );
    return (
      matchingType?.metadata.annotations?.['openshift.io/display-name'] ||
      obj.metadata.annotations['opendatahub.io/connection-type']
    );
  }, [obj, connectionTypes]);

  return (
    <Tr>
      <Td dataLabel="Name">
        <TableRowTitleDescription
          title={obj.metadata.annotations['openshift.io/display-name'] || obj.metadata.name}
          boldTitle={false}
          resource={obj}
          description={obj.metadata.annotations['openshift.io/description']}
        />
      </Td>
      <Td dataLabel="Type">{connectionTypeDisplayName}</Td>
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
};

export default ConnectionsTableRow;
