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
  instanceId: number;
  env: EnvVariable;
  onUpdate: (envVariableData: EnvVariableData) => void;
  onUpdateVariable: (envVariable: EnvVariable) => void;
};

const EnvTypeSwitch: React.FC<EnvTypeSwitchProps> = ({
  instanceId,
  env,
  onUpdate,
  onUpdateVariable,
}) => {
  switch (env.type) {
    case EnvironmentVariableType.CONFIG_MAP:
      return <EnvConfigMap env={env.values} onUpdate={onUpdate} />;
    case EnvironmentVariableType.SECRET:
      return <EnvSecret env={env.values} onUpdate={onUpdate} />;
    case EnvironmentVariableType.EXISTING_SECRET:
      return (
        <EnvExistingSecret
          instanceId={instanceId}
          existingSecretRefs={env.existingSecretRefs}
          onUpdate={(refs: ExistingSecretRef[]) =>
            onUpdateVariable({ ...env, existingSecretRefs: refs })
          }
        />
      );
    default:
      return null;
  }
};

export default EnvTypeSwitch;
