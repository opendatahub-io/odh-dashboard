import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Label, LabelGroup } from '@patternfly/react-core';
import { ConnectionTypes } from '~/pages/connectionTypes/const';
import ConnectionTypesEnabledToggle from '~/pages/connectionTypes/ConnectionTypesEnabledToggle';
import ConnectionTypesTableRowTime from '~/pages/connectionTypes/ConnectionTypesTableRowTime';

type ConnectionTypesTableRowProps = {
  obj: ConnectionTypes;
};

const ConnectionTypesTableRow: React.FC<ConnectionTypesTableRowProps> = ({ obj }) => (
  <Tr>
    <Td dataLabel="Name" width={70}>
      <div>{obj.name}</div>
      <div>{obj.description}</div>
    </Td>
    <Td dataLabel="Creator">
      {obj.creator === 'Pre-installed' ? (
        <LabelGroup>
          <Label>Pre-installed</Label>
        </LabelGroup>
      ) : (
        obj.creator
      )}
    </Td>
    <Td dataLabel="Created">
      <ConnectionTypesTableRowTime date={new Date(obj.created)} />
    </Td>
    <Td dataLabel="Enabled">
      <ConnectionTypesEnabledToggle />
    </Td>
  </Tr>
);

export default ConnectionTypesTableRow;
