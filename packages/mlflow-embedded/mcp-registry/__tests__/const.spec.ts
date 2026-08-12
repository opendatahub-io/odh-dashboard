import { MCP_REGISTRY_BASENAME, mcpRegistryBaseRoute } from '../const';

describe('mcpRegistryBaseRoute', () => {
  it('should return the bare basename when no namespace is provided', () => {
    expect(mcpRegistryBaseRoute()).toBe(MCP_REGISTRY_BASENAME);
  });

  it('should return the bare basename when namespace is an empty string', () => {
    expect(mcpRegistryBaseRoute('')).toBe(MCP_REGISTRY_BASENAME);
  });

  it('should append the workspace query param when a namespace is provided', () => {
    expect(mcpRegistryBaseRoute('my-project')).toBe(
      `${MCP_REGISTRY_BASENAME}?workspace=my-project`,
    );
  });

  it('should URL-encode namespace values with special characters', () => {
    expect(mcpRegistryBaseRoute('team a/b')).toBe(
      `${MCP_REGISTRY_BASENAME}?workspace=team%20a%2Fb`,
    );
  });
});
