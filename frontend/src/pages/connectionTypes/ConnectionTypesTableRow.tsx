import * as React from 'react';
import { useNavigate } from 'react-router';
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
import { connectionTypeColumns } from '~/pages/connectionTypes/columns';

type ConnectionTypesTableRowProps = {
  obj: ConnectionTypeConfigMapObj;
  onUpdate: () => void;
  handleDelete: (cr: ConnectionTypeConfigMapObj) => void;
};

const ConnectionTypesTableRow: React.FC<ConnectionTypesTableRowProps> = ({
  obj,
  onUpdate,
  handleDelete,
}) => {
  const navigate = useNavigate();
  const notification = useNotification();
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isEnabled, setIsEnabled] = React.useState(
    () => obj.metadata.annotations?.['opendatahub.io/enabled'] === 'true',
  );
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
      <Td dataLabel={connectionTypeColumns[0].label} width={50}>
        <TableRowTitleDescription
          title={getDisplayNameFromK8sResource(obj)}
          description={getDescriptionFromK8sResource(obj)}
        />
      </Td>
      <Td dataLabel={connectionTypeColumns[1].label} data-testid="connection-type-creator">
        {ownedByDSC(obj) ? (
          <Label data-testid="connection-type-user-label">{creator}</Label>
        ) : (
          creator
        )}
      </Td>
      <Td
        dataLabel={connectionTypeColumns[2].label}
        data-testid="connection-type-created"
        modifier="nowrap"
      >
        <Timestamp date={createdDate} tooltip={{ variant: TimestampTooltipVariant.default }}>
          {createdDate ? relativeTime(Date.now(), createdDate.getTime()) : 'Unknown'}
        </Timestamp>
      </Td>
      <Td dataLabel={connectionTypeColumns[3].label}>
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
              onClick: () => navigate(`/connectionTypes/edit/${obj.metadata.name}`),
            },
            {
              title: 'Duplicate',
              onClick: () => navigate(`/connectionTypes/duplicate/${obj.metadata.name}`),
            },
            {
              title: 'Delete',
              onClick: () => handleDelete(obj),
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default ConnectionTypesTableRow;
