import * as React from 'react';
import { FormGroup, Popover, Radio, Stack, StackItem } from '@patternfly/react-core';
import { QuestionCircleIcon } from '@patternfly/react-icons';
import { Connection } from '#~/concepts/connectionTypes/types';
import {
  EnvironmentVariableType,
  EnvVariable,
  EnvVariableData,
  EnvVariableUpdate,
  ExistingSecretRef,
  SecretCategory,
} from '#~/pages/projects/types';
import IndentSection from '#~/pages/projects/components/IndentSection';
import GenericKeyValuePairField from './GenericKeyValuePairField';
import { EMPTY_KEY_VALUE_PAIR } from './const';
import EnvUploadField from './EnvUploadField';
import EnvExistingSecret from './EnvExistingSecret';
import useExistingSecrets from './useExistingSecrets';

type EnvSecretProps = {
  env?: EnvVariableData;
  existingSecrets?: ExistingSecretRef[];
  onUpdate: (update: EnvVariableUpdate) => void;
  namespace: string;
  connections: Connection[];
  allEnvVariables: EnvVariable[];
};

const DEFAULT_ENV: EnvVariableData = {
  category: null,
  data: [],
};

const EnvSecret: React.FC<EnvSecretProps> = ({
  env = DEFAULT_ENV,
  existingSecrets = [],
  onUpdate,
  namespace,
  connections,
  allEnvVariables,
}) => {
  const groupId = React.useId().replace(/:/g, '');
  const { category } = env;
  const [availableSecrets, secretsLoaded, secretsLoadError] = useExistingSecrets(namespace, true);
  const noSecretsAvailable = secretsLoaded && !secretsLoadError && availableSecrets.length === 0;
  const hasLoadError = !!secretsLoadError;
  const existingSecretDisabled = noSecretsAvailable || hasLoadError;

  const handleCategoryChange = (newCategory: SecretCategory) => {
    if (newCategory === SecretCategory.EXISTING) {
      onUpdate({
        values: { ...env, category: SecretCategory.EXISTING, data: [] },
        existingSecrets,
      });
    } else {
      onUpdate({
        values: { ...env, category: newCategory, data: [] },
        existingSecrets: undefined,
      });
    }
  };

  return (
    <Stack hasGutter>
      <StackItem data-testid="env-secret-type-field">
        <FormGroup label="Data type" fieldId={groupId}>
          <Stack hasGutter>
            <StackItem>
              <Radio
                id={`${groupId}-key-value`}
                data-testid="secret-category-radio-key-value"
                name={groupId}
                label="Key / value"
                description="Create a new key-value pair for this environment variable"
                isChecked={category === SecretCategory.GENERIC}
                onChange={() => handleCategoryChange(SecretCategory.GENERIC)}
              />
            </StackItem>
            <StackItem>
              <Radio
                id={`${groupId}-upload`}
                data-testid="secret-category-radio-upload"
                name={groupId}
                label="Upload"
                description="Upload environment variables from a file"
                isChecked={category === SecretCategory.UPLOAD}
                onChange={() => handleCategoryChange(SecretCategory.UPLOAD)}
              />
            </StackItem>
            <StackItem>
              <Radio
                id={`${groupId}-existing`}
                data-testid="secret-category-radio-existing"
                name={groupId}
                label={
                  existingSecretDisabled ? (
                    <>
                      Existing secret{' '}
                      <Popover
                        bodyContent={
                          hasLoadError
                            ? "To list existing secrets, ask your administrator to grant 'secrets list' access for this project, or use the Key / value option to create a new secret."
                            : 'Your project may already have secrets, but they may be managed by Connections or created by other workbenches. New secrets can be added by your platform team using tools like External Secrets Operator, or you can create one using the Key / value option above.'
                        }
                        data-testid="no-secrets-popover"
                      >
                        <QuestionCircleIcon data-testid="no-secrets-help-icon" />
                      </Popover>
                    </>
                  ) : (
                    'Existing secret'
                  )
                }
                description="Attach an available secret from this project. Use Existing Secrets to attach secrets managed by your platform team or provisioned through external tools. For reusable credentials like S3 or database connections, use the Connections section."
                isChecked={category === SecretCategory.EXISTING}
                isDisabled={existingSecretDisabled}
                onChange={() => handleCategoryChange(SecretCategory.EXISTING)}
              />
            </StackItem>
          </Stack>
        </FormGroup>
      </StackItem>
      {category === SecretCategory.GENERIC ? (
        <StackItem>
          <IndentSection>
            <GenericKeyValuePairField
              values={env.data.length === 0 ? [EMPTY_KEY_VALUE_PAIR] : env.data}
              onUpdate={(newEnvData) => onUpdate({ values: { ...env, data: newEnvData } })}
              valueIsSecret
            />
          </IndentSection>
        </StackItem>
      ) : null}
      {category === SecretCategory.UPLOAD ? (
        <StackItem>
          <IndentSection>
            <EnvUploadField
              envVarType={EnvironmentVariableType.SECRET}
              onUpdate={(newEnvData) => onUpdate({ values: { ...env, data: newEnvData } })}
              translateValue={(value) => atob(value)}
            />
          </IndentSection>
        </StackItem>
      ) : null}
      {category === SecretCategory.EXISTING ? (
        <StackItem>
          <IndentSection>
            <EnvExistingSecret
              existingSecrets={existingSecrets}
              namespace={namespace}
              onUpdate={(secrets) =>
                onUpdate({
                  values: { ...env, category: SecretCategory.EXISTING, data: [] },
                  existingSecrets: secrets,
                })
              }
              connections={connections}
              inlineEnvVars={allEnvVariables}
            />
          </IndentSection>
        </StackItem>
      ) : null}
    </Stack>
  );
};

export default EnvSecret;
