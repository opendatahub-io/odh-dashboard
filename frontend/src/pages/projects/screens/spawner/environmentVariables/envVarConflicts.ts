import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { Connection } from '#~/concepts/connectionTypes/types';
import { EnvVariable, SecretCategory } from '#~/pages/projects/types';

type ConflictSource = {
  type: 'existing-secret' | 'inline-secret' | 'connection';
  name: string;
};

export type EnvVarConflict = {
  key: string;
  sources: ConflictSource[];
};

export const detectEnvVarConflicts = (
  envVariables: EnvVariable[],
  connections: Connection[],
): EnvVarConflict[] => {
  const keySourceMap = new Map<string, ConflictSource[]>();

  const addSource = (key: string, source: ConflictSource) => {
    const sources = keySourceMap.get(key) || [];
    sources.push(source);
    keySourceMap.set(key, sources);
  };

  // 1. Keys from existing secret references
  envVariables
    .filter((ev) => ev.values?.category === SecretCategory.EXISTING)
    .forEach((ev) => {
      (ev.values?.data || []).forEach(({ key }) => {
        addSource(key, { type: 'existing-secret', name: ev.existingName || 'Unknown secret' });
      });
    });

  // 2. Keys from inline secrets and configmaps
  envVariables
    .filter((ev) => ev.values?.category !== SecretCategory.EXISTING && ev.values?.category != null)
    .forEach((ev) => {
      (ev.values?.data || []).forEach(({ key }) => {
        if (key) {
          addSource(key, { type: 'inline-secret', name: ev.existingName || 'New variable' });
        }
      });
    });

  // 3. Keys from Connections
  connections.forEach((conn) => {
    if (conn.data) {
      Object.keys(conn.data).forEach((key) => {
        addSource(key, {
          type: 'connection',
          name: getDisplayNameFromK8sResource(conn),
        });
      });
    }
  });

  // Return only conflicts involving at least one existing-secret source
  return Array.from(keySourceMap.entries())
    .filter(
      ([, sources]) => sources.length > 1 && sources.some((s) => s.type === 'existing-secret'),
    )
    .map(([key, sources]) => ({ key, sources }));
};
