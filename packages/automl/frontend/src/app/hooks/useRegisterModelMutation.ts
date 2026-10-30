import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { registerModel } from '~/app/api/modelRegistry';
import type { RegisterModelParams } from '~/app/api/modelRegistry';
import type { RegisterModelResponse } from '~/app/types';

export type RegisterModelMutationVariables = Omit<RegisterModelParams, 'namespace'> & {
  registryName: string;
  modelName: string;
};

export type RegisterModelMutationOptions = {
  onSuccess?: (data: RegisterModelResponse, variables: RegisterModelMutationVariables) => void;
  onError?: (error: Error) => void;
};

export function useRegisterModelMutation(
  namespace?: string,
  options?: RegisterModelMutationOptions,
): UseMutationResult<RegisterModelResponse, Error, RegisterModelMutationVariables> {
  return useMutation<RegisterModelResponse, Error, RegisterModelMutationVariables>({
    mutationFn: (params) => {
      if (!namespace) {
        throw new Error('Namespace is not available');
      }
      return registerModel('', {
        namespace,
        registryId: params.registryId,
        request: params.request,
      });
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}
