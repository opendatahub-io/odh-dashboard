import type {
  NavExtension,
  RouteExtension,
  AreaExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const AUTORAG = 'autorag';
// AutoRAG requires both genAiStudio AND autoRag feature flags.
// This ensures AutoRAG only appears when nested under Gen AI Studio section.
const GEN_AI_STUDIO = 'plugin-gen-ai';

const extensions: (NavExtension | RouteExtension | AreaExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: AUTORAG,
      requiredComponents: [],
      featureFlags: ['autoRag'],
      reliantAreas: [GEN_AI_STUDIO], // Requires Gen AI Studio to be enabled
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [AUTORAG, GEN_AI_STUDIO], // Both must be enabled
    },
    properties: {
      id: 'autorag-view',
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
      required: [AUTORAG], // Route only available when AutoRAG feature flag is enabled
    },
    properties: {
      path: '/gen-ai-studio/autorag/*',
      component: () => import('./AutoRagWrapper'),
    },
  },
];

export default extensions;
