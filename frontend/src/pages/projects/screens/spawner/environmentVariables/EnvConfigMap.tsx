import * as React from 'react';
import {
  ConfigMapCategory,
  EnvironmentVariableType,
  EnvVariableData,
} from '#~/pages/projects/types';
import { asEnumMember } from '#~/utilities/utils';
import EnvDataTypeField from './EnvDataTypeField';
import GenericKeyValuePairField from './GenericKeyValuePairField';
import { EMPTY_KEY_VALUE_PAIR } from './const';
import EnvUploadField from './EnvUploadField';

type EnvConfigMapProps = {
  env?: EnvVariableData;
  onUpdate: (envVariableData: EnvVariableData) => void;
};

const DEFAULT_ENV: EnvVariableData = {
  category: null,
  data: [],
};

const EnvConfigMap: React.FC<EnvConfigMapProps> = ({ env = DEFAULT_ENV, onUpdate }) => (
  <EnvDataTypeField
    selection={env.category || ''}
    onSelection={(value) =>
      onUpdate({ ...env, category: asEnumMember(value, ConfigMapCategory), data: [] })
    }
    options={{
      [ConfigMapCategory.GENERIC]: {
        label: 'Key / value',
        render: (
          <GenericKeyValuePairField
            values={env.data.length === 0 ? [EMPTY_KEY_VALUE_PAIR] : env.data}
            onUpdate={(newEnvData) => onUpdate({ ...env, data: newEnvData })}
          />
        ),
      },
      [ConfigMapCategory.UPLOAD]: {
        label: 'Upload',
        render: (
          <EnvUploadField
            envVarType={EnvironmentVariableType.CONFIG_MAP}
            onUpdate={(newEnvData) => onUpdate({ ...env, data: newEnvData })}
          />
        ),
      },
    }}
  />
);

export default EnvConfigMap;
