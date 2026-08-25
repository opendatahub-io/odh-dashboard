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
  // Demoted below OpenShell (which is the default landing). This is a separate,
  // one-click view of sandboxes in the user's own projects — no OpenShell auth.
  // NOTE: this is still a peer tab; the target IA is a separate nav page (see
  // double-auth-poc.md "native page repoint recipe").
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      pageId: AGENTS_TAB_PAGE,
      id: 'deployments',
      title: 'In your projects',
      component: () => import('./AgentDeploymentsWrapper.tsx'),
      group: '3_your_projects',
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
  // --- OpenShell (separate service / Token B) — the DEFAULT Agents landing ---
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
  {
    type: 'app.tab-route/tab',
    flags: {
      required: [AGENT_OPS],
    },
    properties: {
      pageId: AGENTS_TAB_PAGE,
      id: 'workspaces',
      title: 'Workspaces',
      component: () => import('./openshell/WorkspacesWrapper'),
      group: '2_workspaces',
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
