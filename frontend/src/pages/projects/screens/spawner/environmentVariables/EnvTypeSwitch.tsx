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
  onUpdate: (envVariableData: EnvVariableData) => void;
  namespace: string;
  onExistingSecretRefsUpdate: (refs: ExistingSecretRef[]) => void;
  usedSecretNames?: Set<string>;
  inlineKeyNames?: Set<string>;
};

const EnvTypeSwitch: React.FC<EnvTypeSwitchProps> = ({
  env,
  onUpdate,
  namespace,
  onExistingSecretRefsUpdate,
  usedSecretNames,
  inlineKeyNames,
}) => {
  switch (env.type) {
    case EnvironmentVariableType.CONFIG_MAP:
      return <EnvConfigMap env={env.values} onUpdate={onUpdate} />;
    case EnvironmentVariableType.SECRET:
      return (
        <EnvSecret
          env={env.values}
          onUpdate={onUpdate}
          namespace={namespace}
          existingSecretRefs={env.existingSecretRefs}
          onExistingSecretRefsUpdate={onExistingSecretRefsUpdate}
          usedSecretNames={usedSecretNames}
          inlineKeyNames={inlineKeyNames}
        />
      );
    default:
      return null;
  }
};

export default EnvTypeSwitch;
