import * as React from 'react';
import { asEnumMember } from '@odh-dashboard/foundation';
import {
  EnvironmentVariableType,
  EnvVariable,
  EnvVariableData,
  SecretCategory,
} from '#~/pages/projects/types';
import EnvDataTypeField from './EnvDataTypeField';
import GenericKeyValuePairField from './GenericKeyValuePairField';
import { EMPTY_KEY_VALUE_PAIR } from './const';
import EnvUploadField from './EnvUploadField';
import EnvExistingSecretField from './EnvExistingSecretField';

type EnvSecretProps = {
  env?: EnvVariableData;
  onUpdate: (envVariableData: EnvVariableData) => void;
  onUpdateVariable?: (partial: Partial<EnvVariable>) => void;
  selectedSecretName?: string;
};

const DEFAULT_ENV: EnvVariableData = {
  category: null,
  data: [],
};

const EnvSecret: React.FC<EnvSecretProps> = ({
  env = DEFAULT_ENV,
  onUpdate,
  onUpdateVariable,
  selectedSecretName,
}) => (
  <EnvDataTypeField
    selection={env.category || ''}
    onSelection={(value) =>
      onUpdate({ ...env, category: asEnumMember(value, SecretCategory), data: [] })
    }
    options={{
      [SecretCategory.GENERIC]: {
        label: 'Key / value',
        render: (
          <GenericKeyValuePairField
            values={env.data.length === 0 ? [EMPTY_KEY_VALUE_PAIR] : env.data}
            onUpdate={(newEnvData) => onUpdate({ ...env, data: newEnvData })}
            valueIsSecret
          />
        ),
      },
      [SecretCategory.UPLOAD]: {
        label: 'Upload',
        render: (
          <EnvUploadField
            envVarType={EnvironmentVariableType.SECRET}
            onUpdate={(newEnvData) => onUpdate({ ...env, data: newEnvData })}
            translateValue={(value) => atob(value)}
          />
        ),
      },
      [SecretCategory.EXISTING]: {
        label: 'Existing secret',
        render: (
          <EnvExistingSecretField
            env={env}
            onUpdate={onUpdate}
            onUpdateVariable={onUpdateVariable}
            selectedSecretName={selectedSecretName}
          />
        ),
      },
    }}
  />
);

export default EnvSecret;
