import * as React from 'react';
import {
  Button,
  FormGroup,
  HelperText,
  HelperTextItem,
  Radio,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { Connection } from '#~/concepts/connectionTypes/types';
import {
  EnvironmentVariableType,
  EnvVariable,
  ExistingSecretRef,
  EnvVariableData,
} from '#~/pages/projects/types';
import IndentSection from '#~/pages/projects/components/IndentSection';
import EnvTypeSwitch from './EnvTypeSwitch';

type EnvTypeSelectFieldProps = {
  envVariable: EnvVariable;
  onUpdate: (envVariable: EnvVariable) => void;
  onRemove: () => void;
  namespace: string;
  connections: Connection[];
  allEnvVariables: EnvVariable[];
};

const EnvTypeSelectField: React.FC<EnvTypeSelectFieldProps> = ({
  envVariable,
  onUpdate,
  onRemove,
  namespace,
  connections,
  allEnvVariables,
}) => {
  const groupId = React.useId().replace(/:/g, '');

  return (
    <FormGroup isRequired label="Variable type" fieldId={groupId}>
      <Split data-testid="environment-variable-field">
        <SplitItem isFilled>
          <Stack hasGutter>
            <StackItem data-testid="environment-variable-type-select">
              <Stack hasGutter>
                <StackItem>
                  <Radio
                    id={`${groupId}-configmap`}
                    data-testid="env-type-radio-configmap"
                    name={groupId}
                    label="Config Map"
                    description="Store non-confidential configuration data as key-value pairs"
                    isChecked={envVariable.type === EnvironmentVariableType.CONFIG_MAP}
                    onChange={() => onUpdate({ type: EnvironmentVariableType.CONFIG_MAP })}
                  />
                </StackItem>
                <StackItem>
                  <Radio
                    id={`${groupId}-secret`}
                    data-testid="env-type-radio-secret"
                    name={groupId}
                    label="Secret"
                    description="Store sensitive data such as passwords, tokens, and keys"
                    isChecked={envVariable.type === EnvironmentVariableType.SECRET}
                    onChange={() => onUpdate({ type: EnvironmentVariableType.SECRET })}
                  />
                </StackItem>
              </Stack>
            </StackItem>
            {envVariable.type ? (
              <StackItem>
                <IndentSection>
                  <EnvTypeSwitch
                    env={envVariable}
                    onUpdate={(update: {
                      values?: EnvVariableData;
                      existingSecrets?: ExistingSecretRef[];
                    }) => onUpdate({ ...envVariable, ...update })}
                    namespace={namespace}
                    connections={connections}
                    allEnvVariables={allEnvVariables}
                  />
                </IndentSection>
              </StackItem>
            ) : null}
            <StackItem>
              <HelperText>
                <HelperTextItem variant="indeterminate">
                  Environment variables are set at workbench start. If secret values change (e.g.,
                  credential rotation), restart the workbench to pick up new values.
                </HelperTextItem>
              </HelperText>
            </StackItem>
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
