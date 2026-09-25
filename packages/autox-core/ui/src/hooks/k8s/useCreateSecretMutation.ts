import type { SecretKind } from '@odh-dashboard/k8s-core';
import { createSecret } from '@odh-dashboard/k8s-core/api/secrets';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';

export function useCreateSecretMutation(): UseMutationResult<unknown, Error, SecretKind> {
  return useMutation({
    mutationFn: (secret: SecretKind) => createSecret(secret),
  });
}
