import * as React from 'react';
import { EnvironmentVariableType, EnvVariable } from '#~/pages/projects/types';
import type { EnvKeyCollision } from './existingSecretUtils';
import EnvConfigMap from './EnvConfigMap';
import EnvSecret from './EnvSecret';

type EnvTypeSwitchProps = {
  env: EnvVariable;
  onUpdate: (envVariable: EnvVariable) => void;
  envKeyCollisions?: EnvKeyCollision[];
};

const EnvTypeSwitch: React.FC<EnvTypeSwitchProps> = ({ env, onUpdate, envKeyCollisions }) => {
  switch (env.type) {
    case EnvironmentVariableType.CONFIG_MAP:
      return (
        <EnvConfigMap
          env={env.values}
          onUpdate={(envVariableData) => onUpdate({ ...env, values: envVariableData })}
        />
      );
    case EnvironmentVariableType.SECRET:
      return (
        <EnvSecret envVariable={env} onUpdate={onUpdate} envKeyCollisions={envKeyCollisions} />
      );
    default:
      return null;
  }
};

export default EnvTypeSwitch;
