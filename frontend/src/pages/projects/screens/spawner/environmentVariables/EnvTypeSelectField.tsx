import * as React from 'react';
import { Button, Split, SplitItem, Stack, StackItem } from '@patternfly/react-core';
import { Select, SelectOption } from '@patternfly/react-core/deprecated';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { EnvironmentVariableType, EnvVariable } from '~/pages/projects/types';
import IndentSection from '~/pages/projects/components/IndentSection';
import { asEnumMember } from '~/utilities/utils';
import EnvTypeSwitch from './EnvTypeSwitch';

type EnvTypeSelectFieldProps = {
  envVariable: EnvVariable;
  onUpdate: (envVariable: EnvVariable) => void;
  onRemove: () => void;
};

const EnvTypeSelectField: React.FC<EnvTypeSelectFieldProps> = ({
  envVariable,
  onUpdate,
  onRemove,
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Split data-testid="environment-variable-field">
      <SplitItem isFilled>
        <Stack hasGutter>
          <StackItem data-testid="environment-variable-type-select">
            <Select
              isOpen={open}
              onToggle={() => setOpen(!open)}
              selections={envVariable.type || ''}
              placeholderText="Select environment variable type"
              aria-label="Select environment variable type"
              onSelect={(e, value) => {
                if (typeof value === 'string') {
                  const enumValue = asEnumMember(value, EnvironmentVariableType);
                  if (enumValue !== null) {
                    onUpdate({
                      type: enumValue,
                    });
                    setOpen(false);
                  }
                }
              }}
            >
              {Object.values(EnvironmentVariableType).map((type) => (
                <SelectOption key={type} value={type}>
                  {type}
                </SelectOption>
              ))}
            </Select>
          </StackItem>
          {envVariable.type && (
            <StackItem>
              <IndentSection>
                <EnvTypeSwitch
                  env={envVariable}
                  onUpdate={(envValue) => onUpdate({ ...envVariable, values: envValue })}
                />
              </IndentSection>
            </StackItem>
          )}
        </Stack>
      </SplitItem>
      <SplitItem>
        <Button
          variant="plain"
          data-testid="remove-environment-variable-button"
          aria-label="Remove environment variable"
          icon={<MinusCircleIcon />}
          onClick={() => onRemove()}
        />
      </SplitItem>
    </Split>
  );
};

export default EnvTypeSelectField;
