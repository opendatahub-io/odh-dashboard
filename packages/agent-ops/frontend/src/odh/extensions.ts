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
  // --- Native agent-sandbox CRs (RHOAI login / Token A) ---
  // Demoted from a peer tab to a discreet top-right link on the OpenShell
  // landing (see OpenShellProviders). This is a standalone page (not a tab) so
  // it is less first-class than OpenShell, per the target IA. The splat path
  // lets AgentDeploymentsRoutes resolve its own index + :namespace; the more
  // specific detail/wizard routes below out-rank it.
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      path: '/ai-hub/agents/deployments/*',
      component: () => import('./AgentDeploymentsWrapper.tsx'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS, 'agent-ops-deploy'],
    },
    properties: {
      path: '/ai-hub/agents/deployments/:namespace/:agentId/*',
      component: () => import('./AgentDeploymentDetailRoutes.tsx'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS, 'agent-ops-deploy'],
    },
    properties: {
      path: '/ai-hub/agents/deployments/deploy',
      component: () => import('./AgentDeployWizardRoutes.tsx'),
    },
  },
  // --- OpenShell (separate service / Token B) — the "Deployments" tab ---
  // ONE tab on the shared `agents-tab-page` (model-registry contributes
  // "Catalog", a future module "Registry"). This is the OpenShell area:
  // "Deployments". When sibling tabs are enabled the bar shows them all; when
  // only this one is active, core's single-tab mode hides the lone bar and
  // renders just the page title + this component. Workspaces are a selector
  // inside the content (not a tab), native CRs a top-right link — no sub-tabs.
  // id 'openshell' (not 'deployments') so the landing URL doesn't collide with
  // the native /ai-hub/agents/deployments route.
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      pageId: AGENTS_TAB_PAGE,
      id: 'openshell',
      title: 'Deployments',
      singleTabTitle: 'Agent deployments',
      component: () => import('./openshell/SandboxesWrapper'),
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
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      path: '/ai-hub/agents/workspaces/:workspace',
      component: () => import('./openshell/WorkspaceDetailWrapper'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      path: '/ai-hub/agents/workspaces/:workspace/sandboxes/:sandbox',
      component: () => import('./openshell/SandboxDetailWrapper'),
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      path: '/ai-hub/agents/workspaces/:workspace/providers/:provider',
      component: () => import('./openshell/ProviderDetailWrapper'),
    },
  },
];

export default extensions;
