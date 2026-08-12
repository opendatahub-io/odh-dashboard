import { MCP_REGISTRY_BASENAME, mcpRegistryBaseRoute, mcpServerDetailRoute } from '../const';

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

describe('mcpServerDetailRoute', () => {
  it('should return the server path without a query string when no namespace is provided', () => {
    expect(mcpServerDetailRoute('my-server')).toBe(`${MCP_REGISTRY_BASENAME}/my-server`);
  });

  it('should append the workspace query param when a namespace is provided', () => {
    expect(mcpServerDetailRoute('my-server', 'my-project')).toBe(
      `${MCP_REGISTRY_BASENAME}/my-server?workspace=my-project`,
    );
  });

  it('should URL-encode server names with special characters', () => {
    expect(mcpServerDetailRoute('io.github.acme/widget-server', 'my-project')).toBe(
      `${MCP_REGISTRY_BASENAME}/io.github.acme%2Fwidget-server?workspace=my-project`,
    );
  });
});
