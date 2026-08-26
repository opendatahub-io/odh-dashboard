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
import { RegisterVolumeFormData } from '~/app/schemas/registerVolume.schema';

const DataLocationSection: React.FC = () => {
  const { control } = useFormContext<RegisterVolumeFormData>();
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
          <FormGroup label="Connection" fieldId="volume-connection">
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
                  data-testid="volume-connection-toggle"
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
          <FormGroup label="Path" fieldId="volume-path">
            <TextInput id="volume-path" {...field} data-testid="volume-path-input" />
          </FormGroup>
        )}
      />
    </FormSection>
  );
};

export default DataLocationSection;
