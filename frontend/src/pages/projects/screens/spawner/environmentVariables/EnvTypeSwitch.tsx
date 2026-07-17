import * as React from 'react';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { EnvironmentVariableType, EnvVariable, EnvVariableData } from '#~/pages/projects/types';
import EnvConfigMap from './EnvConfigMap';
import EnvSecret from './EnvSecret';

type EnvTypeSwitchProps = {
  env: EnvVariable;
  onUpdate: (envVariableData: EnvVariableData) => void;
  availableSecrets: SecretKind[];
  secretsLoaded: boolean;
  secretsError?: Error;
};

const EnvTypeSwitch: React.FC<EnvTypeSwitchProps> = ({
  env,
  onUpdate,
  availableSecrets,
  secretsLoaded,
  secretsError,
}) => {
  switch (env.type) {
    case EnvironmentVariableType.CONFIG_MAP:
      return <EnvConfigMap env={env.values} onUpdate={onUpdate} />;
    case EnvironmentVariableType.SECRET:
      return (
        <EnvSecret
          env={env.values}
          onUpdate={onUpdate}
          availableSecrets={availableSecrets}
          secretsLoaded={secretsLoaded}
          secretsError={secretsError}
        />
      );
    default:
      return null;
  }
};

export default EnvTypeSwitch;
