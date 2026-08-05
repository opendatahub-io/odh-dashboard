import * as React from 'react';
import {
  EnvironmentVariableType,
  EnvVariable,
  EnvVariableData,
  ExistingSecretRef,
} from '#~/pages/projects/types';
import { UseExistingSecretsResult } from './useExistingSecrets';
import EnvConfigMap from './EnvConfigMap';
import EnvSecret from './EnvSecret';

type EnvTypeSwitchProps = {
  env: EnvVariable;
  onUpdate: (envVariableData: EnvVariableData) => void;
  onExistingSecretRefsUpdate: (refs: ExistingSecretRef[]) => void;
  usedSecretNames?: Set<string>;
  inlineKeyNames?: Set<string>;
  existingSecretsData: UseExistingSecretsResult;
};

const EnvTypeSwitch: React.FC<EnvTypeSwitchProps> = ({
  env,
  onUpdate,
  onExistingSecretRefsUpdate,
  usedSecretNames,
  inlineKeyNames,
  existingSecretsData,
}) => {
  switch (env.type) {
    case EnvironmentVariableType.CONFIG_MAP:
      return <EnvConfigMap env={env.values} onUpdate={onUpdate} />;
    case EnvironmentVariableType.SECRET:
      return (
        <EnvSecret
          env={env.values}
          onUpdate={onUpdate}
          existingSecretRefs={env.existingSecretRefs}
          onExistingSecretRefsUpdate={onExistingSecretRefsUpdate}
          usedSecretNames={usedSecretNames}
          inlineKeyNames={inlineKeyNames}
          existingSecretsData={existingSecretsData}
        />
      );
    default:
      return null;
  }
};

export default EnvTypeSwitch;
