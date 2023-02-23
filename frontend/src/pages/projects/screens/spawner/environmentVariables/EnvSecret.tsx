import * as React from 'react';
import { EnvVariableData, SecretCategory } from '~/pages/projects/types';
import AWSField from '~/pages/projects/dataConnections/AWSField';
import { EMPTY_AWS_SECRET_DATA } from '~/pages/projects/dataConnections/const';
import EnvDataTypeField from './EnvDataTypeField';
import GenericKeyValuePairField from './GenericKeyValuePairField';
import { EMPTY_KEY_VALUE_PAIR } from './const';

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
    onSelection={(value) => onUpdate({ ...env, category: value as SecretCategory, data: [] })}
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
      [SecretCategory.AWS]: {
        label: 'AWS',
        render: (
          <AWSField
            values={env.data.length === 0 ? EMPTY_AWS_SECRET_DATA : env.data}
            onUpdate={(newEnvData) => onUpdate({ ...env, data: newEnvData })}
          />
        ),
      },
    }}
  />
);

export default EnvSecret;
