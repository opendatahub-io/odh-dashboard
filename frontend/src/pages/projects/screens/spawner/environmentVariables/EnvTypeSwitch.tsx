import * as React from 'react';
import {
  EnvironmentVariableType,
  EnvVariable,
  EnvVariableData,
  ExistingSecretRef,
} from '#~/pages/projects/types';
import EnvConfigMap from './EnvConfigMap';
import EnvSecret from './EnvSecret';

type EnvTypeSwitchProps = {
  env: EnvVariable;
  namespace: string;
  onUpdate: (envVariableData: EnvVariableData) => void;
  onExistingSecretRefsUpdate: (refs: ExistingSecretRef[]) => void;
};

const EnvTypeSwitch: React.FC<EnvTypeSwitchProps> = ({
  env,
  namespace,
  onUpdate,
  onExistingSecretRefsUpdate,
}) => {
  switch (env.type) {
    case EnvironmentVariableType.CONFIG_MAP:
      return <EnvConfigMap env={env.values} onUpdate={onUpdate} />;
    case EnvironmentVariableType.SECRET:
      return (
        <EnvSecret
          env={env.values}
          namespace={namespace}
          existingSecretRefs={env.existingSecretRefs}
          onUpdate={onUpdate}
          onExistingSecretRefsUpdate={onExistingSecretRefsUpdate}
        />
      );
    default:
      return null;
  }
};

export default EnvTypeSwitch;
