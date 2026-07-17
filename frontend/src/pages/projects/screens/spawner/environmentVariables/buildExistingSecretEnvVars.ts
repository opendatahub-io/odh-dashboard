import type { SecretKind } from '@odh-dashboard/k8s-core';
import { EnvVariable, SecretCategory } from '#~/pages/projects/types';

export type SecretKeyRefEnvVar = {
  name: string;
  valueFrom: { secretKeyRef: { name: string; key: string } };
};

export const buildExistingSecretEnvVars = (
  envVariables: EnvVariable[],
  availableSecrets: SecretKind[],
): SecretKeyRefEnvVar[] => {
  const secretsByName = new Map(availableSecrets.map((s) => [s.metadata.name, s]));
  const envEntries: SecretKeyRefEnvVar[] = [];

  for (const envVar of envVariables) {
    if (envVar.values?.category !== SecretCategory.EXISTING || !envVar.values.existingSecretRefs) {
      continue;
    }

    for (const ref of envVar.values.existingSecretRefs) {
      const { secretName, allKeys, selectedKeys } = ref;
      const secret = secretsByName.get(secretName);
      const actualKeys = new Set(Object.keys(secret?.data || {}));

      // When allKeys is true, use all actual keys from the secret.
      // When allKeys is false, intersect selectedKeys with actual keys
      // to avoid emitting secretKeyRef entries for non-existent keys.
      const keys = allKeys ? [...actualKeys] : selectedKeys.filter((k) => actualKeys.has(k));

      for (const key of keys) {
        envEntries.push({
          name: key,
          valueFrom: {
            secretKeyRef: {
              name: secretName,
              key,
            },
          },
        });
      }
    }
  }

  return envEntries;
};
