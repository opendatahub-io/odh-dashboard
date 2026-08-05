import type { SecretKind, K8sAPIOptions } from '@odh-dashboard/k8s-core';
import { setUpTokenAuth as setUpTokenAuthShared } from '@odh-dashboard/model-serving/concepts/auth';
import type { TokenAuthEntry } from '@odh-dashboard/model-serving/concepts/auth';
import { LLMInferenceServiceKind } from '../types';

export const LLMD_RESOURCE_TYPE = 'llminferenceservices';

export const setUpTokenAuth = async (
  tokenAuth: TokenAuthEntry[] | undefined,
  deployedModelName: string,
  namespace: string,
  createTokenAuth: boolean,
  owner: LLMInferenceServiceKind,
  existingSecrets?: SecretKind[],
  opts?: K8sAPIOptions,
): Promise<void> =>
  setUpTokenAuthShared(
    tokenAuth,
    deployedModelName,
    namespace,
    createTokenAuth,
    owner,
    LLMD_RESOURCE_TYPE,
    existingSecrets,
    opts,
  );
