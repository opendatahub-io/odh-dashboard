import * as React from 'react';
import {
  Button,
  FormGroup,
  Radio,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { EnvironmentVariableType, EnvVariable } from '#~/pages/projects/types';
import EnvTypeSwitch from './EnvTypeSwitch';

type EnvTypeSelectFieldProps = {
  envVariable: EnvVariable;
  onUpdate: (envVariable: EnvVariable) => void;
  onRemove: () => void;
  namespace: string;
  usedSecretNames?: Set<string>;
  inlineKeyNames?: Set<string>;
};

const ENV_TYPE_DESCRIPTIONS: Record<EnvironmentVariableType, string> = {
  [EnvironmentVariableType.CONFIG_MAP]:
    'Store non-confidential configuration data as key-value pairs',
  [EnvironmentVariableType.SECRET]: 'Store sensitive data such as passwords, tokens, and keys',
};

const EnvTypeSelectField: React.FC<EnvTypeSelectFieldProps> = ({
  envVariable,
  onUpdate,
  onRemove,
  namespace,
  usedSecretNames,
  inlineKeyNames,
}) => {
  const uniqueId = React.useId();
  return (
    <FormGroup isRequired label="Variable type" fieldId="environment-variable-type-select">
      <Split data-testid="environment-variable-field">
        <SplitItem isFilled>
          <Stack hasGutter data-testid="environment-variable-type-select">
            {Object.values(EnvironmentVariableType).map((type) => (
              <StackItem key={type}>
                <Radio
                  id={`${uniqueId}-env-type-${type}`}
                  name={`${uniqueId}-env-variable-type`}
                  label={type}
                  description={ENV_TYPE_DESCRIPTIONS[type]}
                  isChecked={envVariable.type === type}
                  onChange={() => onUpdate({ type })}
                  data-testid={`env-type-radio-${type}`}
                  body={
                    envVariable.type === type ? (
                      <EnvTypeSwitch
                        env={envVariable}
                        onUpdate={(envValue) => onUpdate({ ...envVariable, values: envValue })}
                        namespace={namespace}
                        onExistingSecretRefsUpdate={(refs) =>
                          onUpdate({ ...envVariable, existingSecretRefs: refs })
                        }
                        usedSecretNames={usedSecretNames}
                        inlineKeyNames={inlineKeyNames}
                      />
                    ) : undefined
                  }
                />
              </StackItem>
            ))}
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
};

export default EnvTypeSelectField;
