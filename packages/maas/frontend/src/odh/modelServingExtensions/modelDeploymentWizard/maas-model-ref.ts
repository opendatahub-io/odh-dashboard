import type { LLMdDeployment } from '@odh-dashboard/llmd-serving/types';
import type { WizardFormData } from '@odh-dashboard/model-serving/types/form-data';
import { createMaaSModelRef, deleteMaaSModelRef, updateMaaSModelRef } from '~/app/api/maas-models';
import type { MaaSFieldValue } from './MaaSEndpointCheckbox';

const LLMINFERENCESERVICE_KIND = 'LLMInferenceService';

/**
 * Pre-deploy extension for the MaaS checkbox field.
 *
 * Dry-runs the same MaaSModelRef lifecycle operations as applyMaaSModelRef, validating
 * that all K8s operations (create, update, delete) can proceed before the inference
 * service is deployed. Throws on failure to block the deployment.
 */
export const preDeployMaaSModelRef = async (
  fieldData: MaaSFieldValue,
  wizardState: WizardFormData['state'],
  deployment: LLMdDeployment,
  existingDeployment?: LLMdDeployment,
): Promise<LLMdDeployment> => {
  if (typeof fieldData.isChecked !== 'boolean') {
    return deployment;
  }
  const { isChecked } = fieldData;
  const { model: modelResource } = deployment;
  const { name, namespace: modelNamespace } = modelResource.metadata;
  const namespace = wizardState.project.projectName ?? modelNamespace;
  if (!name || !namespace) {
    return deployment;
  }
  const modelRef = { kind: LLMINFERENCESERVICE_KIND, name };
  const displayName = modelResource.metadata.annotations?.['openshift.io/display-name'] ?? name;
  const description = modelResource.metadata.annotations?.['openshift.io/description'] ?? '';

  if (existingDeployment) {
    if (!isChecked) {
      try {
        await deleteMaaSModelRef(namespace, name, '', true)({});
      } catch (err) {
        // Tolerate 404 — the MaaSModelRef may have been cleaned up already
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes('not found') && !message.includes('404')) {
          throw err;
        }
      }
    } else {
      try {
        await updateMaaSModelRef(
          namespace,
          name,
          { modelRef, displayName, description },
          '',
          true,
        )({});
      } catch (err) {
        // If the MaaSModelRef was somehow removed externally, dry-run the create instead
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('not found') || message.includes('404')) {
          await createMaaSModelRef(
            '',
            { name, namespace, modelRef, uid: '', displayName, description },
            true,
          )({});
        } else {
          throw err;
        }
      }
    }
  } else if (isChecked) {
    await createMaaSModelRef(
      '',
      { name, namespace, modelRef, uid: '', displayName, description },
      true,
    )({});
  }
  return deployment;
};

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
export const postDeployMaaSModelRef = async (
  fieldData: MaaSFieldValue,
  deployedModel: LLMdDeployment['model'],
  existingDeployment?: LLMdDeployment,
): Promise<void> => {
  const { name, namespace, uid } = deployedModel.metadata;
  if (typeof fieldData.isChecked !== 'boolean' || !name || !namespace) {
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
