import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { DropdownDirection, Text, Title } from '@patternfly/react-core';
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
import ResourceNameTooltip from '../../../components/ResourceNameTooltip';

type DataConnectionsTableRowProps = {
  obj: DataConnection;
  onEditDataConnection: (pvc: DataConnection) => void;
  onDeleteDataConnection: (dataConnection: DataConnection) => void;
  onConnectExistingWorkbench: (dataConnection: DataConnection) => void;
};

const DataConnectionsTableRow: React.FC<DataConnectionsTableRowProps> = ({
  obj,
  onEditDataConnection,
  onDeleteDataConnection,
  onConnectExistingWorkbench,
}) => {
  return (
    <Tr>
      {/* This cell is used to align with the other lists which have a toggle button */}
      <Td className="pf-c-table__toggle">
        <div style={{ width: 46 }} />
      </Td>
      <Td dataLabel="Name">
        <Title headingLevel="h4">
          <ResourceNameTooltip resource={obj.data}>
            {getDataConnectionDisplayName(obj)}
          </ResourceNameTooltip>
        </Title>
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
          dropdownDirection={DropdownDirection.up}
          items={[
            {
              title: 'Edit data connection',
              onClick: () => {
                onEditDataConnection(obj);
              },
            },
            {
              title: 'Change connected workbenches',
              onClick: () => {
                onConnectExistingWorkbench(obj);
              },
            },
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
