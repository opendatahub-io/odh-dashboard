import type { SecretKind } from '@odh-dashboard/k8s-core';
import { isConnection } from '#~/concepts/connectionTypes/utils';
import type { Connection } from '#~/concepts/connectionTypes/types';
import type { ExistingSecretRef, EnvVariable } from '#~/pages/projects/types';
import { EnvironmentVariableType, SecretCategory } from '#~/pages/projects/types';

export const filterExistingSecrets = (secrets: SecretKind[]): SecretKind[] =>
  secrets.filter(
    (secret) =>
      secret.type === 'Opaque' &&
      !isConnection(secret) &&
      !secret.metadata.annotations?.['opendatahub.io/connection-type-protocol'],
  );

export const getExistingSecretEnvVars = (
  envVariables: EnvVariable[],
): Array<{ name: string; valueFrom: { secretKeyRef: { name: string; key: string } } }> =>
  envVariables
    .filter((ev) => ev.values?.category === SecretCategory.EXISTING && ev.existingSecretRefs)
    .flatMap((ev) =>
      (ev.existingSecretRefs ?? [])
        .filter((ref) => !ref.error)
        .flatMap((ref) =>
          ref.selectedKeys.map((key) => ({
            name: key,
            valueFrom: {
              secretKeyRef: {
                name: ref.secretName,
                key,
              },
            },
          })),
        ),
    );

export type EnvKeyCollision = {
  key: string;
  sources: Array<{
    type: 'existing-secret' | 'inline-secret' | 'connection';
    name: string;
  }>;
};

export const detectEnvKeyCollisions = (
  existingSecretRefs: ExistingSecretRef[],
  envVariables: EnvVariable[],
  connections: Connection[],
): EnvKeyCollision[] => {
  const keySourceMap = new Map<string, EnvKeyCollision['sources']>();

  for (const ref of existingSecretRefs) {
    if (ref.error) {
      continue;
    }
    for (const key of ref.selectedKeys) {
      const sources = keySourceMap.get(key) ?? [];
      sources.push({ type: 'existing-secret', name: ref.secretName });
      keySourceMap.set(key, sources);
    }
  }

  for (const envVar of envVariables) {
    if (
      envVar.type === EnvironmentVariableType.SECRET &&
      envVar.values?.category !== SecretCategory.EXISTING &&
      envVar.values?.data
    ) {
      const secretName = envVar.existingName || 'inline secret';
      for (const entry of envVar.values.data) {
        if (entry.key) {
          const sources = keySourceMap.get(entry.key) ?? [];
          sources.push({ type: 'inline-secret', name: secretName });
          keySourceMap.set(entry.key, sources);
        }
      }
    }
  }

  for (const connection of connections) {
    if (connection.data) {
      const connName =
        connection.metadata.annotations['openshift.io/display-name'] || connection.metadata.name;
      for (const key of Object.keys(connection.data)) {
        const sources = keySourceMap.get(key) ?? [];
        sources.push({ type: 'connection', name: connName });
        keySourceMap.set(key, sources);
      }
    }
  }

  return Array.from(keySourceMap.entries())
    .filter(([, sources]) => sources.length > 1)
    .map(([key, sources]) => ({ key, sources }));
};
