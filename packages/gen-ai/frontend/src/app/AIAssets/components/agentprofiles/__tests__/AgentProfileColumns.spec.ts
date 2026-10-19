import getAgentProfileColumns from '~/app/AIAssets/components/agentprofiles/AgentProfileColumns';

describe('getAgentProfileColumns', () => {
  it('should include the Access details column when agent deployments are enabled', () => {
    expect(getAgentProfileColumns(true)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'endpoints', label: 'Access details' }),
      ]),
    );
  });

  it('should omit the Access details column when agent deployments are disabled', () => {
    expect(getAgentProfileColumns(false)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'endpoints' })]),
    );
  });
});
