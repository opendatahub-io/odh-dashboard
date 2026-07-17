import * as React from 'react';
import { Connection } from '#~/concepts/connectionTypes/types';
import {
  EnvironmentVariableType,
  EnvVariable,
  EnvVariableData,
  ExistingSecretRef,
} from '#~/pages/projects/types';
import EnvConfigMap from './EnvConfigMap';
import EnvSecret from './EnvSecret';

type EnvTypeSwitchUpdate = {
  values?: EnvVariableData;
  existingSecrets?: ExistingSecretRef[];
};

type EnvTypeSwitchProps = {
  env: EnvVariable;
  onUpdate: (update: EnvTypeSwitchUpdate) => void;
  namespace: string;
  connections: Connection[];
  allEnvVariables: EnvVariable[];
};

const EnvTypeSwitch: React.FC<EnvTypeSwitchProps> = ({
  env,
  onUpdate,
  namespace,
  connections,
  allEnvVariables,
}) => {
  switch (env.type) {
    case EnvironmentVariableType.CONFIG_MAP:
      return (
        <EnvConfigMap env={env.values} onUpdate={(envValue) => onUpdate({ values: envValue })} />
      );
    case EnvironmentVariableType.SECRET:
      return (
        <EnvSecret
          env={env.values}
          existingSecrets={env.existingSecrets}
          onUpdate={(update) => onUpdate(update)}
          namespace={namespace}
          connections={connections}
          allEnvVariables={allEnvVariables}
        />
      );
    default:
      return null;
  }
};

export default EnvTypeSwitch;
