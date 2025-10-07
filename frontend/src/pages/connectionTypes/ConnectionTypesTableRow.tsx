import * as React from 'react';
import { useNavigate } from 'react-router';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import {
  Label,
  LabelGroup,
  Switch,
  Timestamp,
  TimestampTooltipVariant,
  Truncate,
} from '@patternfly/react-core';
import { ConnectionTypeConfigMapObj } from '#~/concepts/connectionTypes/types';
import { relativeTime } from '#~/utilities/time';
import { updateConnectionTypeEnabled } from '#~/services/connectionTypesService';
import useNotification from '#~/utilities/useNotification';
import { TableRowTitleDescription } from '#~/components/table';
import {
  getCreatorFromK8sResource,
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
  isOOTB,
} from '#~/concepts/k8s/utils';
import { connectionTypeColumns } from '#~/pages/connectionTypes/columns';
import CategoryLabel from '#~/concepts/connectionTypes/CategoryLabel';
import { getModelServingCompatibility } from '#~/concepts/connectionTypes/utils';
import CompatibilityLabel from '#~/concepts/connectionTypes/CompatibilityLabel';
import ConnectionTypePreviewModal from '#~/concepts/connectionTypes/ConnectionTypePreviewModal';

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
  const [showPreview, setShowPreview] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isEnabled, setIsEnabled] = React.useState(
    () => obj.metadata.annotations?.['opendatahub.io/disabled'] !== 'true',
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

  const compatibleTypes = React.useMemo(() => getModelServingCompatibility(obj), [obj]);

  return (
    <Tr>
      <Td dataLabel={connectionTypeColumns[0].label}>
        <TableRowTitleDescription
          title={<Truncate content={getDisplayNameFromK8sResource(obj)} />}
          description={getDescriptionFromK8sResource(obj)}
          truncateDescriptionLines={2}
        />
      </Td>
      <Td dataLabel={connectionTypeColumns[1].label}>
        {obj.data?.category?.length ? (
          <LabelGroup>
            {obj.data.category.map((category) => (
              <CategoryLabel key={category} category={category} />
            ))}
          </LabelGroup>
        ) : (
          '-'
        )}
      </Td>
      <Td dataLabel={connectionTypeColumns[2].label} data-testid="connection-type-compatibility">
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
      <Td dataLabel={connectionTypeColumns[3].label} data-testid="connection-type-creator">
        {isOOTB(obj) ? <Label data-testid="connection-type-user-label">{creator}</Label> : creator}
      </Td>
      <Td
        dataLabel={connectionTypeColumns[4].label}
        data-testid="connection-type-created"
        modifier="nowrap"
      >
        <Timestamp date={createdDate} tooltip={{ variant: TimestampTooltipVariant.default }}>
          {createdDate ? relativeTime(Date.now(), createdDate.getTime()) : 'Unknown'}
        </Timestamp>
      </Td>
      <Td dataLabel={connectionTypeColumns[5].label}>
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
              title: 'Preview',
              onClick: () => setShowPreview(true),
            },
            ...(!isOOTB(obj)
              ? [
                  {
                    title: 'Edit',
                    onClick: () =>
                      navigate(
                        `/settings/environment-setup/connection-types/edit/${obj.metadata.name}`,
                      ),
                  },
                ]
              : []),
            {
              title: 'Duplicate',
              onClick: () =>
                navigate(
                  `/settings/environment-setup/connection-types/duplicate/${obj.metadata.name}`,
                ),
            },
            ...(!isOOTB(obj)
              ? [
                  { isSeparator: true },
                  {
                    title: 'Delete',
                    onClick: () => handleDelete(obj),
                  },
                ]
              : []),
          ]}
        />
      </Td>
      {showPreview ? (
        <ConnectionTypePreviewModal obj={obj} onClose={() => setShowPreview(false)} />
      ) : null}
    </Tr>
  );
};

export default ConnectionTypesTableRow;
