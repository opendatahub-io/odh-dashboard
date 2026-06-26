import * as React from 'react';
import { Button, FormGroup, Split, SplitItem, Stack, StackItem } from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { EnvironmentVariableType, EnvVariable } from '#~/pages/projects/types';
import IndentSection from '#~/pages/projects/components/IndentSection';
import { asEnumMember, getDashboardMainContainer } from '#~/utilities/utils';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import EnvTypeSwitch from './EnvTypeSwitch';

type EnvTypeSelectFieldProps = {
  instanceId: number;
  envVariable: EnvVariable;
  existingSecretInUse: boolean;
  onUpdate: (envVariable: EnvVariable) => void;
  onRemove: () => void;
};

const EnvTypeSelectField: React.FC<EnvTypeSelectFieldProps> = ({
  instanceId,
  envVariable,
  existingSecretInUse,
  onUpdate,
  onRemove,
}) => (
  <FormGroup
    isRequired
    label="Variable type"
    fieldId={`environment-variable-type-select-${instanceId}`}
  >
    <Split data-testid="environment-variable-field">
      <SplitItem isFilled>
        <Stack hasGutter>
          <StackItem data-testid="environment-variable-type-select">
            <SimpleSelect
              toggleProps={{ id: `environment-variable-type-select-${instanceId}` }}
              popperProps={{ appendTo: getDashboardMainContainer() }}
              isFullWidth
              value={envVariable.type ?? undefined}
              placeholder="Select environment variable type"
              options={Object.values(EnvironmentVariableType).map((type): SimpleSelectOption => {
                const isExistingSecretDisabled =
                  type === EnvironmentVariableType.EXISTING_SECRET &&
                  existingSecretInUse &&
                  envVariable.type !== EnvironmentVariableType.EXISTING_SECRET;
                return {
                  key: type,
                  label: type,
                  isAriaDisabled: isExistingSecretDisabled,
                  description: isExistingSecretDisabled
                    ? 'Existing secrets are already configured above. Scroll up to manage them.'
                    : undefined,
                };
              })}
              onChange={(value) => {
                const enumValue = asEnumMember(value, EnvironmentVariableType);
                if (enumValue !== null) {
                  onUpdate({
                    type: enumValue,
                  });
                }
              }}
            />
          </StackItem>
          {envVariable.type && (
            <StackItem>
              <IndentSection>
                <EnvTypeSwitch
                  instanceId={instanceId}
                  env={envVariable}
                  onUpdate={(envValue) => onUpdate({ ...envVariable, values: envValue })}
                  onUpdateVariable={onUpdate}
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
  </FormGroup>
);

export default EnvTypeSelectField;
