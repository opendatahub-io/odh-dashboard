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
  Button,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Controller, useFormContext } from 'react-hook-form';
import { RegisterDataFormData } from '~/app/schemas/registerData.schema';
import { ConnectionModel } from '~/app/types';
import { EditAssetFormData } from '~/app/schemas/editAsset.schema';

type DataLocationSectionProps = {
  connections?: ConnectionModel[];
  connectionsLoaded?: boolean;
  connectionsError?: Error;
  onRegisterNewConnection?: () => void;
  pathLabel?: string;
  showConnection?: boolean;
  isConnectionReadOnly?: boolean;
};

const REGISTER_NEW_CONNECTION_VALUE = '__register-new-connection__';

const DataLocationSection: React.FC<DataLocationSectionProps> = (props) => {
  const {
    connections = [],
    connectionsLoaded = true,
    connectionsError,
    onRegisterNewConnection,
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

      {showConnection ? (
        <Controller
          name="connection"
          control={control}
          render={({ field }) => (
            <FormGroup label="Connection" fieldId="data-connection">
              <Select
                isOpen={isConnectionOpen}
                selected={field.value}
                onSelect={(_event, value) => {
                  const selectedValue = String(value);
                  if (selectedValue === REGISTER_NEW_CONNECTION_VALUE && onRegisterNewConnection) {
                    setIsConnectionOpen(false);
                    onRegisterNewConnection();
                    return;
                  }
                  field.onChange(selectedValue);
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
                  {connections.length === 0 && !onRegisterNewConnection ? (
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
                  {onRegisterNewConnection ? (
                    <SelectOption value={REGISTER_NEW_CONNECTION_VALUE}>
                      <Button
                        variant="link"
                        isInline
                        icon={<PlusCircleIcon />}
                        data-testid="register-new-connection-option"
                      >
                        Register new connection
                      </Button>
                    </SelectOption>
                  ) : null}
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
