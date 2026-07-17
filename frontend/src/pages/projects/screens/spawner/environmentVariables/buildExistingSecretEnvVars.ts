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
  const envEntries: SecretKeyRefEnvVar[] = [];

  for (const envVar of envVariables) {
    if (envVar.values?.category !== SecretCategory.EXISTING || !envVar.values.existingSecretRefs) {
      continue;
    }

    for (const ref of envVar.values.existingSecretRefs) {
      const { secretName, allKeys, selectedKeys } = ref;
      const secret = availableSecrets.find((s) => s.metadata.name === secretName);

      const keys = allKeys ? Object.keys(secret?.data || {}) : selectedKeys;

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
