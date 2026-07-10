import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { Connection } from '#~/concepts/connectionTypes/types';
import { EnvVariable, EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';

export type EnvVarConflict = {
  key: string;
  sources: string[];
};

type KeySource = {
  key: string;
  source: string;
};

const collectEnvVarKeySources = (envVariables: EnvVariable[]): KeySource[] => {
  const keySources: KeySource[] = [];

  for (const envVar of envVariables) {
    if (!envVar.values?.data) {
      continue;
    }

    const { category, data } = envVar.values;

    for (const entry of data) {
      if (!entry.key) {
        continue;
      }

      let source: string;
      if (category === SecretCategory.EXISTING && envVar.existingName) {
        source = `Secret '${envVar.existingName}'`;
      } else if (
        envVar.type === EnvironmentVariableType.SECRET &&
        category !== SecretCategory.EXISTING
      ) {
        source = 'Secret (inline)';
      } else if (envVar.type === EnvironmentVariableType.CONFIG_MAP) {
        source = 'ConfigMap (inline)';
      } else {
        source = 'Environment variable';
      }

      keySources.push({ key: entry.key, source });
    }
  }

  return keySources;
};

const collectConnectionKeySources = (connections: Connection[]): KeySource[] => {
  const keySources: KeySource[] = [];

  for (const connection of connections) {
    if (!connection.data) {
      continue;
    }

    const displayName = getDisplayNameFromK8sResource(connection);
    for (const key of Object.keys(connection.data)) {
      keySources.push({ key, source: `Connection '${displayName}'` });
    }
  }

  return keySources;
};

export const detectEnvVarConflicts = (
  envVariables: EnvVariable[],
  connections: Connection[],
): EnvVarConflict[] => {
  const allKeySources = [
    ...collectEnvVarKeySources(envVariables),
    ...collectConnectionKeySources(connections),
  ];

  const keyMap = new Map<string, string[]>();
  for (const { key, source } of allKeySources) {
    const existing = keyMap.get(key);
    if (existing) {
      existing.push(source);
    } else {
      keyMap.set(key, [source]);
    }
  }

  const conflicts: EnvVarConflict[] = [];
  for (const [key, sources] of keyMap) {
    if (sources.length > 1) {
      conflicts.push({ key, sources });
    }
  }

  return conflicts;
};
