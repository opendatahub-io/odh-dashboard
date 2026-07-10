import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { EnvVariable, EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';
import { Connection } from '#~/concepts/connectionTypes/types';

export type EnvVarConflict = {
  key: string; // the colliding env var key name
  sources: string[]; // user-facing names of the sources
};

export const detectEnvVarConflicts = (
  envVariables: EnvVariable[],
  connections: Connection[],
): EnvVarConflict[] => {
  const keyToSources = new Map<string, string[]>();

  // Process environment variables
  envVariables.forEach((envVar) => {
    if (!envVar.values?.data) {
      return;
    }

    envVar.values.data.forEach(({ key }) => {
      if (!key) {
        return;
      }

      let sourceLabel: string;

      // Determine source label based on type and category
      if (envVar.type === EnvironmentVariableType.SECRET) {
        if (envVar.values?.category === SecretCategory.EXISTING) {
          // Existing secret
          sourceLabel = envVar.existingName ? `Secret '${envVar.existingName}'` : 'Existing secret';
        } else {
          // Inline secrets (GENERIC, UPLOAD, AWS)
          sourceLabel = 'Environment variable';
        }
      } else if (envVar.type === EnvironmentVariableType.CONFIG_MAP) {
        // Inline configmaps (GENERIC, UPLOAD)
        sourceLabel = 'Environment variable';
      } else {
        // Fallback
        sourceLabel = 'Environment variable';
      }

      const sources = keyToSources.get(key) || [];
      sources.push(sourceLabel);
      keyToSources.set(key, sources);
    });
  });

  // Process connections
  connections.forEach((connection) => {
    if (!connection.data) {
      return;
    }

    Object.keys(connection.data).forEach((key) => {
      const displayName = getDisplayNameFromK8sResource(connection);
      const sourceLabel = displayName
        ? `Connection '${displayName}'`
        : `Connection '${connection.metadata.name}'`;

      const sources = keyToSources.get(key) || [];
      sources.push(sourceLabel);
      keyToSources.set(key, sources);
    });
  });

  // Find conflicts (keys with more than one source)
  const conflicts: EnvVarConflict[] = [];

  keyToSources.forEach((sources, key) => {
    if (sources.length > 1) {
      conflicts.push({
        key,
        sources,
      });
    }
  });

  return conflicts;
};
