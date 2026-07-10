import type { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
import type { DeployAgentEnvVar, DeployAgentServicePort } from './types';
import { DeployAgentEnvVarType, DeployAgentWizardStepTitle } from './types';
import { SERVICE_PORT_PROTOCOLS } from './constants';

let wizardRowIdCounter = 0;

/** Stable identifier for dynamic wizard rows (service ports, env vars). */
export const createWizardRowId = (): string => {
  wizardRowIdCounter += 1;
  return `deploy-wizard-row-${wizardRowIdCounter}`;
};

export const DEFAULT_IMAGE_TAG = 'latest';
export const DEFAULT_PROTOCOL = 'a2a';
export const DEFAULT_WORKLOAD_TYPE = 'sandbox';
export const DEFAULT_PERSISTENT_VOLUME_SIZE = '1Gi';

export const DEFAULT_SERVICE_PORT: Omit<DeployAgentServicePort, 'rowId'> = {
  name: 'http',
  port: 8080,
  targetPort: 8000,
  protocol: 'TCP',
};

export const createServicePort = (
  overrides?: Partial<Omit<DeployAgentServicePort, 'rowId'>>,
): DeployAgentServicePort => ({
  rowId: createWizardRowId(),
  ...DEFAULT_SERVICE_PORT,
  ...overrides,
});

export const DEFAULT_ENV_VAR_TYPE = DeployAgentEnvVarType.DIRECT;

export const DEFAULT_ENV_VAR: Omit<DeployAgentEnvVar, 'rowId'> = {
  name: '',
  type: DEFAULT_ENV_VAR_TYPE,
  value: '',
  secretName: '',
  secretKey: '',
  configMapName: '',
  configMapKey: '',
};

export const createEnvVar = (
  overrides?: Partial<Omit<DeployAgentEnvVar, 'rowId'>>,
): DeployAgentEnvVar => ({
  rowId: createWizardRowId(),
  ...DEFAULT_ENV_VAR,
  ...overrides,
});

export const envVarTypeOptions: SimpleSelectOption[] = [
  { key: DeployAgentEnvVarType.DIRECT, label: 'Direct value' },
  { key: DeployAgentEnvVarType.SECRET, label: 'Secret reference' },
  { key: DeployAgentEnvVarType.CONFIG_MAP, label: 'ConfigMap reference' },
];

/** Env var types supported by the current deploy API. */
export const supportedEnvVarTypeOptions: SimpleSelectOption[] = [
  { key: DeployAgentEnvVarType.DIRECT, label: 'Direct value' },
];

/** Matches in-form SearchSelector / SimpleSelect menu height elsewhere in the dashboard. */
export const DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT = '200px';

export const deployAgentWizardStepSubtitles: Record<DeployAgentWizardStepTitle, string> = {
  [DeployAgentWizardStepTitle.IMAGE_SELECTION]:
    'Specify the container image and where the agent will be deployed.',
  [DeployAgentWizardStepTitle.CONFIGURATION]:
    'Configure protocol and framework settings for the agent.',
  [DeployAgentWizardStepTitle.NETWORKING]:
    'Configure the service port for the agent Sandbox workload.',
  [DeployAgentWizardStepTitle.ENVIRONMENT_VARIABLES]:
    'Optional environment variables for the agent container.',
  [DeployAgentWizardStepTitle.SUMMARY]: 'Review your configuration before deploying the agent.',
};

export const protocolOptions: SimpleSelectOption[] = [
  {
    key: 'a2a',
    label: 'A2A (Agent-to-Agent)',
  },
  {
    key: 'mcp',
    label: 'MCP',
  },
];

export const workloadTypeOptions: SimpleSelectOption[] = [
  {
    key: 'sandbox',
    label: 'Sandbox (Recommended)',
  },
];

export const servicePortProtocolOptions: SimpleSelectOption[] = SERVICE_PORT_PROTOCOLS.map(
  (protocol) => ({ key: protocol, label: protocol }),
);
