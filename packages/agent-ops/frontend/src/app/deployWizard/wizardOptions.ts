import type { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
import { DeployAgentWizardStepTitle } from './types';

export const DEFAULT_IMAGE_TAG = 'latest';
export const DEFAULT_PROTOCOL = 'a2a';
export const DEFAULT_PERSISTENT_VOLUME_SIZE = '1Gi';
/** Max toggle width for wizard dropdowns; keep in sync with DeployWizardSelectField.scss. */
export const DEPLOY_WIZARD_SELECT_MAX_WIDTH = '28rem';
/** Matches in-form SearchSelector / SimpleSelect menu height elsewhere in the dashboard. */
export const DEPLOY_WIZARD_SELECT_MAX_MENU_HEIGHT = '200px';
/** Matches in-form SimpleSelect menus (SearchSelector, AutoML configure). */
export const deployAgentWizardStepSubtitles: Record<DeployAgentWizardStepTitle, string> = {
  [DeployAgentWizardStepTitle.IMAGE_SELECTION]:
    'Specify the container image and where the agent will be deployed.',
  [DeployAgentWizardStepTitle.CONFIGURATION]:
    'Configure protocol and workload settings for the agent.',
  [DeployAgentWizardStepTitle.NETWORKING]: 'Configure networking settings for the agent.',
  [DeployAgentWizardStepTitle.SECURITY_AND_IDENTITY]:
    'Configure security and identity settings for the agent.',
  [DeployAgentWizardStepTitle.ENVIRONMENT_VARIABLES]:
    'Configure environment variables for the agent.',
  [DeployAgentWizardStepTitle.SUMMARY]: 'Review your agent deployment configuration.',
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
