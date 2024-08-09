import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import {
  Flex,
  Icon,
  Label,
  Switch,
  Text,
  TextContent,
  Timestamp,
  TimestampTooltipVariant,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import { relativeTime } from '~/utilities/time';
import { updateConnectionTypeEnabled } from '~/services/connectionTypesService';

type ConnectionTypesTableRowProps = {
  obj: ConnectionTypeConfigMapObj;
  onUpdate: () => void;
};

const ConnectionTypesTableRow: React.FC<ConnectionTypesTableRowProps> = ({ obj, onUpdate }) => {
  const [statusMessage, setStatusMessage] = React.useState<string | undefined>();
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();
  const pendingEnabledState = React.useRef<'true' | 'false' | undefined>();
  const createdDate = obj.metadata.creationTimestamp
    ? new Date(obj.metadata.creationTimestamp)
    : undefined;

  const onUpdateEnabled = async (enabled: boolean) => {
    setStatusMessage(enabled ? 'Enabling...' : 'Disabling...');
    setErrorMessage(undefined);
    pendingEnabledState.current = enabled ? 'true' : 'false';

    const response = await updateConnectionTypeEnabled(obj, enabled);
    if (response.success) {
      onUpdate();
      return;
    }

    setStatusMessage('Failed');
    setErrorMessage(response.error || `Failed to ${enabled ? 'enable' : 'disable'}`);
  };

  React.useEffect(() => {
    if (
      pendingEnabledState.current !== undefined &&
      obj.metadata.annotations?.['opendatahub.io/enabled'] === pendingEnabledState.current
    ) {
      setStatusMessage(undefined);
      pendingEnabledState.current = undefined;
    }
  }, [obj.metadata.annotations]);

  return (
    <Tr>
      <Td dataLabel="Name" width={70}>
        <Flex direction={{ default: 'column' }} gap={{ default: 'gapSm' }}>
          <TextContent>
            <Text data-testid="connection-type-name">
              {obj.metadata.annotations?.['openshift.io/display-name'] || obj.metadata.name}
            </Text>
          </TextContent>
          <TextContent>
            <Text
              data-testid="connection-type-description"
              style={{ color: 'var(--pf-v5-c-content--blockquote--Color)' }}
            >
              {obj.metadata.annotations?.['openshift.io/description']}
            </Text>
          </TextContent>
        </Flex>
      </Td>
      <Td dataLabel="Creator" data-testid="connection-type-creator">
        {obj.metadata.annotations?.['opendatahub.io/username'] === 'Pre-installed' ? (
          <Label data-testid="connection-type-user-label">Pre-installed</Label>
        ) : (
          <TextContent>
            <Text>{obj.metadata.annotations?.['opendatahub.io/username'] || 'unknown'}</Text>
          </TextContent>
        )}
      </Td>
      <Td dataLabel="Created" data-testid="connection-type-created">
        <span style={{ whiteSpace: 'nowrap' }}>
          <Timestamp date={createdDate} tooltip={{ variant: TimestampTooltipVariant.default }}>
            {createdDate ? relativeTime(Date.now(), createdDate.getTime()) : 'Unknown'}
          </Timestamp>
        </span>
      </Td>
      <Td dataLabel="Enabled">
        <Flex style={{ minWidth: 150 }} gap={{ default: 'gapSm' }}>
          <span style={{ top: 4 }}>
            <Switch
              id={`connection-type-enabled-toggle-${obj.metadata.name}`}
              isChecked={obj.metadata.annotations?.['opendatahub.io/enabled'] === 'true'}
              aria-label="toggle enabled"
              onChange={(_ev, enabled) => onUpdateEnabled(enabled)}
              data-testid="connection-type-enable-switch"
            />
          </span>
          <TextContent>
            <Text data-testid="connection-type-enable-status">{statusMessage}</Text>
          </TextContent>
          {errorMessage ? (
            <Tooltip content={errorMessage}>
              <Icon isInline aria-label="error icon" role="button" status="danger" tabIndex={0}>
                <ExclamationCircleIcon />
              </Icon>
            </Tooltip>
          ) : null}
        </Flex>
      </Td>
    </Tr>
  );
};

export default ConnectionTypesTableRow;
