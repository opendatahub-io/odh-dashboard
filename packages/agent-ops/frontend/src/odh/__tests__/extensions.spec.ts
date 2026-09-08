import type { RouteExtension } from '@odh-dashboard/plugin-core/extension-points';
import extensions from '~/odh/extensions';
import {
  agentDeployWizardPath,
  agentDeploymentsPath,
  agentOpsDeploymentDetailRoute,
  agentOpsSandboxDetailPath,
  agentOpsWorkspaceDetailPath,
  agentOpsWorkspacesPath,
} from '~/app/utilities/routes';

const AGENT_OPS = 'agent-ops';
const AGENT_OPS_DEPLOY = 'agent-ops-deploy';

const getDeployRouteExtensions = (): RouteExtension[] =>
  extensions.filter(
    (extension): extension is RouteExtension =>
      extension.type === 'app.route' && extension.flags?.required?.includes(AGENT_OPS_DEPLOY),
  );

describe('agent-ops extensions', () => {
  it('should register area, tab-route tab, and route extensions', () => {
    expect(extensions).toHaveLength(6);
    expect(extensions.map((extension) => extension.type)).toEqual([
      'app.area',
      'app.area',
      'app.tab-route/tab',
      'app.route',
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

  it('should register workspaces tab for the agents tab page', () => {
    const tab = extensions.find((extension) => extension.type === 'app.tab-route/tab');
    expect(tab).toMatchObject({
      type: 'app.tab-route/tab',
      flags: {
        required: [AGENT_OPS],
      },
      properties: {
        pageId: 'agents-tab-page',
        id: 'workspaces',
        title: 'Workspaces',
        group: '1_workspaces',
      },
    });
    expect(tab?.type === 'app.tab-route/tab' && tab.properties.component).toBeTruthy();
  });

  it('should register workspace detail route', () => {
    const workspaceRoute = extensions.find(
      (extension) =>
        extension.type === 'app.route' &&
        extension.properties.path === '/ai-hub/agents/workspaces/:workspaceId/*',
    );
    expect(workspaceRoute).toMatchObject({
      type: 'app.route',
      flags: {
        required: [AGENT_OPS],
      },
    });
    expect(
      workspaceRoute?.type === 'app.route' && workspaceRoute.properties.component,
    ).toBeTruthy();
  });

  it('standalone deploy route paths match routes.ts constants', () => {
    const paths = getDeployRouteExtensions().map((extension) => extension.properties.path);
    expect(paths).toContain(agentDeployWizardPath);
    expect(paths).toContain(`${agentDeploymentsPath}/:namespace/:agentId/*`);
  });

  it('should register deploy breakout routes gated on agentOpsDeploy', () => {
    const routes = getDeployRouteExtensions();
    expect(routes).toHaveLength(2);
    expect(routes.map((route) => route.properties.path)).toEqual([
      `${agentDeploymentsPath}/:namespace/:agentId/*`,
      agentDeployWizardPath,
    ]);
    routes.forEach((route) => {
      expect(route).toMatchObject({
        type: 'app.route',
        flags: {
          required: [AGENT_OPS, AGENT_OPS_DEPLOY],
        },
      });
      expect(route.properties.component).toBeTruthy();
    });
  });

  it('should keep extension route paths in sync with utilities/routes.ts', () => {
    expect(agentOpsWorkspacesPath).toBe('/ai-hub/agents/workspaces');
    expect(agentOpsWorkspaceDetailPath('team1')).toBe('/ai-hub/agents/workspaces/team1');
    expect(agentOpsSandboxDetailPath('team1', 'sandbox-a')).toBe(
      '/ai-hub/agents/workspaces/team1/sandboxes/sandbox-a',
    );
    expect(agentOpsDeploymentDetailRoute('team1', 'my-agent')).toBe(
      `${agentDeploymentsPath}/team1/my-agent`,
    );
  });
});
