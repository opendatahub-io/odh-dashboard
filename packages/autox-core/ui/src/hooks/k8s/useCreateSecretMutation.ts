import type { SecretKind } from '@odh-dashboard/k8s-core';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { useAutoXApi } from '../../context/AutoXApiContext';

export function useCreateSecretMutation(): UseMutationResult<unknown, Error, SecretKind> {
  const { k8s: k8sApi } = useAutoXApi();
  return useMutation({
    mutationFn: (secret: SecretKind) => k8sApi.createSecret(secret),
  });
}
