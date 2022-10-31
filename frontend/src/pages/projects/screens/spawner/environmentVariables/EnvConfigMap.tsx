import * as React from 'react';
import { ConfigMapCategory, EnvVariableData } from '../../../types';
import EnvDataTypeField from './EnvDataTypeField';
import GenericKeyValuePairField from './GenericKeyValuePairField';
import { EMPTY_KEY_VALUE_PAIR } from './const';
import ConfigMapUploadField from './ConfigMapUploadField';

type EnvConfigMapProps = {
  env?: EnvVariableData;
  onUpdate: (envVariableData: EnvVariableData) => void;
};

const DEFAULT_ENV: EnvVariableData = {
  category: null,
  data: [],
};

const EnvConfigMap: React.FC<EnvConfigMapProps> = ({ env = DEFAULT_ENV, onUpdate }) => {
  return (
    <EnvDataTypeField
      selection={env.category || ''}
      onSelection={(value) => onUpdate({ ...env, category: value as ConfigMapCategory, data: [] })}
      options={{
        [ConfigMapCategory.GENERIC]: (
          <GenericKeyValuePairField
            values={env.data.length === 0 ? [EMPTY_KEY_VALUE_PAIR] : env.data}
            onUpdate={(newEnvData) => onUpdate({ ...env, data: newEnvData })}
          />
        ),
        [ConfigMapCategory.UPLOAD]: (
          <ConfigMapUploadField onUpdate={(newEnvData) => onUpdate({ ...env, data: newEnvData })} />
        ),
      }}
    />
  );
};

export default EnvConfigMap;
