import * as React from 'react';
import { EnvironmentVariableType, EnvVariableData, SecretCategory } from '#~/pages/projects/types';
import { asEnumMember } from '#~/utilities/utils';
import EnvDataTypeField from './EnvDataTypeField';
import GenericKeyValuePairField from './GenericKeyValuePairField';
import { EMPTY_KEY_VALUE_PAIR } from './const';
import EnvUploadField from './EnvUploadField';

type EnvSecretProps = {
  env?: EnvVariableData;
  onUpdate: (envVariableData: EnvVariableData) => void;
};

const DEFAULT_ENV: EnvVariableData = {
  category: null,
  data: [],
};

const EnvSecret: React.FC<EnvSecretProps> = ({ env = DEFAULT_ENV, onUpdate }) => (
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
    }}
  />
);

export default EnvSecret;
