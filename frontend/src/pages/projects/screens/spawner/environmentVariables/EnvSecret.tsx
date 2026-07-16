import * as React from 'react';
import { FormGroup, Radio, Stack, StackItem } from '@patternfly/react-core';
import { EnvironmentVariableType, EnvVariable, SecretCategory } from '#~/pages/projects/types';
import { useAccessReview } from '#~/api';
import { SecretModel } from '#~/api/models';
import GenericKeyValuePairField from './GenericKeyValuePairField';
import { EMPTY_KEY_VALUE_PAIR } from './const';
import EnvUploadField from './EnvUploadField';
import EnvExistingSecret from './EnvExistingSecret';

type EnvSecretProps = {
  envVariable: EnvVariable;
  onUpdate: (envVariable: EnvVariable) => void;
};

const DEFAULT_VALUES: { category: SecretCategory | null; data: [] } = { category: null, data: [] };

const EnvSecret: React.FC<EnvSecretProps> = ({ envVariable, onUpdate }) => {
  const radioGroupName = React.useId();
  const env = envVariable.values ?? DEFAULT_VALUES;
  const { category } = env;

  const [canListSecrets, canListSecretsLoaded] = useAccessReview({
    group: '',
    resource: SecretModel.plural,
    verb: 'list',
  });

  const isExistingDisabled = canListSecretsLoaded && !canListSecrets;

  const handleCategoryChange = (newCategory: SecretCategory) => {
    if (newCategory === SecretCategory.EXISTING) {
      onUpdate({
        ...envVariable,
        values: { category: SecretCategory.EXISTING, data: [] },
        existingSecretRefs: envVariable.existingSecretRefs ?? [],
      });
    } else {
      onUpdate({
        ...envVariable,
        values: { ...env, category: newCategory, data: [] },
      });
    }
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Data type" role="radiogroup">
          <Stack hasGutter>
            <StackItem>
              <Radio
                id={`${radioGroupName}-key-value`}
                name={radioGroupName}
                data-testid="secret-category-key-value"
                label="Key / value"
                description="Create a new key-value pair for this environment variable"
                isChecked={category === SecretCategory.GENERIC}
                onChange={() => handleCategoryChange(SecretCategory.GENERIC)}
                body={
                  category === SecretCategory.GENERIC ? (
                    <GenericKeyValuePairField
                      values={env.data.length === 0 ? [EMPTY_KEY_VALUE_PAIR] : env.data}
                      onUpdate={(newEnvData) =>
                        onUpdate({
                          ...envVariable,
                          values: { ...env, data: newEnvData },
                        })
                      }
                      valueIsSecret
                    />
                  ) : undefined
                }
              />
            </StackItem>
            <StackItem>
              <Radio
                id={`${radioGroupName}-upload`}
                name={radioGroupName}
                data-testid="secret-category-upload"
                label="Upload"
                description="Upload environment variables from a file"
                isChecked={category === SecretCategory.UPLOAD}
                onChange={() => handleCategoryChange(SecretCategory.UPLOAD)}
                body={
                  category === SecretCategory.UPLOAD ? (
                    <EnvUploadField
                      envVarType={EnvironmentVariableType.SECRET}
                      onUpdate={(newEnvData) =>
                        onUpdate({
                          ...envVariable,
                          values: { ...env, data: newEnvData },
                        })
                      }
                      translateValue={(value) => atob(value)}
                    />
                  ) : undefined
                }
              />
            </StackItem>
            <StackItem>
              <Radio
                id={`${radioGroupName}-existing`}
                name={radioGroupName}
                data-testid="secret-category-existing"
                label="Existing secret"
                description="Attach an available secret from this project"
                isChecked={category === SecretCategory.EXISTING}
                isDisabled={isExistingDisabled}
                onChange={() => handleCategoryChange(SecretCategory.EXISTING)}
                body={
                  category === SecretCategory.EXISTING ? (
                    <EnvExistingSecret
                      existingSecretRefs={envVariable.existingSecretRefs ?? []}
                      onUpdate={(refs) =>
                        onUpdate({
                          ...envVariable,
                          existingSecretRefs: refs,
                        })
                      }
                    />
                  ) : undefined
                }
              />
            </StackItem>
          </Stack>
        </FormGroup>
      </StackItem>
    </Stack>
  );
};

export default EnvSecret;
