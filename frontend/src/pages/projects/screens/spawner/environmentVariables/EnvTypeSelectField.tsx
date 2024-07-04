import * as React from 'react';
import { Button, Split, SplitItem, Stack, StackItem } from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { EnvironmentVariableType, EnvVariable } from '~/pages/projects/types';
import IndentSection from '~/pages/projects/components/IndentSection';
import { asEnumMember, getDashboardMainContainer } from '~/utilities/utils';
import SimpleSelect from '~/components/SimpleSelect';
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
}) => (
  <Split data-testid="environment-variable-field">
    <SplitItem isFilled>
      <Stack hasGutter>
        <StackItem data-testid="environment-variable-type-select">
          <SimpleSelect
            popperProps={{ appendTo: getDashboardMainContainer() }}
            isFullWidth
            toggleLabel={envVariable.type || 'Select environment variable type'}
            options={Object.values(EnvironmentVariableType).map((type) => ({
              key: type,
              children: type,
            }))}
            onSelect={(e, value) => {
              if (typeof value === 'string') {
                const enumValue = asEnumMember(value, EnvironmentVariableType);
                if (enumValue !== null) {
                  onUpdate({
                    type: enumValue,
                  });
                }
              }
            }}
          />
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

export default EnvTypeSelectField;
