import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { LabelGroup, Truncate } from '@patternfly/react-core';
import { Connection, ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { TableRowTitleDescription } from '~/components/table';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { getCompatibleTypes } from '~/concepts/connectionTypes/utils';
import CompatibilityLabel from '~/concepts/connectionTypes/CompatibilityLabel';
import ConnectedResources from '~/pages/projects/screens/detail/connections/ConnectedResources';

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

  const compatibleTypes = obj.data
    ? getCompatibleTypes(
        Object.entries(obj.data)
          .filter(([, value]) => !!value)
          .map(([key]) => key),
      )
    : [];

  return (
    <Tr>
      <Td dataLabel="Name">
        <TableRowTitleDescription
          title={<Truncate content={getDisplayNameFromK8sResource(obj)} />}
          boldTitle={false}
          resource={obj}
          description={getDescriptionFromK8sResource(obj)}
          truncateDescriptionLines={2}
          wrapResourceTitle={false}
        />
      </Td>
      <Td dataLabel="Type">{connectionTypeDisplayName}</Td>
      <Td dataLabel="Compatibility">
        {compatibleTypes.length ? (
          <LabelGroup>
            {compatibleTypes.map((compatibleType) => (
              <CompatibilityLabel key={compatibleType} type={compatibleType} />
            ))}
          </LabelGroup>
        ) : (
          '-'
        )}
      </Td>
      <Td dataLabel="Connected resources">
        <ConnectedResources connection={obj} />
      </Td>
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
