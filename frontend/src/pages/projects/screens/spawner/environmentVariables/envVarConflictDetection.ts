import { ExistingSecretRef, EnvVariable } from '#~/pages/projects/types';

export type EnvVarConflict = {
  key: string;
  sources: string[];
};

export const detectEnvVarConflicts = (
  existingSecretRefs: ExistingSecretRef[],
  inlineEnvVars: EnvVariable[],
  connectionKeys: string[],
): EnvVarConflict[] => {
  const keyToSources = new Map<string, Set<string>>();

  const addSource = (key: string, source: string): void => {
    const sources = keyToSources.get(key);
    if (sources) {
      sources.add(source);
    } else {
      keyToSources.set(key, new Set([source]));
    }
  };

  for (const ref of existingSecretRefs) {
    for (const key of ref.selectedKeys) {
      addSource(key, ref.secretName);
    }
  }

  for (const envVar of inlineEnvVars) {
    if (envVar.values?.data) {
      for (const entry of envVar.values.data) {
        addSource(entry.key, 'Inline variable');
      }
    }
  }

  for (const key of connectionKeys) {
    addSource(key, 'Connection');
  }

  const conflicts: EnvVarConflict[] = [];
  for (const [key, sources] of keyToSources) {
    if (sources.size > 1) {
      conflicts.push({ key, sources: [...sources] });
    }
  }

  return conflicts;
};
