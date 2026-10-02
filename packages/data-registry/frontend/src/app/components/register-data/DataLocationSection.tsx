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
import { getConnectionKey, getConnectionIdentifier } from '~/app/utilities/connectionUtils';

type DataLocationSectionProps = {
  connections: ConnectionModel[];
  connectionsLoaded: boolean;
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
    pathLabel = 'Path',
    connectionWarnings = [],
    currentConnection,
    isConnectionDisabled = false,
  } = props;
  const { control } = useFormContext<RegisterDataFormData | EditAssetFormData>();
  const [isConnectionOpen, setIsConnectionOpen] = React.useState(false);

  const getToggleLabel = (value: string): string => {
    if (!value) {
      return 'Select a connection';
    }
    const match = connections.find((c) => getConnectionKey(c) === value);
    const currentConnectionName =
      currentConnection && getConnectionKey(currentConnection) === value
        ? currentConnection.name
        : undefined;
    return (
      match?.name ||
      currentConnectionName ||
      (match ? getConnectionIdentifier(match) : value.slice(value.indexOf(':') + 1))
    );
  };

  return (
    <FormSection title="Data location" titleElement="h2">
      <Content component="p">
        Specify where the data is stored by selecting a connection or providing path details.
      </Content>

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
      <Controller
        name="connection"
        control={control}
        render={({ field }) => (
          <FormGroup label="Connection" fieldId="data-connection">
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
                  id="data-connection"
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
                  (conn) => getConnectionKey(conn) === getConnectionKey(currentConnection),
                ) ? (
                  <SelectOption value={getConnectionKey(currentConnection)}>
                    {currentConnection.name || getConnectionIdentifier(currentConnection)}
                  </SelectOption>
                ) : null}
                {connections.length === 0 ? (
                  <SelectOption value="" isDisabled>
                    No connections available
                  </SelectOption>
                ) : (
                  connections.map((conn) => (
                    <SelectOption
                      key={getConnectionKey(conn)}
                      value={getConnectionKey(conn)}
                      description={conn.connectionType}
                      data-testid={`connection-option-${getConnectionKey(conn)}`}
                    >
                      {conn.name || getConnectionIdentifier(conn)}
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
