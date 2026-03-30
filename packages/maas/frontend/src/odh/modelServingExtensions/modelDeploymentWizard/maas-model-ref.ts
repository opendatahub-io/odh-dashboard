import type { LLMdDeployment } from '@odh-dashboard/llmd-serving/types';
import { createMaaSModelRef, deleteMaaSModelRef, updateMaaSModelRef } from '~/app/api/maas-models';
import type { MaaSFieldValue } from './MaaSEndpointCheckbox';

const LLMINFERENCESERVICE_KIND = 'LLMInferenceService';

/**
 * Post-deploy extension for the MaaS checkbox field.
 *
 * Handles the lifecycle of a MaaSModelRef in response to the wizard's checkbox state:
 *
 * - Create flow (no existingDeployment): creates a MaaSModelRef if checked, with an
 *   owner reference pointing at the LLMInferenceService so K8s garbage-collects it
 *   automatically when the model is deleted.
 *
 * - Edit flow (existingDeployment provided):
 *   - Checked  → update the existing MaaSModelRef (or create if it was somehow absent)
 *   - Unchecked → delete the existing MaaSModelRef (silently tolerates a 404)
 */
export const applyMaaSModelRef = async (
  fieldData: MaaSFieldValue,
  deployedModel: LLMdDeployment['model'],
  existingDeployment?: LLMdDeployment,
): Promise<void> => {
  const { name, namespace, uid } = deployedModel.metadata;
  if (typeof fieldData.isChecked !== 'boolean') {
    return;
  }
  const { isChecked } = fieldData;
  const modelRef = { kind: LLMINFERENCESERVICE_KIND, name };
  const displayName = deployedModel.metadata.annotations?.['openshift.io/display-name'] ?? name;
  const description = deployedModel.metadata.annotations?.['openshift.io/description'] ?? '';

  if (existingDeployment) {
    if (!isChecked) {
      try {
        await deleteMaaSModelRef(namespace, name)({});
      } catch (err) {
        // Tolerate 404 — the MaaSModelRef may have been cleaned up already
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes('not found') && !message.includes('404')) {
          throw err;
        }
      }
    } else {
      try {
        await updateMaaSModelRef(namespace, name, { modelRef, displayName, description })({});
      } catch (err) {
        // If the MaaSModelRef was somehow removed externally, create it fresh
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('not found') || message.includes('404')) {
          await createMaaSModelRef('', {
            name,
            namespace,
            modelRef,
            uid,
            displayName,
            description,
          })({});
        } else {
          throw err;
        }
      }
    }
  } else if (isChecked) {
    await createMaaSModelRef('', {
      name,
      namespace,
      modelRef,
      uid,
      displayName,
      description,
    })({});
  }
};
