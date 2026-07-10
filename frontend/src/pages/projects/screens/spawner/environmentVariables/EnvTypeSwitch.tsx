import * as React from 'react';
import { EnvironmentVariableType, EnvVariable, EnvVariableData } from '#~/pages/projects/types';
import EnvConfigMap from './EnvConfigMap';
import EnvSecret from './EnvSecret';

type EnvTypeSwitchProps = {
  env: EnvVariable;
  namespace: string;
  onUpdate: (envVariableData: EnvVariableData) => void;
  onExistingNameChange?: (name: string) => void;
};

const EnvTypeSwitch: React.FC<EnvTypeSwitchProps> = ({
  env,
  namespace,
  onUpdate,
  onExistingNameChange,
}) => {
  switch (env.type) {
    case EnvironmentVariableType.CONFIG_MAP:
      return <EnvConfigMap env={env.values} onUpdate={onUpdate} />;
    case EnvironmentVariableType.SECRET:
      return (
        <EnvSecret
          env={env.values}
          existingName={env.existingName}
          namespace={namespace}
          onUpdate={onUpdate}
          onExistingNameChange={onExistingNameChange}
        />
      );
    default:
      return null;
  }
};

export default EnvTypeSwitch;
