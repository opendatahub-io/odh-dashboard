import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import type { DeploymentHookPayloadFor } from '@odh-dashboard/model-serving/extension-points';
import type { KServeDeployment } from '@odh-dashboard/kserve/types';
import { createPvc } from '@odh-dashboard/internal/api';
import {
  NIM_PVC_ANNOTATION,
  NIM_PVC_SUBPATH_ANNOTATION,
  NIMPVCStorageMode,
  type NIMPVCFieldValue,
} from '../../pages/deploymentWizard/fields/NIMPVCField';

/**
 * Creates the PVC (for NEW mode) before the InferenceService + ServingRuntime
 * are saved. Skips PVC creation for EXISTING mode since the PVC already exists.
 *
 * Respects the `dryRun` flag so no real PVC is created during validation.
 */
export const nimPVCPreDeploy = async (
  fieldData: NIMPVCFieldValue,
  wizardState: WizardFormData['state'],
  deployment: DeploymentHookPayloadFor<KServeDeployment>,
  _existingDeployment?: KServeDeployment,
  dryRun?: boolean,
): Promise<DeploymentHookPayloadFor<KServeDeployment>> => {
  const { projectName } = wizardState.project;
  if (!projectName) {
    throw new Error('Project is required to create PVC storage');
  }

  if (fieldData.storageMode !== NIMPVCStorageMode.NEW) {
    return deployment;
  }

  await createPvc(
    {
      name: fieldData.pvcName,
      description: '',
      size: `${fieldData.storageSizeGi}Gi`,
      storageClassName: fieldData.storageClassName,
    },
    projectName,
    { dryRun: !!dryRun },
    false,
    {
      [NIM_PVC_ANNOTATION]: 'true',
      ...(fieldData.subPath &&
        fieldData.subPath !== '/' && { [NIM_PVC_SUBPATH_ANNOTATION]: fieldData.subPath }),
    },
    { 'opendatahub.io/managed': 'true' },
  );

  return deployment;
};
