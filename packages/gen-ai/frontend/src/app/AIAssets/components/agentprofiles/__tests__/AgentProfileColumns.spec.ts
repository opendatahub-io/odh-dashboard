import getAgentProfileColumns from '~/app/AIAssets/components/agentprofiles/AgentProfileColumns';

describe('getAgentProfileColumns', () => {
  it('should include the Endpoint(s) column when agent deployments are enabled', () => {
    expect(getAgentProfileColumns(true)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'endpoints', label: 'Endpoint(s)' }),
      ]),
    );
  });

  it('should omit the Endpoint(s) column when agent deployments are disabled', () => {
    expect(getAgentProfileColumns(false)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'endpoints' })]),
    );
  });
});
