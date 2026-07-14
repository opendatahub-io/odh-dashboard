import * as React from 'react';
import { Button, FormGroup, Split, SplitItem, Stack, StackItem } from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { asEnumMember } from '@odh-dashboard/foundation';
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import { EnvironmentVariableType, EnvVariable } from '#~/pages/projects/types';
import IndentSection from '#~/pages/projects/components/IndentSection';
import { getDashboardMainContainer } from '#~/utilities/utils';
import EnvTypeSwitch from './EnvTypeSwitch';

const ENV_VAR_POPPER_PROPS = { appendTo: getDashboardMainContainer() };

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
  const selectId = React.useId().replace(/:/g, '');

  return (
    <FormGroup isRequired label="Variable type" fieldId={selectId}>
      <Split data-testid="environment-variable-field">
        <SplitItem isFilled>
          <Stack hasGutter>
            <StackItem data-testid="environment-variable-type-select">
              <SimpleSelect
                dataTestId="environment-variable-type-toggle"
                ariaLabel="Variable type"
                toggleProps={{ id: selectId }}
                popperProps={ENV_VAR_POPPER_PROPS}
                isFullWidth
                value={envVariable.type ?? undefined}
                placeholder="Select environment variable type"
                options={Object.values(EnvironmentVariableType).map(
                  (type): SimpleSelectOption => ({
                    key: type,
                    label: type,
                  }),
                )}
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
            aria-label={`Remove ${envVariable.type ?? 'environment'} variable`}
            icon={<MinusCircleIcon />}
            onClick={() => onRemove()}
          />
        </SplitItem>
      </Split>
    </FormGroup>
  );
};

export default EnvTypeSelectField;
