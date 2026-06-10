import type { WizardFormData } from '@odh-dashboard/model-serving/types/form-data';
import type { DeploymentAssemblyFn } from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
import { NIMModelLocationKey } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/modelLocationFields/NIMModelLocation';
import { type NIMServiceKind, type NIMDeployment } from '../nimservices/types';
import {
  assembleNIMService,
  createNIMService,
  updateNIMService,
  patchNIMService,
} from '../nimservices/k8s';
import { getNIMAccount } from '../accounts/k8s';
import { NIM_ID } from '../../../extensions';

export const isNIMDeployActive = (wizardData: WizardFormData['state']): boolean =>
  wizardData.modelLocationData.data?.type === NIMModelLocationKey;

export const assembleNIMDeployment = (
  wizardData: WizardFormData,
  existingDeployment?: NIMDeployment,
  applyFieldData?: DeploymentAssemblyFn<NIMDeployment>,
): NIMDeployment => {
  const tokenAuth =
    Array.isArray(wizardData.state.tokenAuthentication.data) &&
    wizardData.state.tokenAuthentication.data.length > 0;

  const nimService = assembleNIMService(
    {
      projectName: wizardData.state.project.projectName ?? '',
      k8sName: wizardData.state.k8sNameDesc.data.k8sName.value,
      displayName: wizardData.state.k8sNameDesc.data.name,
      description: wizardData.state.k8sNameDesc.data.description,
      replicas: wizardData.state.numReplicas.data,
      externalRoute: wizardData.state.externalRoute.data,
      tokenAuth,
      runtimeArgs: wizardData.state.runtimeArgs.data,
      environmentVariables: wizardData.state.environmentVariables.data,
      hardwareProfile: wizardData.state.hardwareProfileConfig.formData,
    },
    existingDeployment?.model,
  );

  let result: NIMDeployment = {
    modelServingPlatformId: NIM_ID,
    model: nimService,
  };
  result = applyFieldData?.(result) ?? result;
  return result;
};

const deployNIMServiceResource = async (
  nimService: NIMServiceKind,
  existingNimService?: NIMServiceKind,
  opts?: { dryRun?: boolean; overwrite?: boolean },
): Promise<NIMServiceKind> => {
  if (!existingNimService) {
    return createNIMService(nimService, { dryRun: opts?.dryRun });
  }
  if (opts?.overwrite) {
    return patchNIMService(existingNimService, nimService, { dryRun: opts.dryRun });
  }
  return updateNIMService(nimService, { dryRun: opts?.dryRun });
};

export const deployNIMDeployment = async (
  _wizardData: WizardFormData['state'],
  projectName: string,
  existingDeployment?: NIMDeployment,
  modelResource?: NIMDeployment['model'],
  _serverResource?: NIMDeployment['server'],
  _serverResourceTemplateName?: string,
  dryRun?: boolean,
  _secretName?: string,
  overwrite?: boolean,
): Promise<NIMDeployment> => {
  if (!modelResource) {
    throw new Error('NIMService resource is required');
  }

  const nimServiceWithSecrets = structuredClone(modelResource);

  const nimAccount = await getNIMAccount(projectName);
  if (!nimAccount) {
    throw new Error(
      'NIM Account not found in this project. Configure NVIDIA NIM in the project settings first.',
    );
  }
  nimServiceWithSecrets.spec.authSecret = nimAccount.spec.apiKeySecret.name;
  if (nimAccount.status?.nimPullSecret?.name) {
    nimServiceWithSecrets.spec.image.pullSecrets = [nimAccount.status.nimPullSecret.name];
  }

  const nimService = await deployNIMServiceResource(
    nimServiceWithSecrets,
    existingDeployment?.model,
    { dryRun, overwrite },
  );

  return {
    modelServingPlatformId: NIM_ID,
    model: nimService,
  };
};
