import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Text, Title } from '@patternfly/react-core';
import ConnectedNotebooks from '../../../notebook/ConnectedNotebooks';
import { ConnectedNotebookContext } from '../../../notebook/useRelatedNotebooks';
import { DataConnection } from '../../../types';
import {
  getDataConnectionDescription,
  getDataConnectionDisplayName,
  getDataConnectionProvider,
  getDataConnectionResourceName,
  getDataConnectionType,
} from './utils';

type DataConnectionsTableRowProps = {
  obj: DataConnection;
  onDeleteDataConnection: (dataConnection: DataConnection) => void;
};

const DataConnectionsTableRow: React.FC<DataConnectionsTableRowProps> = ({
  obj,
  onDeleteDataConnection,
}) => {
  return (
    <Tr>
      <Td dataLabel="Name">
        <Title headingLevel="h4">{getDataConnectionDisplayName(obj)}</Title>
        <Text>{getDataConnectionDescription(obj)}</Text>
      </Td>
      <Td dataLabel="Type">{getDataConnectionType(obj)}</Td>
      <Td dataLabel="Connected workbenches">
        <ConnectedNotebooks
          context={ConnectedNotebookContext.DATA_CONNECTION}
          relatedResourceName={getDataConnectionResourceName(obj)}
        />
      </Td>
      <Td dataLabel="Provider">{getDataConnectionProvider(obj)}</Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Delete data connection',
              onClick: () => {
                onDeleteDataConnection(obj);
              },
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default DataConnectionsTableRow;
