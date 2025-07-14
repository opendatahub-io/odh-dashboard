import * as React from 'react';
import { EnvironmentVariableType, EnvVariable, EnvVariableData } from '#~/pages/projects/types';
import EnvConfigMap from './EnvConfigMap';
import EnvSecret from './EnvSecret';

type EnvTypeSwitchProps = {
  env: EnvVariable;
  onUpdate: (envVariableData: EnvVariableData) => void;
};

const EnvTypeSwitch: React.FC<EnvTypeSwitchProps> = ({ env, onUpdate }) => {
  switch (env.type) {
    case EnvironmentVariableType.CONFIG_MAP:
      return <EnvConfigMap env={env.values} onUpdate={onUpdate} />;
    case EnvironmentVariableType.SECRET:
      return <EnvSecret env={env.values} onUpdate={onUpdate} />;
    default:
      return null;
  }
};

export default EnvTypeSwitch;
