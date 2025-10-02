import {
  getSecret,
  patchSecretWithInferenceServiceOwnerReference,
} from '@odh-dashboard/internal/api/k8s/secrets';
import { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import { CreatingInferenceServiceObject } from './deploy';
import { ModelLocationType } from '../../model-serving/src/components/deploymentWizard/fields/modelLocationFields/types';

export const isModelServingStopped = (inferenceService?: InferenceServiceKind): boolean =>
  inferenceService?.metadata.annotations?.['serving.kserve.io/stop'] === 'true';

export const setCreateConnectionData = (
  inferenceServiceData: CreatingInferenceServiceObject,
  secretName: string,
): CreatingInferenceServiceObject => {
  const newInferenceServiceData = { ...inferenceServiceData };
  newInferenceServiceData.createConnectionData = {
    ...newInferenceServiceData.createConnectionData,
    nameDesc: {
      name: secretName,
      description: '',
      k8sName: {
        value: secretName,
        state: {
          immutable: false,
          invalidCharacters: false,
          invalidLength: false,
          maxLength: 0,
          touched: false,
        },
      },
    },
  };
  return newInferenceServiceData;
};

export const handleSecretOwnerReferencePatch = (
  inferenceServiceData: CreatingInferenceServiceObject,
  inferenceService: InferenceServiceKind,
  secretName: string,
  dryRun?: boolean,
): void => {
  const { createConnectionData, modelLocationData } = inferenceServiceData;

  if (
    !createConnectionData?.saveConnection &&
    !dryRun &&
    modelLocationData?.type !== ModelLocationType.EXISTING
  ) {
    // Patch the secret with owner ref but don't wait for it
    (async () => {
      try {
        const secret = await getSecret(inferenceService.metadata.namespace, secretName);
        const uid = inferenceService.metadata.uid ?? '';
        if (!uid) {
          console.warn('UID is not present, skipping owner reference patch', uid);
          return;
        }
        await patchSecretWithInferenceServiceOwnerReference(secret, inferenceService, uid);
      } catch (err) {
        console.warn('Skipping owner reference patch, secret not ready yet', err);
      }
    })();
  }
};
