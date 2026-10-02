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
import { ConnectionModel } from '~/app/types';
import { EditAssetFormData } from '~/app/schemas/editAsset.schema';

type DataLocationSectionProps = {
  connections?: ConnectionModel[];
  connectionsLoaded?: boolean;
  connectionsError?: Error;
  pathLabel?: string;
  showConnection?: boolean;
  isConnectionReadOnly?: boolean;
};

const DataLocationSection: React.FC<DataLocationSectionProps> = (props) => {
  const {
    connections = [],
    connectionsLoaded = true,
    connectionsError,
    pathLabel = 'Path',
    showConnection = false,
    isConnectionReadOnly = false,
  } = props;
  const { control } = useFormContext<RegisterDataFormData | EditAssetFormData>();
  const [isConnectionOpen, setIsConnectionOpen] = React.useState(false);

  const getToggleLabel = (value: string): string => {
    if (!value) {
      return 'Select a connection';
    }
    const match = connections.find((c) => c.name === value);
    return match?.displayName || match?.name || value;
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

      {showConnection ? (
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
                    isDisabled={!!connectionsError || isConnectionReadOnly}
                    data-testid="data-connection-toggle"
                  >
                    {!connectionsLoaded ? <Spinner size="sm" /> : getToggleLabel(field.value)}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {connections.length === 0 ? (
                    <SelectOption value="" isDisabled>
                      No connections available
                    </SelectOption>
                  ) : null}
                  {connections.map((conn) => (
                    <SelectOption
                      key={conn.name}
                      value={conn.name}
                      description={conn.connectionType}
                      data-testid={`connection-option-${conn.name}`}
                    >
                      {conn.displayName || conn.name}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </FormGroup>
          )}
        />
      ) : null}

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
