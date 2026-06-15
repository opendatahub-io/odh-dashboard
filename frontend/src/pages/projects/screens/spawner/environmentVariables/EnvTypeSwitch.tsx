import * as React from 'react';
import {
  EnvironmentVariableType,
  EnvVariable,
  EnvVariableData,
  ExistingSecretRef,
} from '#~/pages/projects/types';
import EnvConfigMap from './EnvConfigMap';
import EnvSecret from './EnvSecret';
import EnvExistingSecret from './EnvExistingSecret';

type EnvTypeSwitchProps = {
  env: EnvVariable;
  onUpdate: (envVariableData: EnvVariableData) => void;
  onUpdateVariable: (envVariable: EnvVariable) => void;
};

const EnvTypeSwitch: React.FC<EnvTypeSwitchProps> = ({ env, onUpdate, onUpdateVariable }) => {
  const handleExistingSecretUpdate = React.useCallback(
    (ref: ExistingSecretRef) => {
      onUpdateVariable({ ...env, existingSecretRef: ref });
    },
    [env, onUpdateVariable],
  );

  switch (env.type) {
    case EnvironmentVariableType.CONFIG_MAP:
      return <EnvConfigMap env={env.values} onUpdate={onUpdate} />;
    case EnvironmentVariableType.SECRET:
      return <EnvSecret env={env.values} onUpdate={onUpdate} />;
    case EnvironmentVariableType.EXISTING_SECRET:
      return (
        <EnvExistingSecret
          existingSecretRef={env.existingSecretRef}
          onUpdate={handleExistingSecretUpdate}
        />
      );
    default:
      return null;
  }
};

export default EnvTypeSwitch;
