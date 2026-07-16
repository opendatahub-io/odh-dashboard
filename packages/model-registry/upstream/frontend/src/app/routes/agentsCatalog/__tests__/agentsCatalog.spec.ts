import { getAgentsCatalogDetailsRoute } from '~/app/routes/agentsCatalog/agentsCatalog';

describe('agentsCatalog routes', () => {
  it('should build encoded agent details path', () => {
    expect(getAgentsCatalogDetailsRoute('my-agent')).toBe('/ai-hub/agents/catalog/my-agent');
    expect(getAgentsCatalogDetailsRoute('agent/with/slashes')).toBe(
      '/ai-hub/agents/catalog/agent%2Fwith%2Fslashes',
    );
  });
});
