import type { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
import type { DeployAgentServicePort } from './types';
import { DeployAgentWizardStepTitle } from './types';
import { SERVICE_PORT_PROTOCOLS } from './constants';

export const DEFAULT_IMAGE_TAG = 'latest';
export const DEFAULT_PROTOCOL = 'a2a';
export const DEFAULT_PERSISTENT_VOLUME_SIZE = '1Gi';

export const DEFAULT_SERVICE_PORT: DeployAgentServicePort = {
  name: 'http',
  port: 8080,
  targetPort: 8000,
  protocol: 'TCP',
};

/** Max toggle width for wizard dropdowns; keep in sync with DeployWizardSelectField.scss. */
export const DEPLOY_WIZARD_SELECT_MAX_WIDTH = '28rem';
/** Matches in-form SearchSelector / SimpleSelect menu height elsewhere in the dashboard. */
export const DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT = '200px';

export const deployAgentWizardStepSubtitles: Record<DeployAgentWizardStepTitle, string> = {
  [DeployAgentWizardStepTitle.IMAGE_SELECTION]:
    'Specify the container image and where the agent will be deployed.',
  [DeployAgentWizardStepTitle.CONFIGURATION]:
    'Configure protocol and workload settings for the agent.',
  [DeployAgentWizardStepTitle.NETWORKING]: 'Configure service ports for the agent pod.',
  [DeployAgentWizardStepTitle.SECURITY_AND_IDENTITY]:
    'Optional security settings. Defaults are applied if you skip this step.',
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
    key: 'deployment',
    label: 'Deployment',
  },
  {
    key: 'statefulset',
    label: 'StatefulSet',
  },
  {
    key: 'job',
    label: 'Job',
  },
];

export const servicePortProtocolOptions: SimpleSelectOption[] = SERVICE_PORT_PROTOCOLS.map(
  (protocol) => ({ key: protocol, label: protocol }),
);

export const mtlsModeOptions: SimpleSelectOption[] = [
  { key: 'disabled', label: 'Disabled' },
  { key: 'permissive', label: 'Permissive' },
  { key: 'strict', label: 'Strict' },
];
