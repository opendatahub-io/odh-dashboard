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
  // --- OpenShell (separate service / Token B) — the Agents landing ---
  // The SINGLE tab contributed to the page. Core's TabRoutePage renders
  // single-tab mode: the tab bar is hidden and only the page title + this
  // component show. Workspaces are a selector inside the landing (not a tab),
  // and native CRs are a top-right link — so the AI-hub tab space stays free
  // for future siblings (deployments, catalog, registry).
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      pageId: AGENTS_TAB_PAGE,
      id: 'sandboxes',
      title: 'Sandboxes',
      component: () => import('./openshell/SandboxesWrapper'),
      group: '1_sandboxes',
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
