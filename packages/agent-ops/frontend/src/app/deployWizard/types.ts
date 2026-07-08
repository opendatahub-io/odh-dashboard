export enum DeployAgentWizardStepTitle {
  IMAGE_SELECTION = 'Image selection',
  CONFIGURATION = 'Configuration',
  NETWORKING = 'Networking',
  ENVIRONMENT_VARIABLES = 'Environment Variables',
  SUMMARY = 'Summary',
}

export type DeployAgentServicePort = {
  rowId: string;
  name: string;
  port: number;
  targetPort: number;
  protocol: string;
};

export enum DeployAgentEnvVarType {
  DIRECT = 'direct',
  SECRET = 'secret',
  CONFIG_MAP = 'configmap',
}

export type DeployAgentEnvVar = {
  rowId: string;
  name: string;
  type: DeployAgentEnvVarType;
  value: string;
  secretName: string;
  secretKey: string;
  configMapName: string;
  configMapKey: string;
};

export type DeployAgentWizardFormData = {
  project: string;
  containerImage: string;
  imageTag: string;
  agentName: string;
  description: string;
  pullSecret: string;
  fullImageReference: string;
  protocol: string;
  framework: string;
  workloadType: string;
  enablePersistentStorage: boolean;
  persistentVolumeSize: string;
  servicePorts: DeployAgentServicePort[];
  envVars: DeployAgentEnvVar[];
};

export type DeployAgentWizardLocationState = {
  namespace?: string;
  returnRoute?: string;
};

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === 'string';

const isUnknownRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isDeployAgentWizardLocationState = (
  state: unknown,
): state is DeployAgentWizardLocationState => {
  if (!isUnknownRecord(state)) {
    return false;
  }

  return isOptionalString(state.namespace) && isOptionalString(state.returnRoute);
};
