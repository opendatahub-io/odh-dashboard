import * as React from 'react';
import { FormGroup, Radio, Stack, StackItem } from '@patternfly/react-core';
import { Connection } from '#~/concepts/connectionTypes/types';
import {
  EnvironmentVariableType,
  EnvVariable,
  EnvVariableData,
  ExistingSecretRef,
  SecretCategory,
} from '#~/pages/projects/types';
import IndentSection from '#~/pages/projects/components/IndentSection';
import GenericKeyValuePairField from './GenericKeyValuePairField';
import { EMPTY_KEY_VALUE_PAIR } from './const';
import EnvUploadField from './EnvUploadField';
import EnvExistingSecret from './EnvExistingSecret';

type EnvSecretUpdate = {
  values?: EnvVariableData;
  existingSecrets?: ExistingSecretRef[];
};

type EnvSecretProps = {
  env?: EnvVariableData;
  existingSecrets?: ExistingSecretRef[];
  onUpdate: (update: EnvSecretUpdate) => void;
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

  const handleCategoryChange = (newCategory: SecretCategory) => {
    if (newCategory === SecretCategory.EXISTING) {
      onUpdate({
        values: { ...env, category: SecretCategory.EXISTING, data: [] },
        existingSecrets: existingSecrets.length > 0 ? existingSecrets : [],
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
                label="Existing secret"
                description="Attach an available secret from this project. Use Existing Secrets to attach secrets managed by your platform team or provisioned through external tools. For reusable credentials like S3 or database connections, use the Connections section."
                isChecked={category === SecretCategory.EXISTING}
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
