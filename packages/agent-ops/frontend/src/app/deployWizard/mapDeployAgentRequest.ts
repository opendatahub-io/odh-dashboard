import type { DeployAgentRequest } from '~/app/types/deployAgent';
import type { DeployAgentWizardFormData } from './types';
import { DeployAgentEnvVarType } from './types';
import { isEnvVarRowValid, stripContainerImageTag } from './utils';

export const UNSUPPORTED_ENV_VAR_TYPES_ERROR =
  'Secret and ConfigMap environment variable references are not yet supported for deployment. Use direct values or remove those variables.';

export type BuildDeployAgentRequestResult =
  | { request: DeployAgentRequest; error?: undefined }
  | { request?: undefined; error: string };

export const buildDeployAgentRequest = (
  formData: DeployAgentWizardFormData,
): BuildDeployAgentRequestResult => {
  const hasUnsupportedEnvVars = formData.envVars.some(
    (envVar) =>
      envVar.name.trim().length > 0 &&
      envVar.type !== DeployAgentEnvVarType.DIRECT &&
      isEnvVarRowValid(envVar),
  );

  if (hasUnsupportedEnvVars) {
    return { error: UNSUPPORTED_ENV_VAR_TYPES_ERROR };
  }

  const envVars = formData.envVars
    .filter((envVar) => envVar.type === DeployAgentEnvVarType.DIRECT && isEnvVarRowValid(envVar))
    .map((envVar) => ({
      name: envVar.name.trim(),
      value: envVar.value,
    }));

  const request: DeployAgentRequest = {
    name: formData.agentName.trim(),
    namespace: formData.project.trim(),
    containerImage: stripContainerImageTag(formData.containerImage).trim(),
    imageTag: formData.imageTag.trim(),
    protocol: formData.protocol,
    servicePorts: formData.servicePorts.map(({ name, port, targetPort, protocol }) => ({
      name: name.trim(),
      port,
      targetPort,
      protocol,
    })),
    envVars,
  };

  const pullSecret = formData.pullSecret.trim();
  if (pullSecret) {
    request.imagePullSecret = pullSecret;
  }

  const framework = formData.framework.trim();
  if (framework) {
    request.framework = framework;
  }

  const description = formData.description.trim();
  if (description) {
    request.description = description;
  }

  return { request };
};
