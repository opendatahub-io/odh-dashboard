import type {
  AreaExtension,
  TaskGroupExtension,
  TaskItemExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '#~/concepts/areas/types';

const extensions: (AreaExtension | TaskGroupExtension | TaskItemExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: 'task-assistant',
      devFlags: ['Task assistant'],
    },
  },
  {
    type: 'app.task/group',
    properties: {
      id: 'ai-hub',
      title: 'AI hub',
      description: 'Browse, manage, and deploy models and MCP servers.',
      label: 'Manage models and MCP servers',
      icon: () => import('#~/images/icons/AiHubNavIcon'),
      type: 'serving',
      order: '1_ai_hub',
    },
  },
  {
    type: 'app.task/group',
    properties: {
      id: 'develop-and-train',
      title: 'Develop & train',
      description: 'Iterate in experiments and track results across runs.',
      label: 'Develop & train models',
      icon: () => import('#~/images/icons/DevelopAndTrainNavIcon'),
      type: 'training',
      order: '3_develop_and_train',
    },
  },

  // -- AI Hub Task Items --

  {
    type: 'app.task/item',
    properties: {
      id: 'ai-hub-models',
      group: 'ai-hub',
      title: 'Find, register, and deploy models',
      destination: { tabRoutePageId: 'models-tab-page' },
      order: '1_models',
    },
  },
  {
    type: 'app.task/item',
    properties: {
      id: 'ai-hub-mcp-servers',
      group: 'ai-hub',
      title: 'Deploy and discover MCP servers',
      destination: { tabRoutePageId: 'mcp-servers-tab-page' },
      order: '2_mcp_servers',
    },
  },

  // -- Develop & Train Task Items --

  {
    type: 'app.task/item',
    flags: {
      required: [SupportedArea.WORKBENCHES],
    },
    properties: {
      id: 'develop-workbenches',
      group: 'develop-and-train',
      title: 'Code in workbenches',
      destination: { href: '/projects' },
      order: '4_workbenches',
    },
  },
];

export default extensions;
