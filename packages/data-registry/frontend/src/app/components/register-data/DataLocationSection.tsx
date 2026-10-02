import React from 'react';
import {
  Alert,
  FormGroup,
  FormSection,
  TextInput,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
  Content,
  Spinner,
} from '@patternfly/react-core';
import { Controller, useFormContext } from 'react-hook-form';
import { RegisterDataFormData } from '~/app/schemas/registerData.schema';
import { ConnectionModel, ConnectionRef, ConnectionWarning } from '~/app/types';
import { EditAssetFormData } from '~/app/schemas/editAsset.schema';
import {
  CONNECTION_UNAVAILABLE_LABEL,
  getConnectionDisplayName,
  getConnectionKey,
} from '~/app/utilities/connectionUtils';

type DataLocationSectionProps = {
  connections?: ConnectionModel[];
  connectionsLoaded?: boolean;
  connectionsError?: Error;
  connectionWarnings?: ConnectionWarning[];
  currentConnection?: ConnectionRef | null;
  pathLabel?: string;
  isConnectionDisabled?: boolean;
};

const DataLocationSection: React.FC<DataLocationSectionProps> = (props) => {
  const {
    connections = [],
    connectionsLoaded = true,
    connectionsError,
    connectionWarnings = [],
    currentConnection,
    pathLabel = 'Path',
    isConnectionDisabled = false,
  } = props;
  const { control } = useFormContext<RegisterDataFormData | EditAssetFormData>();
  const [isConnectionOpen, setIsConnectionOpen] = React.useState(false);
  const connectionsResolved = connectionsLoaded && !connectionsError;
  const currentConnectionUnavailable =
    !!currentConnection &&
    connectionsResolved &&
    !connections.some(
      (connection) => getConnectionKey(connection) === getConnectionKey(currentConnection),
    );

  const getToggleLabel = (value: string): string => {
    if (!value) {
      return 'Select a connection';
    }
    const match = connections.find((connection) => getConnectionKey(connection) === value);
    const current = currentConnection && getConnectionKey(currentConnection) === value;
    return getConnectionDisplayName(
      current || match || value,
      connections,
      connectionsLoaded,
      connectionsError,
    );
  };

  return (
    <FormSection title="Asset location" titleElement="h2">
      <Content component="p">Specify where the data is stored within a connection.</Content>

      {connectionsError ? (
        <Alert
          variant="warning"
          isInline
          title="Unable to load connections"
          data-testid="connections-error"
        >
          {connectionsError.message}
        </Alert>
      ) : null}

      {connectionWarnings.map((warning) => (
        <Alert
          key={warning.code}
          variant="warning"
          isInline
          title={warning.message}
          data-testid="connections-warning"
        />
      ))}
      {currentConnectionUnavailable ? (
        <Alert
          variant="warning"
          isInline
          title={CONNECTION_UNAVAILABLE_LABEL}
          data-testid="connection-unavailable-warning"
        >
          This saved connection is currently unavailable. You can keep this reference or select
          another connection.
        </Alert>
      ) : null}
      <Controller
        name="connection"
        control={control}
        render={({ field }) => (
          <FormGroup label="Connection" fieldId="data-connection">
            <Content component="p">
              Select the connection in this project where the data is located.
            </Content>
            <Select
              isOpen={isConnectionOpen}
              selected={field.value}
              onSelect={(_event, value) => {
                field.onChange(String(value));
                setIsConnectionOpen(false);
              }}
              onOpenChange={setIsConnectionOpen}
              toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsConnectionOpen((prev) => !prev)}
                  isExpanded={isConnectionOpen}
                  isFullWidth
                  isDisabled={!connectionsLoaded || !!connectionsError || isConnectionDisabled}
                  data-testid="data-connection-toggle"
                >
                  {!connectionsLoaded && !connectionsError && !field.value ? (
                    <Spinner size="sm" />
                  ) : (
                    getToggleLabel(field.value)
                  )}
                </MenuToggle>
              )}
            >
              <SelectList>
                {currentConnection &&
                !connections.some(
                  (connection) => getConnectionKey(connection) === getConnectionKey(currentConnection),
                ) ? (
                  <SelectOption value={getConnectionKey(currentConnection)}>
                    {getConnectionDisplayName(
                      currentConnection,
                      connections,
                      connectionsLoaded,
                      connectionsError,
                    )}
                  </SelectOption>
                ) : null}
                {connections.length === 0 ? (
                  <SelectOption value="" isDisabled>
                    No connections available
                  </SelectOption>
                ) : (
                  connections.map((connection) => (
                    <SelectOption
                      key={getConnectionKey(connection)}
                      value={getConnectionKey(connection)}
                      description={connection.connectionType}
                      data-testid={`connection-option-${getConnectionKey(connection)}`}
                    >
                      {getConnectionDisplayName(
                        connection,
                        connections,
                        connectionsLoaded,
                        connectionsError,
                      )}
                    </SelectOption>
                  ))
                )}
              </SelectList>
            </Select>
          </FormGroup>
        )}
      />

      <Controller
        name="path"
        control={control}
        render={({ field }) => (
          <FormGroup label={pathLabel} fieldId="data-path">
            <TextInput id="data-path" {...field} data-testid="data-path-input" />
          </FormGroup>
        )}
      />
    </FormSection>
  );
};

export default DataLocationSection;
