export enum DeployAgentWizardStepTitle {
  IMAGE_SELECTION = 'Image selection',
  CONFIGURATION = 'Configuration',
  NETWORKING = 'Networking',
  SECURITY_AND_IDENTITY = 'Security and identity',
  ENVIRONMENT_VARIABLES = 'Environment Variables',
  SUMMARY = 'Summary',
}

export type DeployAgentServicePort = {
  name: string;
  port: number;
  targetPort: number;
  protocol: string;
};

export type DeployAgentEnvVar = {
  name: string;
  value: string;
};

export type DeployAgentWizardFormData = {
  project: string;
  containerImage: string;
  imageTag: string;
  agentName: string;
  pullSecret: string;
  fullImageReference: string;
  protocol: string;
  workloadType: string;
  enablePersistentStorage: boolean;
  persistentVolumeSize: string;
  servicePorts: DeployAgentServicePort[];
  createRoute: boolean;
  authBridgeEnabled: boolean;
  useEnvoySidecar: boolean;
  enableSpireIdentity: boolean;
  mtlsMode: string;
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
