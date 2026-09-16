import * as React from 'react';
import {
  Button,
  FormGroup,
  HelperText,
  HelperTextItem,
  Radio,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { EnvironmentVariableType, EnvVariable } from '#~/pages/projects/types';
import { UseExistingSecretsResult } from './useExistingSecrets';
import EnvTypeSwitch from './EnvTypeSwitch';

type EnvTypeSelectFieldProps = {
  envVariable: EnvVariable;
  onUpdate: (envVariable: EnvVariable) => void;
  onRemove: () => void;
  usedSecretNames?: Set<string>;
  inlineKeyNames?: Set<string>;
  existingSecretsData: UseExistingSecretsResult;
};

const ENV_TYPE_LABELS: Record<EnvironmentVariableType, string> = {
  [EnvironmentVariableType.CONFIG_MAP]: 'ConfigMap',
  [EnvironmentVariableType.SECRET]: 'Secret',
};

const ENV_TYPE_DESCRIPTIONS: Record<EnvironmentVariableType, string> = {
  [EnvironmentVariableType.CONFIG_MAP]:
    'Non-confidential configuration data stored as key-value pairs.',
  [EnvironmentVariableType.SECRET]: 'Sensitive data such as passwords, tokens, and keys.',
};

const EnvTypeSelectField: React.FC<EnvTypeSelectFieldProps> = ({
  envVariable,
  onUpdate,
  onRemove,
  usedSecretNames,
  inlineKeyNames,
  existingSecretsData,
}) => {
  const uniqueId = React.useId();
  return (
    <FormGroup
      isRequired
      label="Variable type"
      fieldId="environment-variable-type-select"
      data-testid="environment-variable-field"
      labelHelp={
        <Button
          variant="plain"
          data-testid="remove-environment-variable-button"
          aria-label="Remove environment variable"
          icon={<MinusCircleIcon />}
          onClick={() => onRemove()}
        />
      }
    >
      <HelperText
        className="pf-v6-u-mt-xs pf-v6-u-mb-sm"
        data-testid="env-variable-type-helper-text"
      >
        <HelperTextItem>Select the type of environment variable to add.</HelperTextItem>
      </HelperText>
      <Stack hasGutter data-testid="environment-variable-type-select">
        {Object.values(EnvironmentVariableType).map((type) => (
          <StackItem key={type}>
            <Radio
              id={`${uniqueId}-env-type-${type}`}
              name={`${uniqueId}-env-variable-type`}
              label={ENV_TYPE_LABELS[type]}
              description={ENV_TYPE_DESCRIPTIONS[type]}
              isChecked={envVariable.type === type}
              onChange={() => onUpdate({ type })}
              data-testid={`env-type-radio-${type}`}
              body={
                envVariable.type === type ? (
                  <EnvTypeSwitch
                    env={envVariable}
                    onUpdate={(envValue) => onUpdate({ ...envVariable, values: envValue })}
                    onExistingSecretRefsUpdate={(refs) =>
                      onUpdate({ ...envVariable, existingSecretRefs: refs })
                    }
                    usedSecretNames={usedSecretNames}
                    inlineKeyNames={inlineKeyNames}
                    existingSecretsData={existingSecretsData}
                  />
                ) : undefined
              }
            />
          </StackItem>
        ))}
      </Stack>
    </FormGroup>
  );
};

export default EnvTypeSelectField;
