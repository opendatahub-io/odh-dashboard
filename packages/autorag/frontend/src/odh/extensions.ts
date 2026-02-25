import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import type {
  AreaExtension,
  NavExtension,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const PLUGIN_AUTORAG = 'plugin-autorag';
const PLUGIN_GEN_AI = 'plugin-gen-ai';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_AUTORAG,
      requiredComponents: [DataScienceStackComponent.DS_PIPELINES],
      reliantAreas: [PLUGIN_GEN_AI], // Requires Gen AI Studio to be enabled
      featureFlags: ['autorag'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_AUTORAG], // PLUGIN_AUTORAG area depends on PLUGIN_GEN_AI via reliantAreas
    },
    properties: {
      id: 'autorag',
      title: 'AutoRAG',
      href: '/gen-ai-studio/autorag',
      section: 'gen-ai-studio',
      path: '/gen-ai-studio/autorag/*',
      label: 'Tech Preview',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [PLUGIN_AUTORAG],
    },
    properties: {
      path: '/gen-ai-studio/autorag/*',
      component: () => import('./AppWrapper'),
    },
  },
];

export default extensions;
