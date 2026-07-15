import * as React from 'react';
import { EnvironmentVariableType, EnvVariable, EnvVariableData } from '#~/pages/projects/types';
import EnvConfigMap from './EnvConfigMap';
import EnvSecret from './EnvSecret';

type EnvTypeSwitchProps = {
  env: EnvVariable;
  onUpdate: (envVariableData: EnvVariableData) => void;
  onUpdateVariable?: (partial: Partial<EnvVariable>) => void;
};

const EnvTypeSwitch: React.FC<EnvTypeSwitchProps> = ({ env, onUpdate, onUpdateVariable }) => {
  switch (env.type) {
    case EnvironmentVariableType.CONFIG_MAP:
      return <EnvConfigMap env={env.values} onUpdate={onUpdate} />;
    case EnvironmentVariableType.SECRET:
      return (
        <EnvSecret
          env={env.values}
          onUpdate={onUpdate}
          onUpdateVariable={onUpdateVariable}
          selectedSecretName={env.existingName}
        />
      );
    default:
      return null;
  }
};

export default EnvTypeSwitch;
