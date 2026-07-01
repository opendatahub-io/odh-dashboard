export enum DeployAgentWizardStepTitle {
  IMAGE_SELECTION = 'Image selection',
  CONFIGURATION = 'Configuration',
  NETWORKING = 'Networking',
  SECURITY_AND_IDENTITY = 'Security and identity',
  ENVIRONMENT_VARIABLES = 'Environment Variables',
  SUMMARY = 'Summary',
}

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
  // TODO(RHOAIENG-62719): framework — mockup summary shows LangGraph; no BFF source yet
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
