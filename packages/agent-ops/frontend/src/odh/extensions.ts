import type {
  AreaExtension,
  RouteExtension,
  TabRouteTabExtension,
} from '@odh-dashboard/plugin-core/extension-points';

const AGENT_OPS = 'agent-ops';
const AGENTS_TAB_PAGE = 'agents-tab-page';

const extensions: (AreaExtension | TabRouteTabExtension | RouteExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: AGENT_OPS,
      featureFlags: ['agentOps'],
    },
  },
  {
    type: 'app.area',
    properties: {
      id: 'agent-ops-deploy',
      featureFlags: ['agentOpsDeploy'],
    },
  },
  // --- Provider chooser — the "Deployments" tab ---
  // ONE tab on the shared `agents-tab-page` (model-registry contributes
  // "Catalog", a future module "Registry"). Its landing compares sandbox
  // providers; selecting OpenShell opens the workspace-scoped sandbox view.
  // When sibling tabs are enabled the bar shows them all; when
  // only this one is active, core's single-tab mode hides the lone bar and
  // renders just the page title + this component. Workspaces/projects are
  // selectors inside their provider views, never tables or tabs.
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      pageId: AGENTS_TAB_PAGE,
      id: 'deployments',
      title: 'Deployments',
      singleTabTitle: 'Agents',
      component: () => import('./openshell/DeploymentsWrapper'),
      group: '1_deployments',
    },
  },
  // --- OpenShell OIDC (Token B) redirect + silent-renew callbacks ---
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      path: '/ai-hub/agents/oidc/callback',
      component: () => import('./openshell/OpenShellOidcCallback'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      path: '/ai-hub/agents/oidc/silent-callback',
      component: () => import('./openshell/OpenShellOidcCallback'),
    },
  },
];

export default extensions;
