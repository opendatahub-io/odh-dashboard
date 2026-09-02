import React from 'react';
import {
  FormGroup,
  FormSection,
  TextInput,
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  MenuToggleElement,
  Content,
} from '@patternfly/react-core';
import { Controller, useFormContext } from 'react-hook-form';
import { RegisterDataFormData } from '~/app/schemas/registerData.schema';

const DataLocationSection: React.FC = () => {
  const { control } = useFormContext<RegisterDataFormData>();
  const [isConnectionOpen, setIsConnectionOpen] = React.useState(false);

  return (
    <FormSection title="Data location" titleElement="h2">
      <Content component="p">
        Specify where the data is stored by selecting a connection or providing path details.
      </Content>

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
                  onClick={() => setIsConnectionOpen((prev) => !prev)}
                  isExpanded={isConnectionOpen}
                  isFullWidth
                  data-testid="data-connection-toggle"
                >
                  {field.value || 'Select a connection'}
                </MenuToggle>
              )}
            >
              <SelectList>
                <SelectOption value="" isDisabled>
                  No connections available
                </SelectOption>
              </SelectList>
            </Select>
          </FormGroup>
        )}
      />

      <Controller
        name="path"
        control={control}
        render={({ field }) => (
          <FormGroup label="Path" fieldId="data-path">
            <TextInput id="data-path" {...field} data-testid="data-path-input" />
          </FormGroup>
        )}
      />
    </FormSection>
  );
};

export default DataLocationSection;
