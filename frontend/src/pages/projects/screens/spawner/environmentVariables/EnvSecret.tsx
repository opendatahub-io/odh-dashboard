import * as React from 'react';
import { FormGroup, Radio, Stack, StackItem } from '@patternfly/react-core';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { EnvironmentVariableType, EnvVariableData, SecretCategory } from '#~/pages/projects/types';
import IndentSection from '#~/pages/projects/components/IndentSection';
import GenericKeyValuePairField from './GenericKeyValuePairField';
import { EMPTY_KEY_VALUE_PAIR } from './const';
import EnvUploadField from './EnvUploadField';
import ExistingSecretField from './ExistingSecretField';

type EnvSecretProps = {
  env?: EnvVariableData;
  onUpdate: (envVariableData: EnvVariableData) => void;
  availableSecrets: SecretKind[];
  secretsLoaded: boolean;
  secretsError?: Error;
};

const DEFAULT_ENV: EnvVariableData = {
  category: null,
  data: [],
};

const EnvSecret: React.FC<EnvSecretProps> = ({
  env = DEFAULT_ENV,
  onUpdate,
  availableSecrets,
  secretsLoaded,
  secretsError,
}) => {
  const uid = React.useId().replace(/:/g, '');
  const selectCategory = (category: SecretCategory) => {
    onUpdate({ ...env, category, data: [], existingSecretRefs: undefined });
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Data type" data-testid="env-secret-data-type">
          <Stack hasGutter>
            <StackItem>
              <Radio
                id={`${uid}-secret-category-generic`}
                name={`${uid}-secret-category`}
                label="Key / value"
                description="Create a new key-value pair for this environment variable"
                isChecked={env.category === SecretCategory.GENERIC}
                onChange={() => selectCategory(SecretCategory.GENERIC)}
                data-testid="secret-category-generic-radio"
              />
            </StackItem>
            <StackItem>
              <Radio
                id={`${uid}-secret-category-upload`}
                name={`${uid}-secret-category`}
                label="Upload"
                description="Upload environment variables from a file"
                isChecked={env.category === SecretCategory.UPLOAD}
                onChange={() => selectCategory(SecretCategory.UPLOAD)}
                data-testid="secret-category-upload-radio"
              />
            </StackItem>
            <StackItem>
              <Radio
                id={`${uid}-secret-category-existing`}
                name={`${uid}-secret-category`}
                label="Existing secret"
                description="Attach an available secret from this project"
                isChecked={env.category === SecretCategory.EXISTING}
                onChange={() =>
                  onUpdate({
                    ...env,
                    category: SecretCategory.EXISTING,
                    data: [],
                    existingSecretRefs: [],
                  })
                }
                data-testid="secret-category-existing-radio"
              />
            </StackItem>
          </Stack>
        </FormGroup>
      </StackItem>

      {env.category === SecretCategory.GENERIC && (
        <StackItem>
          <IndentSection>
            <GenericKeyValuePairField
              values={env.data.length === 0 ? [EMPTY_KEY_VALUE_PAIR] : env.data}
              onUpdate={(newEnvData) => onUpdate({ ...env, data: newEnvData })}
              valueIsSecret
            />
          </IndentSection>
        </StackItem>
      )}

      {env.category === SecretCategory.UPLOAD && (
        <StackItem>
          <IndentSection>
            <EnvUploadField
              envVarType={EnvironmentVariableType.SECRET}
              onUpdate={(newEnvData) => onUpdate({ ...env, data: newEnvData })}
              translateValue={(value) => atob(value)}
            />
          </IndentSection>
        </StackItem>
      )}

      {env.category === SecretCategory.EXISTING && (
        <StackItem>
          <IndentSection>
            <ExistingSecretField
              existingSecretRefs={env.existingSecretRefs || []}
              onUpdate={(refs) => onUpdate({ ...env, existingSecretRefs: refs })}
              availableSecrets={availableSecrets}
              secretsLoaded={secretsLoaded}
              secretsError={secretsError}
            />
          </IndentSection>
        </StackItem>
      )}
    </Stack>
  );
};

export default EnvSecret;
