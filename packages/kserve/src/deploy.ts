import { ServingRuntimeKind } from '@odh-dashboard/internal/k8sTypes';
import type { WizardFormData } from '@odh-dashboard/model-serving/types/form-data';
import { getGeneratedSecretName, getSecret } from '@odh-dashboard/internal/api/index';
import { KServeDeployment } from './deployments';
import { setUpTokenAuth } from './deployUtils';
import { createServingRuntime } from './deployServer';
import { createInferenceService, CreatingInferenceServiceObject } from './deployModel';
import { handleSecretOwnerReferencePatch, setCreateConnectionData } from './utils';

export const deployKServeDeployment = async (
  wizardData: WizardFormData['state'],
  projectName: string,
  existingDeployment?: KServeDeployment,
  serverResource?: ServingRuntimeKind,
  serverResourceTemplateName?: string,
  dryRun?: boolean,
): Promise<KServeDeployment> => {
  const inferenceServiceData: CreatingInferenceServiceObject = {
    project: projectName,
    name: wizardData.k8sNameDesc.data.name,
    k8sName: wizardData.k8sNameDesc.data.k8sName.value,
    description: wizardData.k8sNameDesc.data.description,
    modelLocationData: wizardData.modelLocationData.data,
    createConnectionData: wizardData.createConnectionData.data,
    modelType: wizardData.modelType.data,
    hardwareProfile: wizardData.hardwareProfileConfig.formData,
    modelFormat: wizardData.modelFormatState.modelFormat,
    externalRoute: wizardData.externalRoute.data,
    tokenAuth: wizardData.tokenAuthentication.data,
    numReplicas: wizardData.numReplicas.data,
    runtimeArgs: wizardData.runtimeArgs.data,
    environmentVariables: wizardData.environmentVariables.data,
    aiAssetData: wizardData.aiAssetData.data,
  };

  const servingRuntime = serverResource
    ? await createServingRuntime(
        {
          project: projectName,
          name: wizardData.k8sNameDesc.data.k8sName.value,
          servingRuntime: serverResource,
          scope: wizardData.modelServer.data?.scope || '',
          templateName: serverResourceTemplateName,
        },
        dryRun,
      )
    : undefined;

  const secretName =
    inferenceServiceData.createConnectionData?.nameDesc?.name ||
    inferenceServiceData.modelLocationData?.connection ||
    getGeneratedSecretName();

  if (!inferenceServiceData.createConnectionData?.nameDesc) {
    // Set the secret name in the create connection data
    const newInferenceServiceData = setCreateConnectionData(inferenceServiceData, secretName);
    inferenceServiceData.createConnectionData = { ...newInferenceServiceData.createConnectionData };
  }

  await handleConnectionCreation(inferenceServiceData, dryRun, secretName).then(() => {
    // If we're not in dry run, get the secret to make sure it exists before creating the inference service
    if (!dryRun) {
      return getSecret(inferenceServiceData.project, secretName);
    }
    return Promise.resolve(undefined);
  });

  const inferenceService = await createInferenceService(
    inferenceServiceData,
    existingDeployment?.model,
    dryRun,
  );

  if (inferenceServiceData.tokenAuth) {
    await setUpTokenAuth(
      inferenceServiceData,
      inferenceServiceData.k8sName,
      projectName,
      true,
      inferenceService,
      undefined,
      { dryRun: dryRun ?? false },
    );
  }

  // Add owner reference to the secret if the connection is not saved
  handleSecretOwnerReferencePatch(inferenceServiceData, inferenceService, secretName, dryRun);

  return Promise.resolve({
    modelServingPlatformId: 'kserve',
    model: inferenceService,
    server: servingRuntime,
  });
};
