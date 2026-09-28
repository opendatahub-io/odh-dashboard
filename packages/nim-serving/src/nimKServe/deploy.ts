import type {
  InitialWizardFormData,
  WizardFormData,
} from '@odh-dashboard/model-serving/shared/types/form-data';
import type { DeploymentAssemblyFn } from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
import { NIMModelLocationKey } from '@odh-dashboard/model-serving/shared/wizard-fields';
import { deployKServeDeployment } from '@odh-dashboard/kserve/deploy';
import { KServeDeployment } from '@odh-dashboard/kserve/types';
import { getServingRuntimeFromTemplate } from '@odh-dashboard/model-serving/shared';
import { getResourceNameFromK8sResource } from '@odh-dashboard/k8s-core';
import {
  isNIMImageFieldExternalData,
  NIMImageFieldWizardField,
} from '../pages/deploymentWizard/fields/NIMImageField';
import { getNIMAccount } from '../api/accounts/k8s';
import {
  applyNIMServingRuntimeCredentials,
  applyNIMServingRuntimeShmMounts,
  removeNIMServingRuntimeResources,
} from '../api/servingruntime/utils';

export const isNIMKServeDeployActive = (wizardData: WizardFormData['state']): boolean =>
  wizardData.modelLocationData.data?.type === NIMModelLocationKey;

/**
 * Deploys NIM as an InferenceService + ServingRuntime pair. Everything past resolving the runtime
 * is plain KServe -- the wizard's image and storage fields write their data onto the runtime
 * through `applyFieldData`.
 */
export const deployNIMKServeDeployment = async (
  wizardData: WizardFormData['state'],
  externalData: Record<string, { loaded: boolean; loadError?: Error; data: unknown }>,
  projectName: string,
  existingDeployment?: KServeDeployment,
  modelResource?: KServeDeployment['model'],
  serverResource?: KServeDeployment['server'],
  serverResourceTemplateName?: string,
  dryRun?: boolean,
  secretName?: string,
  overwrite?: boolean,
  initialWizardData?: InitialWizardFormData,
  applyFieldData?: DeploymentAssemblyFn<KServeDeployment>,
): Promise<KServeDeployment> => {
  let runtime = serverResource;
  let templateName;

  // TODO: move this into assembleDeployment for yaml
  if (!existingDeployment?.server) {
    const nimImageFieldData = externalData[NIMImageFieldWizardField.id].data;
    if (isNIMImageFieldExternalData(nimImageFieldData)) {
      if (!nimImageFieldData.nimTemplate) {
        throw new Error(`Unable to find NIM ServingRuntime Template in namespace ${projectName}`);
      }

      templateName = getResourceNameFromK8sResource(nimImageFieldData.nimTemplate);
      runtime = getServingRuntimeFromTemplate(nimImageFieldData.nimTemplate);

      if (!runtime) {
        throw new Error(`Unable to find NIM ServingRuntime Template in namespace ${projectName}`);
      }
      const nimAccount = await getNIMAccount(projectName);
      if (!nimAccount) {
        throw new Error(
          'NIM Account not found in this project. Configure NVIDIA NIM in the project settings first.',
        );
      }

      runtime = applyNIMServingRuntimeCredentials(runtime, nimAccount);
      // The NIM Template has a `volumeMounts` defined but not the `volumes` for shm. Add it to prevent errors
      runtime = applyNIMServingRuntimeShmMounts(runtime);
      // The container resources come from the InferenceService's hardware profile, not the Template
      runtime = removeNIMServingRuntimeResources(runtime);
    } else {
      throw new Error(`Unable to find NIM ServingRuntime Template in namespace ${projectName}`);
    }
  }

  return deployKServeDeployment(
    wizardData,
    externalData,
    projectName,
    existingDeployment,
    modelResource,
    runtime,
    templateName,
    dryRun,
    secretName,
    overwrite,
    initialWizardData,
    applyFieldData,
    true,
  );
};
