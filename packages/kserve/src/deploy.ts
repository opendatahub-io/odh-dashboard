import type {
  InitialWizardFormData,
  WizardFormData,
} from '@odh-dashboard/model-serving/shared/types/form-data';
import { DeploymentAssemblyFn } from '@odh-dashboard/model-serving/extension-points/deployment-wizard';
import { setUpTokenAuth } from '@odh-dashboard/model-serving/concepts/auth';
import { KServeDeployment } from './types';
import { assembleServingRuntime, createServingRuntime, updateServingRuntime } from './deployServer';
import {
  assembleInferenceService,
  deployInferenceService,
  type CreatingInferenceServiceObject,
} from './deployModel';
import { KSERVE_ID } from '../extensions';

export const deployKServeDeployment = async (
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
  updateExistingServingRuntime?: boolean,
): Promise<KServeDeployment> => {
  const inferenceServiceData: CreatingInferenceServiceObject = {
    project: projectName,
    name: wizardData.k8sNameDesc.data.name,
    k8sName: wizardData.k8sNameDesc.data.k8sName.value,
    description: wizardData.k8sNameDesc.data.description,
    modelLocationData: wizardData.modelLocationData.data,
    createConnectionData: wizardData.createConnectionData.data,
    modelType: wizardData.modelType.data?.type,
    hardwareProfile: wizardData.hardwareProfileConfig.formData,
    modelFormat: wizardData.modelFormatState.modelFormat,
    externalRoute: wizardData.externalRoute.data,
    tokenAuth: wizardData.tokenAuthentication.data,
    numReplicas: wizardData.numReplicas.data,
    runtimeArgs: wizardData.runtimeArgs.data,
    environmentVariables: wizardData.environmentVariables.data,
    modelAvailability: wizardData.modelAvailability.data,
    deploymentStrategy: wizardData.deploymentStrategy.data,
  };

  const servingRuntime = existingDeployment?.server ?? serverResource;
  let assembledDeployment: KServeDeployment = {
    modelServingPlatformId: KSERVE_ID,
    model: assembleInferenceService(
      inferenceServiceData,
      existingDeployment?.model,
      dryRun,
      secretName,
    ),
    server: servingRuntime
      ? assembleServingRuntime({
          project: projectName,
          name: wizardData.k8sNameDesc.data.k8sName.value,
          servingRuntime,
          scope: wizardData.modelServer?.data?.selection?.scope,
          templateName: serverResourceTemplateName,
        })
      : undefined,
  };

  if (applyFieldData) {
    assembledDeployment = applyFieldData(assembledDeployment);
  }

  let servingRuntimeResult = existingDeployment?.server;
  if (!servingRuntimeResult && assembledDeployment.server) {
    servingRuntimeResult = await createServingRuntime(assembledDeployment.server, { dryRun });
  } else if (updateExistingServingRuntime && assembledDeployment.server) {
    servingRuntimeResult = await updateServingRuntime(assembledDeployment.server, { dryRun });
  }

  const inferenceServiceResult = await deployInferenceService(
    assembledDeployment.model,
    existingDeployment?.model,
    {
      dryRun,
      overwrite,
    },
  );

  const createTokenAuth =
    (inferenceServiceData.tokenAuth && inferenceServiceData.tokenAuth.length > 0) ?? false;

  if (wizardData.canCreateRoleBindings) {
    await setUpTokenAuth(
      inferenceServiceData.tokenAuth,
      inferenceServiceResult.metadata.name,
      inferenceServiceResult.metadata.namespace,
      createTokenAuth,
      inferenceServiceResult,
      'inferenceservices',
      initialWizardData?.existingAuthTokens,
      { dryRun: dryRun ?? false },
    );
  }

  return {
    modelServingPlatformId: KSERVE_ID,
    model: inferenceServiceResult,
    server: servingRuntimeResult,
  };
};
