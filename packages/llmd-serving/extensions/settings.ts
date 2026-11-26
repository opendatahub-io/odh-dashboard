import { SupportedArea } from '@odh-dashboard/plugin-core/areas';
import type { RouteExtension } from '@odh-dashboard/plugin-core/extension-points';
import type { LLMDServingExtension } from './types';

const ADMIN_USER = 'ADMIN_USER';

// Keep in sync with ../src/settings/llmInferenceServiceConfigs/paths.ts (value imports are
// disallowed in extensions.ts). Pinned by __tests__/extensions.spec.ts.
const LLM_INFERENCE_SERVICE_CONFIGS_TAB_PATH =
  '/settings/model-resources-operations/model-deployment-settings/llm-inference-service-configurations';

// Keep in sync with ../src/settings/topologyConfigs/paths.ts (value imports are
// disallowed in extensions.ts). Pinned by __tests__/extensions.spec.ts.
const TOPOLOGY_CONFIGS_TAB_PATH =
  '/settings/model-resources-operations/model-deployment-settings/topology-configurations';

// Keep in sync with ../src/settings/routingConfigs/paths.ts (value imports are
// disallowed in extensions.ts). Pinned by __tests__/extensions.spec.ts.
const ROUTING_CONFIGS_TAB_PATH =
  '/settings/model-resources-operations/model-deployment-settings/routing-configurations';

// Base paths of the former standalone pages, kept only as redirect sources to the
// tabs above (the standalone pages themselves have been removed).
const LLM_ACCELERATOR_CONFIGS_LEGACY_STANDALONE_PATH =
  '/settings/model-resources-operations/llm-accelerator-configs';

const TOPOLOGY_CONFIGS_STANDALONE_PATH =
  '/settings/model-resources-operations/llmd-topology-configurations';

const ROUTING_CONFIGS_STANDALONE_PATH =
  '/settings/model-resources-operations/llmd-routing-configurations';

const createRedirectComponent = (args: { from: string; to: string }) => () =>
  import('@odh-dashboard/plugin-core/routing').then((module) => ({
    default: () => module.buildV2RedirectElement(args),
  }));

const extensions: LLMDServingExtension[] = [
  // Redirects from old standalone URLs to tabs on the model deployment settings page.
  // The accelerator, topology, and routing standalone pages are gone; each redirect
  // is reachable whenever the tab's own feature areas are enabled.
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.LLMD_SERVING, ADMIN_USER, SupportedArea.VLLM_ON_MAAS],
    },
    properties: {
      path: `${LLM_ACCELERATOR_CONFIGS_LEGACY_STANDALONE_PATH}/*`,
      component: createRedirectComponent({
        from: `${LLM_ACCELERATOR_CONFIGS_LEGACY_STANDALONE_PATH}/*`,
        to: `${LLM_INFERENCE_SERVICE_CONFIGS_TAB_PATH}/*`,
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.LLMD_TOPOLOGY_CONFIGS, ADMIN_USER],
    },
    properties: {
      path: `${TOPOLOGY_CONFIGS_STANDALONE_PATH}/*`,
      component: createRedirectComponent({
        from: `${TOPOLOGY_CONFIGS_STANDALONE_PATH}/*`,
        to: `${TOPOLOGY_CONFIGS_TAB_PATH}/*`,
      }),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.LLMD_TOPOLOGY_CONFIGS, ADMIN_USER],
    },
    properties: {
      path: `${ROUTING_CONFIGS_STANDALONE_PATH}/*`,
      component: createRedirectComponent({
        from: `${ROUTING_CONFIGS_STANDALONE_PATH}/*`,
        to: `${ROUTING_CONFIGS_TAB_PATH}/*`,
      }),
    },
  },
  {
    type: 'model-serving.runtime-image/install-target',
    flags: {
      required: [SupportedArea.LLMD_SERVING, ADMIN_USER, SupportedArea.VLLM_ON_MAAS],
    },
    properties: {
      id: 'llmInferenceServiceConfig',
      label: 'LLM inference service configuration',
      description:
        'Install as an LLMInferenceServiceConfig for LLM inference service deployments. Compatible with Models as a Service.',
      selectedState: {
        listName: 'LLM inference service configurations',
        description: 'and the LLM inference service deployment wizard.',
      },
      installTargetName: 'LLM inference service configuration',
      component: () => import('../src/runtimeImageInstall/LlmInferenceServiceConfigInstallTarget'),
    },
  },
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [SupportedArea.LLMD_SERVING, ADMIN_USER, SupportedArea.VLLM_ON_MAAS],
    },
    properties: {
      pageId: 'model-deployment-settings',
      id: 'llm-inference-service-configurations',
      title: 'LLM inference service configurations',
      component: () =>
        import('../src/settings/llmInferenceServiceConfigs/LlmInferenceServiceConfigTabRoutes'),
      group: '3_accelerator',
    },
  },
  // Full-page breakout routes for the accelerator configuration forms. Registered
  // separately from the tab so the forms render without the tabbed page chrome.
  // Each form path is listed explicitly so the tab list route is not captured.
  ...(
    [
      `${LLM_INFERENCE_SERVICE_CONFIGS_TAB_PATH}/add`,
      `${LLM_INFERENCE_SERVICE_CONFIGS_TAB_PATH}/edit/:configName`,
      `${LLM_INFERENCE_SERVICE_CONFIGS_TAB_PATH}/duplicate/:configName`,
    ] as const
  ).map(
    (path): RouteExtension => ({
      type: 'app.route',
      flags: {
        required: [SupportedArea.LLMD_SERVING, ADMIN_USER, SupportedArea.VLLM_ON_MAAS],
      },
      properties: {
        path,
        component: () =>
          import('../src/settings/llmInferenceServiceConfigs/LlmInferenceServiceConfigFormRoutes'),
      },
    }),
  ),
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [SupportedArea.LLMD_TOPOLOGY_CONFIGS, ADMIN_USER],
    },
    properties: {
      pageId: 'model-deployment-settings',
      id: 'topology-configurations',
      title: 'llm-d topology configurations',
      component: () => import('../src/settings/topologyConfigs/TopologyConfigTabRoutes'),
      group: '4_topology',
    },
  },
  // Full-page breakout routes for the topology configuration forms. Registered
  // separately from the tab so the forms render without the tabbed page chrome.
  // Each form path is listed explicitly so the tab list route is not captured.
  ...(
    [
      `${TOPOLOGY_CONFIGS_TAB_PATH}/add/:topologyType`,
      `${TOPOLOGY_CONFIGS_TAB_PATH}/edit/:configName`,
      `${TOPOLOGY_CONFIGS_TAB_PATH}/duplicate/:configName`,
    ] as const
  ).map(
    (path): RouteExtension => ({
      type: 'app.route',
      flags: {
        required: [SupportedArea.LLMD_TOPOLOGY_CONFIGS, ADMIN_USER],
      },
      properties: {
        path,
        component: () => import('../src/settings/topologyConfigs/TopologyConfigFormRoutes'),
      },
    }),
  ),
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [SupportedArea.LLMD_TOPOLOGY_CONFIGS, ADMIN_USER],
    },
    properties: {
      pageId: 'model-deployment-settings',
      id: 'routing-configurations',
      title: 'llm-d routing configurations',
      component: () => import('../src/settings/routingConfigs/RoutingConfigTabRoutes'),
      group: '5_routing',
    },
  },
  // Full-page breakout routes for the routing configuration forms. Registered
  // separately from the tab so the forms render without the tabbed page chrome.
  // Each form path is listed explicitly so the tab list route is not captured.
  ...(
    [
      `${ROUTING_CONFIGS_TAB_PATH}/add`,
      `${ROUTING_CONFIGS_TAB_PATH}/edit/:configName`,
      `${ROUTING_CONFIGS_TAB_PATH}/duplicate/:configName`,
    ] as const
  ).map(
    (path): RouteExtension => ({
      type: 'app.route',
      flags: {
        required: [SupportedArea.LLMD_TOPOLOGY_CONFIGS, ADMIN_USER],
      },
      properties: {
        path,
        component: () => import('../src/settings/routingConfigs/RoutingConfigFormRoutes'),
      },
    }),
  ),
];

export default extensions;
