import MCPServerColumns from '~/app/AIAssets/components/mcp/MCPServerColumns';

describe('MCPServerColumns', () => {
  it('should label the endpoint column as Access details', () => {
    expect(MCPServerColumns).toContainEqual(
      expect.objectContaining({ field: 'endpoint', label: 'Access details' }),
    );
  });
});
