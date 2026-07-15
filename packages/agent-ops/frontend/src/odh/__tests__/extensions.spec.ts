import extensions from '~/odh/extensions';
import {
  agentDeployWizardPath,
  agentDeploymentsPath,
  agentOpsDeploymentDetailRoute,
} from '~/app/utilities/routes';

const AGENT_OPS = 'agent-ops';
const AGENT_OPS_DISCOVERY_MODE = 'agent-ops-discovery-mode';

describe('agent-ops extensions', () => {
  it('should register area, tab-route tab, and route extensions', () => {
    expect(extensions).toHaveLength(5);
    expect(extensions.map((extension) => extension.type)).toEqual([
      'app.area',
      'app.area',
      'app.tab-route/tab',
      'app.route',
      'app.route',
    ]);
  });

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

  it('should register the discovery mode area with feature flag', () => {
    const area = extensions.find(
      (extension) =>
        extension.type === 'app.area' && extension.properties.id === AGENT_OPS_DISCOVERY_MODE,
    );
    expect(area).toMatchObject({
      type: 'app.area',
      properties: {
        id: AGENT_OPS_DISCOVERY_MODE,
        featureFlags: ['agentOpsDiscoveryMode'],
      },
    });
  });

  it('should register deployments tab for the agents tab page', () => {
    const tab = extensions.find((extension) => extension.type === 'app.tab-route/tab');
    expect(tab).toMatchObject({
      type: 'app.tab-route/tab',
      flags: {
        required: [AGENT_OPS],
      },
      properties: {
        pageId: 'agents-tab-page',
        id: 'deployments',
        title: 'Deployments',
        group: '1_deployments',
      },
    });
    expect(tab?.type === 'app.tab-route/tab' && tab.properties.component).toBeTruthy();
  });

  it('standalone route paths match routes.ts constants', () => {
    const paths = extensions
      .filter((extension) => extension.type === 'app.route')
      .map((extension) => extension.properties.path);
    expect(paths).toContain(agentDeployWizardPath);
    expect(paths).toContain(`${agentDeploymentsPath}/:namespace/:agentId/*`);
  });

  it('should register standalone breakout routes outside the tab layout', () => {
    const routes = extensions.filter((extension) => extension.type === 'app.route');
    expect(routes).toHaveLength(2);
    expect(routes.map((route) => route.properties.path)).toEqual([
      `${agentDeploymentsPath}/:namespace/:agentId/*`,
      agentDeployWizardPath,
    ]);
    routes.forEach((route) => {
      expect(route).toMatchObject({
        type: 'app.route',
        flags: {
          required: [AGENT_OPS],
          disallowed: [AGENT_OPS_DISCOVERY_MODE],
        },
      });
      expect(route.properties.component).toBeTruthy();
    });
  });

  it('should keep extension route paths in sync with utilities/routes.ts', () => {
    const routes = extensions.filter((extension) => extension.type === 'app.route');
    expect(routes.map((route) => route.properties.path)).toEqual([
      `${agentDeploymentsPath}/:namespace/:agentId/*`,
      agentDeployWizardPath,
    ]);
    expect(agentOpsDeploymentDetailRoute('team1', 'my-agent')).toBe(
      `${agentDeploymentsPath}/team1/my-agent`,
    );
  });
});
