import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import { agentDeploymentsPath, globAgentOpsAll } from '~/app/utilities/routes';
import extensions from '~/odh/extensions';

describe('agent-ops extensions', () => {
  it('should register area, navigation, and route extensions', () => {
    expect(extensions).toHaveLength(3);
    expect(extensions.map((extension) => extension.type)).toEqual([
      'app.area',
      'app.navigation/href',
      'app.route',
    ]);
  });

  it('should register the agent ops area with feature flag', () => {
    const area = extensions.find((extension) => extension.type === 'app.area');
    expect(area).toMatchObject({
      type: 'app.area',
      properties: {
        id: SupportedArea.AGENT_OPS,
        featureFlags: ['agentOps'],
      },
    });
  });

  it('should register deployments navigation under ai-hub', () => {
    const nav = extensions.find((extension) => extension.type === 'app.navigation/href');
    expect(nav).toMatchObject({
      type: 'app.navigation/href',
      flags: {
        required: [SupportedArea.AGENT_OPS],
      },
      properties: {
        id: 'agent-ops-deployments',
        title: 'Agents',
        href: agentDeploymentsPath,
        section: 'ai-hub',
        path: globAgentOpsAll,
        label: 'Tech Preview',
      },
    });
  });

  it('should register federated route for agent ops wrapper', () => {
    const route = extensions.find((extension) => extension.type === 'app.route');
    expect(route).toMatchObject({
      type: 'app.route',
      flags: {
        required: [SupportedArea.AGENT_OPS],
      },
      properties: {
        path: globAgentOpsAll,
      },
    });
    expect(route?.type === 'app.route' && route.properties.component).toBeTruthy();
  });
});
