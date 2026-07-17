import { Connection } from '#~/concepts/connectionTypes/types';
import { ExistingSecretRef, EnvVariable, SecretCategory } from '#~/pages/projects/types';

export type EnvVarCollision = {
  keyName: string;
  sources: { type: 'existing-secret' | 'inline' | 'connection'; name: string }[];
};

export const detectExistingSecretCollisions = (
  existingSecretRefs: ExistingSecretRef[],
  inlineEnvVars: EnvVariable[],
  connections: Connection[],
): EnvVarCollision[] => {
  const keySourceMap = new Map<
    string,
    { type: 'existing-secret' | 'inline' | 'connection'; name: string }[]
  >();

  const addSource = (
    key: string,
    source: { type: 'existing-secret' | 'inline' | 'connection'; name: string },
  ) => {
    const sources = keySourceMap.get(key) || [];
    sources.push(source);
    keySourceMap.set(key, sources);
  };

  for (const ref of existingSecretRefs) {
    for (const key of ref.selectedKeys) {
      addSource(key, { type: 'existing-secret', name: ref.secretName });
    }
  }

  for (const envVar of inlineEnvVars) {
    if (envVar.values?.category && envVar.values.category !== SecretCategory.EXISTING) {
      for (const entry of envVar.values.data) {
        if (entry.key) {
          addSource(entry.key, {
            type: 'inline',
            name: envVar.existingName || 'inline variable',
          });
        }
      }
    }
  }

  for (const connection of connections) {
    if (connection.data) {
      for (const key of Object.keys(connection.data)) {
        addSource(key, { type: 'connection', name: connection.metadata.name });
      }
    }
  }

  const collisions: EnvVarCollision[] = [];
  for (const [keyName, sources] of keySourceMap.entries()) {
    if (sources.length > 1) {
      collisions.push({ keyName, sources });
    }
  }

  return collisions;
};
