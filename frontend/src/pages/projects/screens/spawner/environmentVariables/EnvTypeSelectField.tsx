import * as React from 'react';
import {
  Button,
  Select,
  SelectOption,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { EnvironmentVariableType, EnvVariable } from '~/pages/projects/types';
import IndentSection from '~/pages/projects/components/IndentSection';
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
    <Split>
      <SplitItem isFilled>
        <Stack hasGutter>
          <StackItem>
            <Select
              isOpen={open}
              onToggle={() => setOpen(!open)}
              selections={envVariable.type || ''}
              placeholderText="Select one"
              aria-label="Select one"
              onSelect={(e, value) => {
                if (typeof value === 'string') {
                  onUpdate({
                    type: value as EnvironmentVariableType,
                  });
                  setOpen(false);
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
          aria-label="Remove environment variable"
          icon={<MinusCircleIcon />}
          onClick={() => onRemove()}
        />
      </SplitItem>
    </Split>
  );
};

export default EnvTypeSelectField;
