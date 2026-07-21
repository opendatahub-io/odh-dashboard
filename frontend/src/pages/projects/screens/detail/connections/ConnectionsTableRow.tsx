import * as React from 'react';
import { ActionsColumn, IAction, Td, Tr } from '@patternfly/react-table';
import { Button, Icon, LabelGroup, Truncate } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
} from '@odh-dashboard/k8s-core';
import {
  Connection,
  ConnectionTestStatus,
  ConnectionTypeConfigMapObj,
  CONNECTION_TEST_ANNOTATIONS,
} from '#~/concepts/connectionTypes/types';
import { TableRowTitleDescription } from '#~/components/table';
import {
  getConnectionTypeDisplayName,
  getModelServingCompatibility,
} from '#~/concepts/connectionTypes/utils';
import CompatibilityLabel from '#~/concepts/connectionTypes/CompatibilityLabel';
import ConnectedResources from '#~/pages/projects/screens/detail/connections/ConnectedResources';
import ConnectionTestStatusLabel from '#~/concepts/connectionTypes/ConnectionTestStatusLabel';

type ConnectionsTableRowProps = {
  obj: Connection;
  connectionTypes?: ConnectionTypeConfigMapObj[];
  kebabActions: IAction[];
  showCompatibilityCell?: boolean;
  showConnectedResourcesCell?: boolean;
  showStatusCell?: boolean;
  showWarningIcon?: boolean;
  onEditConnection?: (connection: Connection) => void;
  isTesting?: boolean;
};

const isValidStatus = (value: string): value is ConnectionTestStatus =>
  Object.values<string>(ConnectionTestStatus).includes(value);

const ConnectionsTableRow: React.FC<ConnectionsTableRowProps> = ({
  obj,
  connectionTypes,
  kebabActions,
  showCompatibilityCell = true,
  showConnectedResourcesCell = true,
  showStatusCell = true,
  showWarningIcon = false,
  onEditConnection,
  isTesting = false,
}) => {
  const connectionTypeDisplayName = React.useMemo(
    () => getConnectionTypeDisplayName(obj, connectionTypes ?? []) || 'Unknown',
    [obj, connectionTypes],
  );

  const compatibleTypes = getModelServingCompatibility(obj);

  const statusAnnotation = obj.metadata.annotations[CONNECTION_TEST_ANNOTATIONS.STATUS];
  const connectionStatus = isTesting
    ? ConnectionTestStatus.TESTING
    : statusAnnotation && isValidStatus(statusAnnotation)
    ? statusAnnotation
    : ConnectionTestStatus.NOT_TESTED;
  const connectionTimestamp = obj.metadata.annotations[CONNECTION_TEST_ANNOTATIONS.TIMESTAMP];

  const nameContent = onEditConnection ? (
    <Button
      variant="link"
      isInline
      onClick={() => onEditConnection(obj)}
      data-testid="connection-name-link"
    >
      <Truncate content={getDisplayNameFromK8sResource(obj)} />
    </Button>
  ) : (
    <Truncate content={getDisplayNameFromK8sResource(obj)} />
  );

  return (
    <Tr>
      <Td dataLabel="Name">
        <TableRowTitleDescription
          title={nameContent}
          titleIcon={
            showWarningIcon ? (
              <Icon status="warning" className="pf-v6-u-pl-lg">
                <ExclamationTriangleIcon />
              </Icon>
            ) : undefined
          }
          resource={obj}
          description={getDescriptionFromK8sResource(obj)}
          truncateDescriptionLines={2}
          wrapResourceTitle={false}
        />
      </Td>
      <Td dataLabel="Type">{connectionTypeDisplayName}</Td>
      {showCompatibilityCell && (
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
      )}
      {showConnectedResourcesCell && (
        <Td dataLabel="Connected resources">
          <ConnectedResources connection={obj} />
        </Td>
      )}
      {showStatusCell && (
        <Td dataLabel="Status" data-testid="connection-status-cell">
          <ConnectionTestStatusLabel status={connectionStatus} timestamp={connectionTimestamp} />
        </Td>
      )}
      <Td isActionCell>
        <ActionsColumn items={kebabActions} />
      </Td>
    </Tr>
  );
};

export default ConnectionsTableRow;
