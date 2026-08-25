import extensions from '~/odh/extensions';
import {
  agentDeployWizardPath,
  agentDeploymentsPath,
  agentOpsDeploymentDetailRoute,
} from '~/app/utilities/routes';

const AGENT_OPS = 'agent-ops';
const AGENT_OPS_DEPLOY = 'agent-ops-deploy';

const tabs = () => extensions.filter((e) => e.type === 'app.tab-route/tab');
const routes = () => extensions.filter((e) => e.type === 'app.route');
const findTab = (id: string) =>
  tabs().find((e) => e.type === 'app.tab-route/tab' && e.properties.id === id);
const routePaths = () =>
  routes().map((e) => (e.type === 'app.route' ? e.properties.path : ''));

describe('agent-ops extensions', () => {
  it('should register the agent ops area with feature flag', () => {
    const area = extensions.find(
      (extension) => extension.type === 'app.area' && extension.properties.id === AGENT_OPS,
    );
    expect(area).toMatchObject({
      type: 'app.area',
      properties: {
        id: AGENT_OPS,
        featureFlags: ['agentOps'],
      },
    });
  });

  it('should register the deploy mode area with feature flag', () => {
    const area = extensions.find(
      (extension) =>
        extension.type === 'app.area' && extension.properties.id === AGENT_OPS_DEPLOY,
    );
    expect(area).toMatchObject({
      type: 'app.area',
      properties: {
        id: AGENT_OPS_DEPLOY,
        featureFlags: ['agentOpsDeploy'],
      },
    });
  });

  it('makes OpenShell the default Agents landing (sandboxes tab has the lowest group)', () => {
    const sandboxes = findTab('sandboxes');
    expect(sandboxes).toMatchObject({
      type: 'app.tab-route/tab',
      flags: { required: [AGENT_OPS] },
      properties: { pageId: 'agents-tab-page', id: 'sandboxes', group: '1_sandboxes' },
    });
    // Default tab = lowest group; OpenShell sandboxes must sort ahead of the
    // native "In your projects" tab.
    const groups = tabs()
      .filter((e) => e.type === 'app.tab-route/tab')
      .map((e) => (e.type === 'app.tab-route/tab' ? e.properties.group ?? '' : ''))
      .sort();
    expect(groups[0]).toBe('1_sandboxes');
  });

  it('keeps the native sandboxes view as a separate, demoted tab (Token A)', () => {
    const deployments = findTab('deployments');
    expect(deployments).toMatchObject({
      type: 'app.tab-route/tab',
      flags: { required: [AGENT_OPS] },
      properties: {
        pageId: 'agents-tab-page',
        id: 'deployments',
        title: 'In your projects',
        group: '3_your_projects',
      },
    });
    expect(
      deployments?.type === 'app.tab-route/tab' && deployments.properties.component,
    ).toBeTruthy();
  });

  it('registers the OpenShell OIDC callback routes outside the /openshell proxy prefix', () => {
    const paths = routePaths();
    expect(paths).toContain('/ai-hub/agents/oidc/callback');
    expect(paths).toContain('/ai-hub/agents/oidc/silent-callback');
    // Callbacks must be SPA routes, never under the reverse-proxied /openshell/*.
    paths
      .filter((p) => p.includes('/oidc/'))
      .forEach((p) => expect(p.startsWith('/openshell')).toBe(false));
  });

  it('keeps the native breakout route paths in sync with utilities/routes.ts', () => {
    const paths = routePaths();
    expect(paths).toContain(agentDeployWizardPath);
    expect(paths).toContain(`${agentDeploymentsPath}/:namespace/:agentId/*`);
    expect(agentOpsDeploymentDetailRoute('team1', 'my-agent')).toBe(
      `${agentDeploymentsPath}/team1/my-agent`,
    );
  });

  it('gates the native deploy breakout routes behind the deploy area flag', () => {
    const deployRoutes = routes().filter(
      (e) =>
        e.type === 'app.route' &&
        (e.properties.path === agentDeployWizardPath ||
          e.properties.path === `${agentDeploymentsPath}/:namespace/:agentId/*`),
    );
    expect(deployRoutes).toHaveLength(2);
    deployRoutes.forEach((route) => {
      expect(route).toMatchObject({
        type: 'app.route',
        flags: { required: [AGENT_OPS, AGENT_OPS_DEPLOY] },
      });
      expect(route.type === 'app.route' && route.properties.component).toBeTruthy();
    });
  });
});
