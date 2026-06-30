import extensions from '~/odh/extensions';

const AGENT_OPS = 'agent-ops';

describe('agent-ops extensions', () => {
  it('should register area, tab-route tab, and detail route extensions', () => {
    expect(extensions).toHaveLength(3);
    expect(extensions.map((extension) => extension.type)).toEqual([
      'app.area',
      'app.tab-route/tab',
      'app.route',
    ]);
  });

  it('should register the agent ops area with feature flag', () => {
    const area = extensions.find((extension) => extension.type === 'app.area');
    expect(area).toMatchObject({
      type: 'app.area',
      properties: {
        id: AGENT_OPS,
        featureFlags: ['agentOps'],
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

  it('should register deployment detail route outside the tab layout', () => {
    const route = extensions.find((extension) => extension.type === 'app.route');
    expect(route).toMatchObject({
      type: 'app.route',
      flags: {
        required: [AGENT_OPS],
      },
      properties: {
        path: '/ai-hub/agents/deployments/:namespace/:agentId/*',
      },
    });
    expect(route?.type === 'app.route' && route.properties.component).toBeTruthy();
  });
});
