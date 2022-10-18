import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Text, Title } from '@patternfly/react-core';
import { DataConnection } from '../../../types';
import {
  getDataConnectedNotebookAnnotation,
  getDataConnectionDescription,
  getDataConnectionName,
  getDataConnectionProvider,
  getDataConnectionType,
} from './utils';
import ConnectedWorkspaces from '../../../notebook/ConnectedWorkspaces';

type DataConnectionsTableRowProps = {
  obj: DataConnection;
};

const DataConnectionsTableRow: React.FC<DataConnectionsTableRowProps> = ({ obj }) => {
  return (
    <Tr>
      <Td>
        <Title headingLevel="h4">{getDataConnectionName(obj)}</Title>
        <Text>{getDataConnectionDescription(obj)}</Text>
      </Td>
      <Td>{getDataConnectionType(obj)}</Td>
      <Td>
        <ConnectedWorkspaces connectedAnnotation={getDataConnectedNotebookAnnotation(obj)} />
      </Td>
      <Td>{getDataConnectionProvider(obj)}</Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Edit data connection',
              onClick: () => {
                alert('Not implemented yet');
              },
            },
            {
              title: 'Delete data connection',
              onClick: () => {
                alert('Not implemented yet');
              },
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default DataConnectionsTableRow;
