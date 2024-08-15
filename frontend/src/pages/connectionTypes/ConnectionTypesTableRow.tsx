import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Label, Switch, Timestamp, TimestampTooltipVariant } from '@patternfly/react-core';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { relativeTime } from '~/utilities/time';
import { updateConnectionTypeEnabled } from '~/services/connectionTypesService';
import useNotification from '~/utilities/useNotification';
import { TableRowTitleDescription } from '~/components/table';
import {
  getCreatorFromK8sResource,
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
  ownedByDSC,
} from '~/concepts/k8s/utils';

type ConnectionTypesTableRowProps = {
  obj: ConnectionTypeConfigMapObj;
  onUpdate: () => void;
};

const ConnectionTypesTableRow: React.FC<ConnectionTypesTableRowProps> = ({ obj, onUpdate }) => {
  const notification = useNotification();
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isEnabled, setIsEnabled] = React.useState(false);
  const createdDate = obj.metadata.creationTimestamp
    ? new Date(obj.metadata.creationTimestamp)
    : undefined;
  const creator = getCreatorFromK8sResource(obj);

  const onUpdateEnabled = (enabled: boolean) => {
    setIsUpdating(true);
    setIsEnabled(enabled);

    updateConnectionTypeEnabled(obj, enabled)
      .then((response) => {
        setIsUpdating(false);
        if (response.success) {
          onUpdate();
          return;
        }
        notification.error(
          `Error ${enabled} ? 'enabling' : 'disabling'} the connection type`,
          response.error,
        );
        setIsEnabled(!enabled);
      })
      .catch((e) => {
        notification.error(
          `Error ${enabled} ? 'enabling' : 'disabling'} the connection type`,
          e.message,
        );
        setIsEnabled(!enabled);
      })
      .finally(() => {
        setIsUpdating(false);
      });
  };

  React.useEffect(() => {
    setIsEnabled(obj.metadata.annotations?.['opendatahub.io/enabled'] === 'true');
  }, [obj.metadata.annotations]);

  return (
    <Tr>
      <Td dataLabel="Name" width={50}>
        <TableRowTitleDescription
          title={getDisplayNameFromK8sResource(obj)}
          description={getDescriptionFromK8sResource(obj)}
        />
      </Td>
      <Td dataLabel="Creator" data-testid="connection-type-creator">
        {ownedByDSC(obj) ? (
          <Label data-testid="connection-type-user-label">{creator}</Label>
        ) : (
          creator
        )}
      </Td>
      <Td dataLabel="Created" data-testid="connection-type-created" modifier="nowrap">
        <Timestamp date={createdDate} tooltip={{ variant: TimestampTooltipVariant.default }}>
          {createdDate ? relativeTime(Date.now(), createdDate.getTime()) : 'Unknown'}
        </Timestamp>
      </Td>
      <Td dataLabel="Enabled">
        <Switch
          isChecked={isEnabled}
          aria-label="toggle enabled"
          onChange={(_ev, enabled) => onUpdateEnabled(enabled)}
          data-testid="connection-type-enable-switch"
          isDisabled={isUpdating}
        />
      </Td>
      <Td className="odh-project-table__action-column" isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Edit',
              isAriaDisabled: true,
            },
            {
              title: 'Duplicate',
              isAriaDisabled: true,
            },
            {
              title: 'Delete',
              isAriaDisabled: true,
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default ConnectionTypesTableRow;
