import extensions from '~/odh/extensions';

const AGENT_OPS = 'agent-ops';

describe('agent-ops extensions', () => {
  it('should register area and tab-route tab extensions', () => {
    expect(extensions).toHaveLength(2);
    expect(extensions.map((extension) => extension.type)).toEqual([
      'app.area',
      'app.tab-route/tab',
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
        hidePageTitleOnNestedRoutes: true,
      },
    });
    expect(tab?.type === 'app.tab-route/tab' && tab.properties.component).toBeTruthy();
  });
});
