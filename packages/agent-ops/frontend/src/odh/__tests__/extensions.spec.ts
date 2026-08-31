import extensions from '~/odh/extensions';

const AGENT_OPS = 'agent-ops';
const AGENT_OPS_DEPLOY = 'agent-ops-deploy';

const tabs = () => extensions.filter((e) => e.type === 'app.tab-route/tab');
const routes = () => extensions.filter((e) => e.type === 'app.route');
const findTab = (id: string) => tabs().find((e) => e.properties.id === id);
const routePaths = () => routes().map((e) => e.properties.path);

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
      (extension) => extension.type === 'app.area' && extension.properties.id === AGENT_OPS_DEPLOY,
    );
    expect(area).toMatchObject({
      type: 'app.area',
      properties: {
        id: AGENT_OPS_DEPLOY,
        featureFlags: ['agentOpsDeploy'],
      },
    });
  });

  it('contributes one canonical Deployments tab', () => {
    expect(tabs()).toHaveLength(1);
    const deployments = findTab('deployments');
    expect(deployments).toMatchObject({
      type: 'app.tab-route/tab',
      flags: { required: [AGENT_OPS] },
      properties: {
        pageId: 'agents-tab-page',
        id: 'deployments',
        title: 'Deployments',
        group: '1_deployments',
      },
    });
  });

  it('does not register provider or workspace pages as standalone routes', () => {
    expect(routePaths()).toEqual([
      '/ai-hub/agents/oidc/callback',
      '/ai-hub/agents/oidc/silent-callback',
    ]);
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
});
