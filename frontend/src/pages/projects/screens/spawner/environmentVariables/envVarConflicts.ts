import { EnvVariable, EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';

export type EnvVarConflict = {
  key: string;
  sources: string[];
};

const getSourceLabel = (envVar: EnvVariable): string => {
  if (envVar.values?.category === SecretCategory.EXISTING) {
    return `Secret '${envVar.existingName || 'Unknown'}'`;
  }
  if (envVar.type === EnvironmentVariableType.SECRET) {
    return `Environment variable '${envVar.existingName || 'New secret'}'`;
  }
  return `Environment variable '${envVar.existingName || 'New config map'}'`;
};

export const detectEnvVarConflicts = (
  envVariables: EnvVariable[],
  connectionKeys: Map<string, string[]>,
): EnvVarConflict[] => {
  const keyToSources = new Map<string, Set<string>>();

  for (const envVar of envVariables) {
    if (!envVar.values?.data) {
      continue;
    }
    const sourceLabel = getSourceLabel(envVar);
    for (const entry of envVar.values.data) {
      if (!entry.key) {
        continue;
      }
      const existing = keyToSources.get(entry.key) ?? new Set<string>();
      existing.add(sourceLabel);
      keyToSources.set(entry.key, existing);
    }
  }

  for (const [connectionName, keys] of connectionKeys) {
    const sourceLabel = `Connection '${connectionName}'`;
    for (const key of keys) {
      const existing = keyToSources.get(key) ?? new Set<string>();
      existing.add(sourceLabel);
      keyToSources.set(key, existing);
    }
  }

  const conflicts: EnvVarConflict[] = [];
  for (const [key, sources] of keyToSources) {
    if (sources.size > 1) {
      conflicts.push({ key, sources: Array.from(sources) });
    }
  }

  return conflicts;
};
